// supabase/functions/paystack-verify/index.ts
// Deploy: supabase functions deploy paystack-verify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()

    // ── Initialize payment ──────────────────────────────────
    if (body.action === 'initialize') {
      const { amount, email, userId } = body
      const amountKobo = Math.round(parseFloat(amount) * 100)
      const reference = `DMH-PSK-${Date.now()}`

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: 'GHS',
          reference,
          callback_url: `${Deno.env.get('APP_URL')}/wallet/verify?ref=${reference}`,
          metadata: { userId, source: 'wallet_topup' },
        }),
      })

      const data = await response.json()
      if (!data.status) throw new Error(data.message || 'Paystack initialization failed')

      // Save pending top-up
      await supabase.from('wallet_topups').insert({
        user_id: userId,
        amount: parseFloat(amount),
        method: 'paystack',
        paystack_ref: reference,
        status: 'pending',
      })

      return new Response(
        JSON.stringify({ authorization_url: data.data.authorization_url, reference }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Verify payment ──────────────────────────────────────
    if (body.action === 'verify') {
      const { reference } = body
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      })
      const data = await response.json()

      if (!data.status || data.data.status !== 'success') {
        throw new Error('Payment verification failed')
      }

      const amountGhs = data.data.amount / 100

      // Update topup to verified — trigger will credit wallet
      await supabase.from('wallet_topups')
        .update({ status: 'verified', amount: amountGhs })
        .eq('paystack_ref', reference)

      return new Response(
        JSON.stringify({ success: true, amount: amountGhs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Unknown action')
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
