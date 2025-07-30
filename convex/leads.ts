import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requirePaasAdmin } from "./clerkHelpers";

// Submit a new lead (public function)
export const submitLead = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    companyName: v.string(),
    phoneNumber: v.string(),
    message: v.string(),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const leadId = await ctx.db.insert("leads", {
      ...args,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return leadId;
  },
});

// List all leads (PaaS admin only)
export const listLeads = query({
  args: {
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("converted"),
      v.literal("lost"),
    )),
  },
  returns: v.array(
    v.object({
      _id: v.id("leads"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      companyName: v.string(),
      phoneNumber: v.string(),
      message: v.string(),
      status: v.union(
        v.literal("new"),
        v.literal("contacted"),
        v.literal("qualified"),
        v.literal("converted"),
        v.literal("lost"),
      ),
      notes: v.optional(v.string()),
      assignedTo: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    let leads;
    
    if (args.status) {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      leads = await ctx.db
        .query("leads")
        .withIndex("by_created_at", (q) => q.gte("createdAt", 0))
        .order("desc")
        .collect();
    }

    return leads;
  },
});

// Update lead status (PaaS admin only)
export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("converted"),
      v.literal("lost"),
    ),
    notes: v.optional(v.string()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const { leadId, status, notes } = args;
    
    await ctx.db.patch(leadId, {
      status,
      notes,
      updatedAt: Date.now(),
    });

    return leadId;
  },
});

// Assign lead to PaaS admin (PaaS admin only)
export const assignLead = mutation({
  args: {
    leadId: v.id("leads"),
    assignedTo: v.string(), // Clerk user ID
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    await requirePaasAdmin(ctx);

    const { leadId, assignedTo } = args;
    
    await ctx.db.patch(leadId, {
      assignedTo,
      updatedAt: Date.now(),
    });

    return leadId;
  },
});

// Get lead statistics (PaaS admin only)
export const getLeadStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    new: v.number(),
    contacted: v.number(),
    qualified: v.number(),
    converted: v.number(),
    lost: v.number(),
  }),
  handler: async (ctx) => {
    await requirePaasAdmin(ctx);

    const allLeads = await ctx.db.query("leads").collect();
    
    const stats = {
      total: allLeads.length,
      new: allLeads.filter(lead => lead.status === "new").length,
      contacted: allLeads.filter(lead => lead.status === "contacted").length,
      qualified: allLeads.filter(lead => lead.status === "qualified").length,
      converted: allLeads.filter(lead => lead.status === "converted").length,
      lost: allLeads.filter(lead => lead.status === "lost").length,
    };

    return stats;
  },
}); 