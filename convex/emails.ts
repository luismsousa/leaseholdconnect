"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";
import { api } from "./_generated/api";

// Initialize Resend only when API key is available
const getResend = () => {
  // Try different possible environment variable names, prioritizing real Resend API keys
  const apiKey = process.env.RESEND_API_TOKEN || process.env.RESEND_API_KEY || process.env.CONVEX_RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Resend API key environment variable is not set. Please set RESEND_API_TOKEN, RESEND_API_KEY, or CONVEX_RESEND_API_KEY");
  }
  return new Resend(apiKey);
};

export const sendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    inviterName: v.string(),
    unit: v.optional(v.string()),
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get association details from database
      const association = await ctx.runQuery(api.associations.getAssociation, { associationId: args.associationId });
      const associationName = association?.name || "your association";
      
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        to: [args.email],
        subject: `Invitation to join ${associationName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">You're invited to join!</h2>
            <p>Hello ${args.name},</p>
            <p>${args.inviterName} has invited you to join ${associationName}.</p>
            ${args.unit ? `<p><strong>Unit:</strong> ${args.unit}</p>` : ""}
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>To get started:</strong></p>
              <ol>
                <li>Click the link below</li>
                <li>Create an account using: <strong>${args.email}</strong></li>
                <li>You'll automatically have access to the association</li>
              </ol>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.SITE_URL || 'https://your-app-url.com'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Association</a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              If you have any questions, please contact your association administrator.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send invitation email:", error);
        return { success: false, error: error.message };
      }

      console.log(`Invitation email sent successfully to ${args.email}`);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        to: [args.to],
        subject: args.subject,
        html: args.html,
      });

      if (error) {
        console.error("Failed to send email:", error);
        return { success: false, error: error.message };
      }

      console.log(`Email sent successfully to ${args.to}`);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    associationId: v.id("associations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get association details from database
      const association = await ctx.runQuery(api.associations.getAssociation, { associationId: args.associationId });
      const associationName = association?.name || "your association";
      
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        to: [args.email],
        subject: `Welcome to ${associationName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome to ${associationName}!</h2>
            <p>Hello ${args.name},</p>
            <p>Welcome to your new association management portal! You now have access to all the features and tools to help manage your community.</p>
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>View and manage association members</li>
                <li>Schedule and attend meetings</li>
                <li>Access important documents</li>
                <li>Participate in voting</li>
                <li>Update your preferences</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.SITE_URL || 'https://your-app-url.com'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Portal</a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              If you have any questions, please contact your association administrator.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        return { success: false, error: error.message };
      }

      console.log(`Welcome email sent successfully to ${args.email}`);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export const sendNotificationEmail = internalAction({
  args: {
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        to: [args.email],
        subject: args.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">${args.subject}</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p>${args.message}</p>
            </div>
            ${args.actionUrl && args.actionText ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${args.actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">${args.actionText}</a>
              </div>
            ` : ""}
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from your association management system.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send notification email:", error);
        return { success: false, error: error.message };
      }

      console.log(`Notification email sent successfully to ${args.email}`);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to send notification email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Test email function for development
export const sendTestEmail = internalAction({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        to: [args.email],
        subject: "Test Email - Association Management System",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Email Test Successful! 🎉</h2>
            <p>Hello!</p>
            <p>This is a test email to verify that your email configuration is working correctly.</p>
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>Configuration Details:</strong></p>
              <ul>
                <li>From Email: ${process.env.FROM_EMAIL || "noreply@yourdomain.com"}</li>
                <li>Site URL: ${process.env.SITE_URL || "https://your-app-url.com"}</li>
              </ul>
            </div>
            <p>If you received this email, your email functionality is working correctly!</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is a test email from your association management system.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send test email:", error);
        return { success: false, error: error.message };
      }

      console.log(`Test email sent successfully to ${args.email}`);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to send test email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
