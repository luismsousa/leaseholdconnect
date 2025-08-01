# Stripe Setup Guide

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook secret
STRIPE_PRO_LOOKUP_KEY=pro_monthly  # Your Pro subscription lookup key
STRIPE_ENTERPRISE_LOOKUP_KEY=enterprise_monthly  # Your Enterprise subscription lookup key

# Convex Configuration
CONVEX_SITE_URL=http://localhost:5174
```

## Implementation Overview

This application uses **Stripe Checkout** with **lookup keys** for dynamic pricing:

- ✅ **Stripe Checkout**: Hosted payment page with seamless UX
- ✅ **Lookup Keys**: Dynamic price resolution without hardcoded IDs
- ✅ **Webhook Integration**: Automatic subscription management
- ✅ **Environment Agnostic**: Same setup works across dev/prod

## Setting Up Lookup Keys

### 1. Create Products and Prices in Stripe Dashboard

1. **Go to your Stripe Dashboard**
2. **Navigate to Products** → Click "Add product"
3. **Create your subscription products**:
   - **Pro Subscription**: Name it "Pro Subscription"
   - **Enterprise Subscription**: Name it "Enterprise Subscription"

### 2. Create Prices with Lookup Keys

For each product, create a price with a lookup key:

#### Pro Subscription Price
- **Amount**: Your Pro price (e.g., £20.00)
- **Billing**: Recurring (monthly)
- **Lookup key**: `pro_monthly`

#### Enterprise Subscription Price  
- **Amount**: Your Enterprise price (e.g., £50.00)
- **Billing**: Recurring (monthly)
- **Lookup key**: `enterprise_monthly`

### 3. Using Lookup Keys

The system dynamically fetches price IDs using lookup keys, which means:

✅ **No hardcoded price IDs** in your code
✅ **Easy price updates** - just update the price in Stripe Dashboard
✅ **Environment flexibility** - same lookup keys work in dev/prod
✅ **Automatic price management** - system fetches the latest active price

## Webhook Setup

1. **In Stripe Dashboard** → Go to Webhooks
2. **Add endpoint**: `https://your-domain.convex.cloud/api/stripe/webhook`
3. **Select events**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Testing

1. **Set up environment variables** with your lookup keys
2. **Restart the dev server**: `npm run dev`
3. **Test the flow**: Click "Get Started" on the landing page
4. **Check logs**: Monitor Convex dashboard for webhook events

## Benefits of This Implementation

- **Dynamic Pricing**: Update prices without code changes
- **Environment Agnostic**: Same lookup keys work everywhere
- **Version Control**: Easy to track price changes
- **Flexibility**: Can have different prices for different environments
- **Maintenance**: No need to update code when prices change
- **User Experience**: Seamless checkout flow with pre-filled data
- **Security**: All payment processing handled by Stripe 