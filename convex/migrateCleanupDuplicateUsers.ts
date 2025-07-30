import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to analyze duplicate users before cleanup
export const analyzeDuplicateUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // Group users by email to find duplicates
    const usersByEmail = new Map<string, any[]>();
    
    for (const user of users) {
      if (user.email) {
        if (!usersByEmail.has(user.email)) {
          usersByEmail.set(user.email, []);
        }
        usersByEmail.get(user.email)!.push(user);
      }
    }
    
    // Find duplicates
    const duplicates = [];
    for (const [email, userList] of usersByEmail.entries()) {
      if (userList.length > 1) {
        duplicates.push({
          email,
          users: userList.map(user => ({
            id: user._id,
            name: user.name,
            tokenIdentifier: user.tokenIdentifier,
            creationTime: user._creationTime,
            isAnonymous: user.isAnonymous
          }))
        });
      }
    }
    
    return {
      totalUsers: users.length,
      duplicates,
      summary: {
        duplicateGroups: duplicates.length,
        totalDuplicateUsers: duplicates.reduce((sum, group) => sum + group.users.length, 0)
      }
    };
  },
});

// Migration to clean up duplicate users
export const cleanupDuplicateUsers = mutation({
  args: {
    dryRun: v.optional(v.boolean()), // Set to true to preview changes without making them
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    
    // Get all users
    const users = await ctx.db.query("users").collect();
    
    // Group users by email
    const usersByEmail = new Map<string, any[]>();
    
    for (const user of users) {
      if (user.email) {
        if (!usersByEmail.has(user.email)) {
          usersByEmail.set(user.email, []);
        }
        usersByEmail.get(user.email)!.push(user);
      }
    }
    
    const results = {
      processed: 0,
      deleted: 0,
      kept: 0,
      errors: [] as string[],
      details: [] as any[]
    };
    
    // Process each email group
    for (const [email, userList] of usersByEmail.entries()) {
      if (userList.length > 1) {
        results.processed++;
        
        // Sort users by creation time (oldest first)
        userList.sort((a, b) => a._creationTime - b._creationTime);
        
        // Keep the oldest user (first created)
        const userToKeep = userList[0];
        const usersToDelete = userList.slice(1);
        
        results.details.push({
          email,
          keeping: {
            id: userToKeep._id,
            name: userToKeep.name,
            tokenIdentifier: userToKeep.tokenIdentifier,
            creationTime: userToKeep._creationTime
          },
          deleting: usersToDelete.map(user => ({
            id: user._id,
            name: user.name,
            tokenIdentifier: user.tokenIdentifier,
            creationTime: user._creationTime
          }))
        });
        
        if (!dryRun) {
          // Delete the duplicate users
          for (const userToDelete of usersToDelete) {
            try {
              await ctx.db.delete(userToDelete._id);
              results.deleted++;
            } catch (error) {
              results.errors.push(`Failed to delete user ${userToDelete._id}: ${error}`);
            }
          }
        }
        
        results.kept++;
      }
    }
    
    return {
      dryRun,
      ...results,
      message: dryRun 
        ? "Preview completed. Set dryRun to false to perform actual cleanup."
        : "Cleanup completed successfully."
    };
  },
});

// Query to verify cleanup results
export const verifyCleanup = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // Check for remaining duplicates
    const usersByEmail = new Map<string, any[]>();
    
    for (const user of users) {
      if (user.email) {
        if (!usersByEmail.has(user.email)) {
          usersByEmail.set(user.email, []);
        }
        usersByEmail.get(user.email)!.push(user);
      }
    }
    
    const remainingDuplicates = [];
    for (const [email, userList] of usersByEmail.entries()) {
      if (userList.length > 1) {
        remainingDuplicates.push({
          email,
          count: userList.length,
          users: userList.map(user => ({
            id: user._id,
            name: user.name,
            tokenIdentifier: user.tokenIdentifier
          }))
        });
      }
    }
    
    return {
      totalUsers: users.length,
      remainingDuplicates,
      isClean: remainingDuplicates.length === 0
    };
  },
}); 