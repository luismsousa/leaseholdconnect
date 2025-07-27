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
  },
  handler: async (ctx, args) => {
    await requireAssociationMember(ctx, args.associationId);

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

    // Get signed URLs for documents
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
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
    visibilityType: v.union(v.literal("all"), v.literal("units"), v.literal("admin")),
    visibleToUnits: v.optional(v.array(v.string())),
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
