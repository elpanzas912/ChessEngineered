# Stripe Integration Setup

## Environment Variables

Add these to your Supabase project settings (Project Settings > Edge Functions):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://mvvnqkixgxjblgyrnvte.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Stripe Products Setup

1. Go to Stripe Dashboard > Products
2. Create two products:
   - **Unlimited Pass (Yearly)** - $29.99/year
   - **Unlimited Pass (Monthly)** - $4.99/month
3. Copy the Price IDs and update them in `checkout.html`

## Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref mvvnqkixgxjblgyrnvte

# Deploy functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://mvvnqkixgxjblgyrnvte.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Configure Webhook Endpoint

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://mvvnqkixgxjblgyrnvte.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the webhook signing secret and add it to Supabase secrets

## Run Database Migration

```bash
supabase db push
```

Or run the SQL in `supabase/migrations/20240101000000_add_subscriptions.sql` in the Supabase SQL Editor.

## Frontend Updates

Update the Price IDs in `checkout.html`:

```javascript
const PLANS = {
  yearly: {
    price: 29.99,
    period: '/year',
    equivalent: '$2.50/month, billed annually',
    label: 'Unlimited Pass (Yearly)',
    stripePriceId: 'price_xxxxxxxxxxxxxxxx' // Replace with your Stripe Price ID
  },
  monthly: {
    price: 4.99,
    period: '/month',
    equivalent: 'Billed monthly, cancel anytime',
    label: 'Unlimited Pass (Monthly)',
    stripePriceId: 'price_xxxxxxxxxxxxxxxx' // Replace with your Stripe Price ID
  }
};
```

Update the Edge Function URL in `checkout.html`:

```javascript
const response = await fetch('https://mvvnqkixgxjblgyrnvte.supabase.co/functions/v1/create-checkout', {
```

## Testing

1. Use Stripe test mode
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires 3D Secure: `4000 0025 0000 3155`
3. Any future date for expiry
4. Any 3 digits for CVC
5. Any ZIP code

## Going Live

1. Switch to Stripe live mode
2. Create live products and prices
3. Update Price IDs in frontend
4. Update webhook endpoint to production
5. Update environment variables with live keys
6. Deploy functions again
