"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Initialize Resend only when API key is available
// Direct API call function since the SDK has issues
const sendEmailDirect = async (emailData: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) => {
  const apiKey = process.env.RESEND_API_TOKEN;
  
  if (!apiKey) {
    throw new Error("Resend API key environment variable is not set");
  }
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || "Failed to send email");
  }
  
  return result;
};

const getFromEmail = () => {
  const fromEmail = process.env.FROM_EMAIL || "noreply@yourdomain.com";
  if (!fromEmail) {
    throw new Error("FROM_EMAIL environment variable is not set. Please set FROM_EMAIL");
  }
  
  // For testing, we can use a verified domain
  // You can also use "onboarding@resend.dev" for testing
  // TODO: Once you verify your domain at resend.com/domains, you can use your custom domain
  return fromEmail;
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
      // Get association details from database using internal query
      const association = await ctx.runQuery(internal.associations.getAssociationInternal, { associationId: args.associationId });
      const associationName = association?.name || "your association";
      
      console.log("Attempting to send invitation email with:", {
        to: args.email,
        from: getFromEmail(),
        associationName,
        apiKey: process.env.RESEND_API_TOKEN ? "API key present" : "API key missing"
      });
      
      console.log("Resend configuration:", {
        apiKey: process.env.RESEND_API_TOKEN ? `${process.env.RESEND_API_TOKEN.substring(0, 10)}...` : "missing",
        fromEmail: getFromEmail(),
        toEmail: args.email
      });

      const emailData = {
        from: getFromEmail(),
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
      };

      console.log("Sending invitation email using direct API...");

      try {
        const result = await sendEmailDirect(emailData);
        console.log(`Invitation email sent successfully to ${args.email}`);
        return { success: true, data: result };
      } catch (error) {
        console.error("Failed to send invitation email:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
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
      const result = await sendEmailDirect({
        from: getFromEmail(),
        to: [args.to],
        subject: args.subject,
        html: args.html,
      });

      console.log(`Email sent successfully to ${args.to}`);
      return { success: true, data: result };
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
      // Get association details from database using internal query
      const association = await ctx.runQuery(internal.associations.getAssociationInternal, { associationId: args.associationId });
      const associationName = association?.name || "your association";
      
      const result = await sendEmailDirect({
        from: getFromEmail(),
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
                <li>View and manage association information</li>
                <li>Access important documents and files</li>
                <li>Participate in meetings and discussions</li>
                <li>Stay updated with notifications</li>
                <li>Connect with other members</li>
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

      console.log(`Welcome email sent successfully to ${args.email}`);
      return { success: true, data: result };
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
      const result = await sendEmailDirect({
        from: getFromEmail(),
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

      console.log(`Notification email sent successfully to ${args.email}`);
      return { success: true, data: result };
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
      console.log("=== TEST EMAIL DEBUG ===");
      console.log("Environment variables:");
      console.log("- RESEND_API_TOKEN:", process.env.RESEND_API_TOKEN ? "present" : "missing");
      console.log("- FROM_EMAIL:", process.env.FROM_EMAIL);
      console.log("- SITE_URL:", process.env.SITE_URL);
      
      // Test direct API call first
      console.log("Testing direct API call...");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: [args.email],
          subject: "Direct API Test",
          html: "<p>This is a test via direct API call</p>"
        })
      });
      
      const apiResult = await response.json();
      console.log("Direct API result:", apiResult);
      
      if (!response.ok) {
        console.error("Direct API call failed:", apiResult);
        return { success: false, error: apiResult.message || "Direct API call failed" };
      }
      
      console.log("Direct API call successful, now testing direct API for custom domain...");
      
      const emailData = {
        from: getFromEmail(),
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
      };
      
      console.log("Sending email with direct API...");
      const testResult = await sendEmailDirect(emailData);

      console.log(`Test email sent successfully to ${args.email}`);
      console.log("Email data:", testResult);
      return { success: true, data: testResult };
    } catch (error) {
      console.error("Failed to send test email:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
