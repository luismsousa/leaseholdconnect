# Email Setup Guide

This guide will help you set up email functionality for the Leaseholders Association Management App using Resend.

## Prerequisites

1. A Resend account (sign up at [resend.com](https://resend.com))
2. A verified domain in Resend
3. API key from Resend

## Setup Steps

### 1. Get Your Resend API Key

1. Log in to your [Resend dashboard](https://resend.com)
2. Go to the API Keys section
3. Create a new API key
4. Copy the API key (starts with `re_`)

### 2. Verify Your Domain

1. In your Resend dashboard, go to the Domains section
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS verification steps provided by Resend
4. Wait for verification to complete

### 3. Update Environment Variables

Edit your `.env.local` file and update the following variables:

```bash
# Email Configuration
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://your-app-url.com
```

**Important Notes:**
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- Replace `noreply@yourdomain.com` with an email address from your verified domain
- Update `https://your-app-url.com` with your actual application URL
- **Note**: Association names are now automatically retrieved from the database, so you don't need to set `ASSOCIATION_NAME` in environment variables

### 4. Test the Email Functionality

The app now includes the following email functions:

#### Invitation Emails
- Sent when a new member is invited to join an association
- Includes the inviter's name and unit information
- Contains a link to join the association

#### Welcome Emails
- Sent automatically when a user accepts an invitation
- Welcomes the user to the association
- Lists available features and tools

#### General Notification Emails
- Can be used for any custom notifications
- Supports custom subject, message, and action buttons

#### Generic Email Function
- Can send any custom HTML email
- Useful for meeting notifications, document updates, etc.

### 5. Email Templates

The email templates are designed with:
- Responsive design that works on mobile and desktop
- Professional styling with your brand colors
- Clear call-to-action buttons
- Proper error handling and logging

### 6. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_1234567890abcdef` |
| `FROM_EMAIL` | Sender email address | `noreply@yourdomain.com` |
| `SITE_URL` | Your application URL | `https://your-app.com` |

### 7. Troubleshooting

#### Common Issues:

1. **"Missing API key" error**
   - Make sure `RESEND_API_KEY` is set in your `.env.local` file
   - Ensure the API key starts with `re_`

2. **"Unauthorized" error**
   - Verify your API key is correct
   - Check that your domain is verified in Resend

3. **Emails not being sent**
   - Check the Convex logs for error messages
   - Verify the `FROM_EMAIL` is from a verified domain
   - Ensure the recipient email addresses are valid

4. **Emails going to spam**
   - Make sure your domain is properly verified
   - Set up SPF, DKIM, and DMARC records as recommended by Resend
   - Use a professional `FROM_EMAIL` address

### 8. Security Best Practices

1. **Never commit API keys to version control**
   - The `.env.local` file is already in `.gitignore`
   - Keep your API keys secure and rotate them regularly

2. **Use environment-specific configurations**
   - Use different API keys for development and production
   - Use different sender emails for testing

3. **Monitor email sending**
   - Check Resend dashboard for delivery rates
   - Monitor bounce rates and spam complaints

### 9. Production Deployment

When deploying to production:

1. Set up environment variables in your hosting platform
2. Use a production Resend API key
3. Use a verified domain for sending emails
4. Test email functionality in the production environment

### 10. Customization

You can customize the email templates by editing the HTML in the following files:
- `convex/emails.ts` - All email templates and functions

The templates use inline CSS for maximum compatibility across email clients.

## Support

If you encounter any issues:
1. Check the Convex logs for error messages
2. Verify your Resend configuration
3. Test with a simple email first
4. Contact support if needed 