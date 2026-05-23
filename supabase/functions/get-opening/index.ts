import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OPENING_DATABASE } from './openings-data.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function activeSubscription(subscription: { status?: string; current_period_end?: string | null } | null) {
  if (!subscription) return false;
  const activeStatus = subscription.status === 'active' || subscription.status === 'trialing';
  const activePeriod = subscription.current_period_end
    ? new Date(subscription.current_period_end) > new Date()
    : false;
  return activeStatus && activePeriod;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug')?.trim();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return jsonResponse({ error: 'Invalid opening' }, 400);
    }

    const opening = (OPENING_DATABASE.openings as Record<string, unknown>)?.[slug];
    if (!opening) {
      return jsonResponse({ error: 'Opening not found' }, 404);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    let access = activeSubscription(subscription);

    if (!access) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('free_opening_slug')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) {
        return jsonResponse({ error: profileError.message }, 500);
      }

      const freeOpeningSlug = typeof profile?.free_opening_slug === 'string'
        ? profile.free_opening_slug
        : null;

      if (!freeOpeningSlug) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userData.user.id,
            free_opening_slug: slug,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (updateError) {
          return jsonResponse({ error: updateError.message }, 500);
        }
        access = true;
      } else {
        access = freeOpeningSlug === slug;
      }
    }

    if (!access) {
      return jsonResponse({ error: 'Opening locked' }, 403);
    }

    return jsonResponse({ opening });
  } catch (error) {
    console.error('get-opening error:', error);
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
