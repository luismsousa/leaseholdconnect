import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getClerkUserId } from "./clerkHelpers";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin of association
async function requireAssociationMember(ctx: any, associationId: Id<"associations">) {
  const userId = await getClerkUserId(ctx);
  if (!userId) {
    throw new Error("Authentication required");
  }

  const membership = await ctx.db
    .query("associationMembers")
    .withIndex("by_association_and_user", (q: any) => 
      q.eq("associationId", associationId).eq("userId", userId)
    )
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();

  if (!membership) {
    throw new Error("Not authorized for this association");
  }

  return { userId, membership };
}

async function requireAssociationAdmin(ctx: any, associationId: Id<"associations">) {
  const { userId, membership } = await requireAssociationMember(ctx, associationId);
  
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Admin access required");
  }

  return { userId, membership };
}

// List documents for an association
export const list = query({
  args: { 
    associationId: v.id("associations"),
    category: v.optional(v.string()),
    building: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, membership } = await requireAssociationMember(ctx, args.associationId);

    let query = ctx.db
      .query("documents")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId));

    if (args.category) {
      query = ctx.db
        .query("documents")
        .withIndex("by_association_and_category", (q) => 
          q.eq("associationId", args.associationId).eq("category", args.category!)
        );
    }

    const documents = await query.order("desc").collect();

    // Filter documents based on visibility and user's building
    const filteredDocuments = [];
    for (const doc of documents) {
      // Admins can see all documents
      if (membership.role === "owner" || membership.role === "admin") {
        filteredDocuments.push(doc);
        continue;
      }

      // Public documents are visible to all
      if (doc.isPublic) {
        filteredDocuments.push(doc);
        continue;
      }

      // Admin-only documents are not visible to regular members
      if (doc.visibilityType === "admin") {
        continue;
      }

      // All buildings documents are visible to all members
      if (doc.visibilityType === "all") {
        filteredDocuments.push(doc);
        continue;
      }

      // Building-specific documents
      if (doc.visibilityType === "buildings" && doc.visibleToBuildings) {
        // Get user's email from auth context
        const identity = await ctx.auth.getUserIdentity();
        if (identity?.email) {
          // Find member for this association
          const member = await ctx.db
            .query("members")
            .withIndex("by_association_and_email", (q) =>
              q.eq("associationId", args.associationId).eq("email", identity.email!)
            )
            .first();

          if (member) {
            // Preferred path: use many-to-many assignments
            const assignments = await ctx.db
              .query("memberUnits")
              .withIndex("by_association_and_member", (q) =>
                q.eq("associationId", args.associationId).eq("memberId", member._id)
              )
              .collect();

            let memberBuildings = new Set<string>();
            if (assignments.length > 0) {
              const unitDocs = await Promise.all(assignments.map((a) => ctx.db.get(a.unitId)));
              for (const u of unitDocs) {
                if (u?.building) memberBuildings.add(u.building);
              }
            } else if (member.unit) {
              // Legacy path: fallback to single unit name on member
              const unit = await ctx.db
                .query("units")
                .withIndex("by_association_and_name", (q) =>
                  q.eq("associationId", args.associationId).eq("name", member.unit!)
                )
                .first();
              if (unit?.building) memberBuildings.add(unit.building);
            }

            if (
              Array.from(memberBuildings).some((b) => doc.visibleToBuildings!.includes(b))
            ) {
              filteredDocuments.push(doc);
            }
          }
        }
      }
    }

    // Get signed URLs for documents
    const documentsWithUrls = await Promise.all(
      filteredDocuments.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return { ...doc, url };
      })
    );

    return documentsWithUrls;
  },
});

// Upload document
export const create = mutation({
  args: {
    associationId: v.id("associations"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    isPublic: v.boolean(),
    visibilityType: v.union(v.literal("all"), v.literal("buildings"), v.literal("admin")),
    visibleToBuildings: v.optional(v.array(v.string())),
    meetingId: v.optional(v.id("meetings")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAssociationAdmin(ctx, args.associationId);

    // Get current member to use as uploader
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("User email not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_association_and_email", (q) => 
        q.eq("associationId", args.associationId).eq("email", identity.email!)
      )
      .first();

    if (!member) {
      throw new Error("Member record not found");
    }

    const documentId = await ctx.db.insert("documents", {
      ...args,
      uploadedBy: member._id,
      uploadedAt: Date.now(),
    });

    return documentId;
  },
});

// Get available buildings for an association
export const getBuildings = query({
  args: { associationId: v.id("associations") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    await requireAssociationMember(ctx, args.associationId);
    
    const units = await ctx.db
      .query("units")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();
    
    const buildings = Array.from(new Set(units.map(unit => unit.building).filter((building): building is string => Boolean(building))));
    return buildings;
  },
});

// Get document categories for an association
export const getCategories = query({
  args: { associationId: v.id("associations") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    await requireAssociationMember(ctx, args.associationId);
    
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_association", (q) => q.eq("associationId", args.associationId))
      .collect();
    
    const categories = Array.from(new Set(documents.map(doc => doc.category)));
    return categories;
  },
});

// Generate upload URL
export const generateUploadUrl = mutation({
  args: { associationId: v.id("associations") },
  handler: async (ctx, args) => {
    await requireAssociationAdmin(ctx, args.associationId);
    return await ctx.storage.generateUploadUrl();
  },
});

// Delete document
export const remove = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    await requireAssociationAdmin(ctx, document.associationId);

    // Delete the file from storage
    await ctx.storage.delete(document.fileId);
    
    // Delete the document record
    await ctx.db.delete(args.id);

    return args.id;
  },
});
