# Stripe Trial Implementation

## Overview

The Pro tier now includes a **14-day free trial** for new subscribers. This implementation follows Stripe's best practices for trial periods.

## How It Works

### 1. Trial Period Configuration

- **Duration**: 14 days (2 weeks)
- **Tier**: Pro tier only
- **Billing**: Trial applies to both monthly and yearly billing cycles
- **Payment Method**: Required during signup (no free trial without payment method)

### 2. Implementation Details

#### Backend Changes (`convex/stripe.ts`)

```typescript
// Add trial period for Pro tier (14 days = 2 weeks)
const trialPeriodDays = args.tier === "pro" ? 14 : undefined;

const session = await stripe.checkout.sessions.create({
  // ... other options
  subscription_data: {
    metadata: { /* ... */ },
    // Add trial period for Pro tier
    ...(trialPeriodDays && { trial_period_days: trialPeriodDays }),
  },
});
```

#### Frontend Changes

- **LandingPage.tsx**: Updated button text to "Start 14-Day Free Trial"
- **ProTierButton.tsx**: Default button text changed to "Start Free Trial"
- **StripeCheckoutButton.tsx**: Updated default text to "Start Free Trial"

### 3. Trial Events

The system handles these Stripe webhook events:

- `customer.subscription.trial_will_end`: Sent 3 days before trial ends
- `customer.subscription.updated`: When trial ends and subscription becomes active
- `customer.subscription.created`: When trial subscription is created

### 4. Trial Status Mapping

Stripe status → Internal status:
- `trialing` → `trial`
- `active` → `active` (after trial ends)
- `canceled` → `inactive`
- `paused` → `suspended`

## User Experience

### During Trial
1. User clicks "Start 14-Day Free Trial"
2. User enters payment method (required)
3. Subscription starts immediately with trial status
4. No charges until trial ends

### Trial End
1. 3 days before trial ends: `trial_will_end` webhook sent
2. On trial end: Subscription automatically becomes active
3. First charge occurs after trial period

### Trial Benefits
- ✅ **No upfront cost**: Users can try Pro features for 14 days
- ✅ **Automatic conversion**: Seamless transition to paid subscription
- ✅ **Clear messaging**: UI clearly indicates trial period
- ✅ **Webhook handling**: Proper event handling for trial lifecycle

## Compliance

This implementation follows Stripe's trial requirements:

- ✅ **Payment method required**: No free trials without payment method
- ✅ **Clear trial messaging**: UI indicates trial period
- ✅ **Automatic billing**: Charges begin after trial ends
- ✅ **Webhook handling**: Proper event management

## Testing

### Test Scenarios
1. **New Pro subscription**: Should start with 14-day trial
2. **Enterprise subscription**: Should not have trial period
3. **Trial end**: Should automatically convert to active subscription
4. **Trial cancellation**: Should handle early cancellation

### Test Cards
Use Stripe's test cards for testing:
- **Successful payment**: `4242424242424242`
- **Declined payment**: `4000000000000002`

## Monitoring

### Key Metrics to Track
- Trial conversion rate
- Trial cancellation rate
- Average trial duration
- Post-trial retention

### Logs to Monitor
- `Trial will end for subscription {id} in association {id}`
- Webhook event processing
- Subscription status changes

## Future Enhancements

### Potential Improvements
1. **Email notifications**: Send trial end reminders
2. **Trial extension**: Allow admins to extend trials
3. **Trial analytics**: Track trial usage patterns
4. **Custom trial periods**: Different trial lengths for different tiers

### Advanced Features
1. **Trial without payment method**: For specific use cases
2. **Trial pause**: Allow pausing trials
3. **Trial reactivation**: Re-enable trials for returning users 