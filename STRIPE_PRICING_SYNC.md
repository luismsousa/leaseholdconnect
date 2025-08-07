# Stripe Pricing Sync

This document explains how to sync pricing information from Stripe to the database.

## Overview

The application now supports automatically fetching pricing information from Stripe and storing it in the database. This ensures that the pricing displayed in the application always matches what's configured in your Stripe dashboard.

## How It Works

1. **Lookup Keys**: The system uses Stripe lookup keys to dynamically fetch pricing
2. **Automatic Sync**: Pricing is fetched from Stripe and stored in the `subscriptionTiers` table
3. **Real-time Updates**: When you update pricing in Stripe, you can sync it to the database

## Setup

### 1. Configure Stripe Lookup Keys

Make sure you have the following lookup keys configured in your Stripe dashboard:

- `pro_monthly` - Monthly Pro subscription price
- `pro_yearly` - Yearly Pro subscription price  
- `enterprise_monthly` - Monthly Enterprise subscription price
- `enterprise_yearly` - Yearly Enterprise subscription price

### 2. Environment Variables

Ensure these environment variables are set:

```bash
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_PRO_LOOKUP_KEY=pro_monthly  # Your Pro subscription lookup key
STRIPE_ENTERPRISE_LOOKUP_KEY=enterprise_monthly  # Your Enterprise subscription lookup key
```

## Usage

### Manual Sync (Admin Dashboard)

1. **Access the PaaS Admin Dashboard**
2. **Click the "💰 Sync Pricing from Stripe" button**
3. **Check the toast notification** for success/failure status

### Programmatic Sync

You can also trigger the sync programmatically:

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const syncPricing = useMutation(api.stripe.syncPricingFromStripeMutation);

// Trigger sync
await syncPricing();
```

### Testing

To test the pricing sync functionality:

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const testSync = useMutation(api.stripe.testSyncPricing);

// Test the sync
const result = await testSync();
console.log(result);
```

## What Gets Synced

The following information is fetched from Stripe and stored in the database:

- **Monthly Price**: `price` field (in pence/cents)
- **Yearly Price**: `yearlyPrice` field (in pence/cents)
- **Currency**: `currency` field (e.g., "gbp", "usd")
- **Stripe Price IDs**: `stripePriceId` and `stripeYearlyPriceId` fields

## Database Schema

The pricing information is stored in the `subscriptionTiers` table:

```typescript
{
  name: "pro",
  price: 2900, // £29.00 in pence
  yearlyPrice: 29000, // £290.00 in pence
  currency: "gbp",
  stripePriceId: "price_1234567890",
  stripeYearlyPriceId: "price_0987654321",
  // ... other fields
}
```

## Benefits

- **Dynamic Pricing**: Update prices in Stripe without code changes
- **Consistency**: Database always reflects current Stripe pricing
- **Audit Trail**: Track pricing changes over time
- **Environment Agnostic**: Same lookup keys work across environments

## Troubleshooting

### Common Issues

1. **"No active price found"**: Check that your lookup keys are correctly configured in Stripe
2. **"Authentication required"**: Ensure you're logged in as a PaaS admin
3. **"STRIPE_SECRET_KEY not set"**: Verify your environment variables

### Debugging

Use the test function to debug pricing issues:

```typescript
const result = await testSync();
console.log(result.details); // Shows fetched pricing details
```

## Security

- Only PaaS admins can trigger pricing sync
- All Stripe API calls use your configured secret key
- Pricing information is stored securely in the database

## Future Enhancements

- **Automatic Sync**: Scheduled sync on a regular basis
- **Webhook Integration**: Sync on price changes in Stripe
- **Price History**: Track pricing changes over time
- **Multi-currency Support**: Support for multiple currencies 