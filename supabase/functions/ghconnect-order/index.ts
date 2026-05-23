// supabase/functions/ghconnect-order/index.ts
// Deploy: supabase functions deploy ghconnect-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GHCONNECT_TOKEN = Deno.env.get('GHCONNECT_TOKEN') || ''
const GHCONNECT_BASE = 'https://app.ghconnect.net/api/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderId, network, bundleSize, phone, amount } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Map network + size to GHDataConnect bundle code
    const networkMap: Record<string, string> = {
      mtn: 'mtn',
      telecel: 'telecel',
      airtel_big: 'at-big-time',
      airtel_premium: 'at-premium',
    }
    const networkCode = networkMap[network] || network

    // Format phone: strip leading 0, add 233
    const formattedPhone = phone.startsWith('0') ? '233' + phone.slice(1) : phone

    // Call GHDataConnect API
    const response = await fetch(`${GHCONNECT_BASE}/data/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHCONNECT_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        network: networkCode,
        phone: formattedPhone,
        data_plan: bundleSize,
        reference: orderId,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.status === 'error') {
      // Update order status to failed
      await supabase.from('orders').update({
        status: 'failed',
        ghconnect_ref: result?.reference || null,
      }).eq('id', orderId)

      return new Response(
        JSON.stringify({ error: result?.message || 'GHDataConnect API error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update order to processing with GHConnect ref
    await supabase.from('orders').update({
      status: 'processing',
      ghconnect_ref: result?.reference || result?.data?.reference || null,
    }).eq('id', orderId)

    return new Response(
      JSON.stringify({ success: true, reference: result?.reference }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
