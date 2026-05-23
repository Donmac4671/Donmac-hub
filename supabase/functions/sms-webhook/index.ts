// supabase/functions/sms-webhook/index.ts
// Deploy: supabase functions deploy sms-webhook
// Set webhook URL in your SMS forwarder app to:
// https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Parse Ghana MoMo SMS messages
function parseMomoSms(smsText: string): { txId: string | null; amount: number | null; network: string } {
  const text = smsText.toUpperCase()

  // Extract amount: "GHS 50.00" or "GH¢50" or "AMOUNT: 50"
  const amountMatch = text.match(/(?:GHS?|GH[¢₵])\s*([0-9]+(?:\.[0-9]{1,2})?)/i)
    || text.match(/AMOUNT[:\s]+([0-9]+(?:\.[0-9]{1,2})?)/i)
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null

  // Extract transaction ID patterns
  const txMatch = text.match(/(?:TRANSACTION\s*ID|TXNID|TXN\s*ID|TRANS\.?\s*ID|REFERENCE)[:\s]+([A-Z0-9]+)/i)
    || text.match(/\b([A-Z]{1,3}[0-9]{8,12})\b/)
  const txId = txMatch ? txMatch[1] : null

  // Detect network from sender name or content
  let network = 'mtn'
  if (text.includes('TELECEL') || text.includes('TIGO') || text.includes('AIRTEL')) {
    network = text.includes('AIRTEL') ? 'airtel_big' : 'telecel'
  } else if (text.includes('MTN') || text.includes('MOMO')) {
    network = 'mtn'
  }

  return { txId, amount, network }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let rawMessage = ''

    // Support JSON body { message: "..." } or form-encoded
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      rawMessage = body.message || body.sms || body.text || ''
    } else {
      const formData = await req.formData()
      rawMessage = formData.get('message')?.toString() || formData.get('sms')?.toString() || ''
    }

    if (!rawMessage) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const { txId, amount, network } = parseMomoSms(rawMessage)

    // Log the incoming SMS
    const { data: logEntry } = await supabase.from('sms_webhook_log').insert({
      raw_message: rawMessage,
      parsed_tx_id: txId,
      parsed_amount: amount,
      parsed_network: network,
    }).select().single()

    // Try to match to a pending top-up claim
    let matchedTopup = null
    if (txId) {
      const { data: topup } = await supabase
        .from('wallet_topups')
        .select('id, user_id, status')
        .eq('tx_id', txId)
        .eq('status', 'pending')
        .single()

      if (topup) {
        matchedTopup = topup
        // Auto-fill amount and mark for admin approval
        await supabase.from('wallet_topups').update({
          amount: amount || 0,
          network,
          status: 'pending', // Still needs admin to approve
        }).eq('id', topup.id)

        // Update log with match
        await supabase.from('sms_webhook_log').update({
          matched_topup_id: topup.id,
        }).eq('id', logEntry.id)
      } else {
        // Create a new unmatched top-up entry for admin to assign
        await supabase.from('wallet_topups').insert({
          method: 'momo',
          tx_id: txId,
          amount: amount || 0,
          network,
          status: 'pending',
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, parsed: { txId, amount, network }, matched: !!matchedTopup }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
