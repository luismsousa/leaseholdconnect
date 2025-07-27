import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    inviterName: v.string(),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would integrate with your email service
    // For now, just log the invitation
    console.log(`Sending invitation email to ${args.email} from ${args.inviterName}`);
    
    // In a real implementation, you would:
    // 1. Use a service like Resend, SendGrid, or similar
    // 2. Send a properly formatted invitation email
    // 3. Include a link to sign up and join the association
    
    return { success: true };
  },
});

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    // This would integrate with your email service
    // For now, just log the email
    console.log(`Sending email to ${args.to}: ${args.subject}`);
    
    return { success: true };
  },
});
