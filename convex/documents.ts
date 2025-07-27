import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

async function getCurrentMember(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const member = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", user.email || ""))
    .unique();
  
  if (!member) {
    throw new Error("Member not found");
  }

  return { userId, user, member };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadDocument = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    isPublic: v.boolean(),
    visibilityType: v.union(v.literal("all"), v.literal("units"), v.literal("admin")),
    visibleToUnits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await getCurrentMember(ctx);
    
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      description: args.description,
      category: args.category,
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      isPublic: args.isPublic,
      visibilityType: args.visibilityType,
      visibleToUnits: args.visibleToUnits,
    });

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "document_uploaded",
      entityType: "document",
      entityId: documentId,
      description: `Uploaded document "${args.title}" in category ${args.category}`,
      metadata: {
        title: args.title,
        category: args.category,
        fileName: args.fileName,
        fileSize: args.fileSize,
        visibilityType: args.visibilityType,
        visibleToUnits: args.visibleToUnits,
        isPublic: args.isPublic,
      },
    });
  },
});

export const listDocuments = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { member } = await getCurrentMember(ctx);
    
    let documents = await ctx.db.query("documents").order("desc").collect();
    
    // Filter documents based on member's access level and unit
    documents = documents.filter(doc => {
      // Admins can see all documents
      if (member.role === "admin") {
        return true;
      }
      
      // Check visibility type (default to "all" for backward compatibility)
      const visibilityType = doc.visibilityType || "all";
      
      if (visibilityType === "admin") {
        return false; // Only admins can see admin-only documents
      }
      
      if (visibilityType === "all") {
        return doc.isPublic; // Public documents visible to all
      }
      
      if (visibilityType === "units" && doc.visibleToUnits && member.unit) {
        return doc.visibleToUnits.includes(member.unit);
      }
      
      // Default to public documents only
      return doc.isPublic;
    });

    // Filter by category if specified
    if (args.category) {
      documents = documents.filter(doc => doc.category === args.category);
    }

    return Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        downloadUrl: await ctx.storage.getUrl(doc.fileId),
      }))
    );
  },
});

export const getDocumentCategories = query({
  args: {},
  handler: async (ctx) => {
    const { member } = await getCurrentMember(ctx);
    
    let documents = await ctx.db.query("documents").collect();
    
    // Filter documents based on member's access level and unit
    documents = documents.filter(doc => {
      if (member.role === "admin") {
        return true;
      }
      
      const visibilityType = doc.visibilityType || "all";
      
      if (visibilityType === "admin") {
        return false;
      }
      
      if (visibilityType === "all") {
        return doc.isPublic;
      }
      
      if (visibilityType === "units" && doc.visibleToUnits && member.unit) {
        return doc.visibleToUnits.includes(member.unit);
      }
      
      return doc.isPublic;
    });
    
    const categories = [...new Set(documents.map(doc => doc.category))];
    return categories.sort();
  },
});

export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await getCurrentMember(ctx);
    
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    
    // Only allow deletion by the uploader or admin
    if (document.uploadedBy !== userId && member.role !== "admin") {
      throw new Error("Permission denied");
    }
    
    await ctx.db.delete(args.documentId);

    // Log audit event
    await ctx.runMutation(internal.audit.logAuditEvent, {
      userId,
      memberId: member._id,
      action: "document_deleted",
      entityType: "document",
      entityId: args.documentId,
      description: `Deleted document "${document.title}" from category ${document.category}`,
      metadata: {
        title: document.title,
        category: document.category,
        fileName: document.fileName,
        fileSize: document.fileSize,
        wasUploadedBy: document.uploadedBy === userId ? "self" : "other",
      },
    });
  },
});

export const getAvailableUnits = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    
    // Get units from the units table if it exists, otherwise fall back to members
    try {
      const units = await ctx.db.query("units").collect();
      if (units.length > 0) {
        return units
          .filter(unit => unit.status === "active")
          .map(unit => unit.name)
          .sort();
      }
    } catch (error) {
      // Units table might not exist yet, fall back to members
    }
    
    // Fallback: get units from members table
    const members = await ctx.db.query("members").collect();
    const units = [...new Set(members.map(member => member.unit).filter(Boolean))];
    
    return units.sort();
  },
});
