#!/bin/bash
set -e

echo "🚀 ChessEngineered Stripe Backend Deploy Script"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "🔑 Please login to Supabase first:"
    supabase login
fi

PROJECT_REF="mvvnqkixgxjblgyrnvte"

echo ""
echo "📋 Step 1: Linking project..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "📦 Step 2: Deploying Edge Functions..."
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy confirm-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt

echo ""
echo "🔐 Step 3: Checking secrets..."
echo ""
echo "⚠️  You need to set these secrets in your Supabase dashboard:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
echo "   Required secrets:"
echo "   • STRIPE_SECRET_KEY        (from https://dashboard.stripe.com/test/apikeys)"
echo "   • STRIPE_WEBHOOK_SECRET    (from webhook endpoint settings)"
echo "   • STRIPE_YEARLY_PRICE_ID   (yearly Unlimited Pass price, e.g. price_...)"
echo "   • SUPABASE_URL             (https://$PROJECT_REF.supabase.co)"
echo "   • SUPABASE_SERVICE_ROLE_KEY (from Project Settings > API)"
echo "   • SUPABASE_ANON_KEY         (from Project Settings > API)"
echo ""

read -p "Do you want to set secrets now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "STRIPE_SECRET_KEY (sk_test_...): " stripe_key
    read -p "STRIPE_WEBHOOK_SECRET (whsec_...): " webhook_secret
    read -p "STRIPE_YEARLY_PRICE_ID (price_...): " yearly_price_id
    read -p "SUPABASE_SERVICE_ROLE_KEY: " service_key
    read -p "SUPABASE_ANON_KEY: " anon_key
    
    supabase secrets set STRIPE_SECRET_KEY="$stripe_key"
    supabase secrets set STRIPE_WEBHOOK_SECRET="$webhook_secret"
    supabase secrets set STRIPE_YEARLY_PRICE_ID="$yearly_price_id"
    supabase secrets set SUPABASE_URL="https://$PROJECT_REF.supabase.co"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$service_key"
    supabase secrets set SUPABASE_ANON_KEY="$anon_key"
    
    echo ""
    echo "✅ Secrets set!"
fi

echo ""
echo "🗄️  Step 4: Run database migration..."
echo "   Go to https://supabase.com/dashboard/project/$PROJECT_REF/sql"
echo "   and run the SQL from: supabase/migrations/20240101000000_add_subscriptions.sql"
echo ""

echo ""
echo "✅ Deploy complete!"
echo ""
echo "📖 Next steps:"
echo "   1. Create products in Stripe Dashboard"
echo "   2. Set STRIPE_YEARLY_PRICE_ID in Supabase function secrets"
echo "   3. Configure webhook endpoint:"
echo "      https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook"
echo ""
