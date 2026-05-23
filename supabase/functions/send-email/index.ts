// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM = 'Donmac Data Hub <noreply@donmacdatahub.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const templates = {
  order_update: (data: any) => ({
    subject: `Order ${data.status === 'completed' ? 'Delivered ✓' : 'Update'} — ${data.ref}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#3B82F6">Donmac Data Hub</h2>
        <p>Hi ${data.name},</p>
        <p>Your order <strong>${data.ref}</strong> for <strong>${data.bundle}</strong> to <strong>${data.phone}</strong> is now <strong style="color:${data.status==='completed'?'#10B981':'#F59E0B'}">${data.status.toUpperCase()}</strong>.</p>
        ${data.status === 'failed' ? '<p>Please contact us on WhatsApp at 0549358359 for a refund.</p>' : ''}
        <p>Thank you for using Donmac Data Hub!</p>
      </div>`,
  }),
  topup_credited: (data: any) => ({
    subject: 'Wallet Credited — Donmac Data Hub',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#3B82F6">Donmac Data Hub</h2>
        <p>Hi ${data.name},</p>
        <p>Your wallet has been credited with <strong>₵${data.amount}</strong>.</p>
        <p>New balance: <strong>₵${data.balance}</strong></p>
        <p>Thank you!</p>
      </div>`,
  }),
  reseller_approved: (data: any) => ({
    subject: 'Reseller Account Activated! 🏪 — Donmac Data Hub',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#3B82F6">Donmac Data Hub</h2>
        <p>Hi ${data.name},</p>
        <p>Congratulations! Your reseller account has been activated.</p>
        <p>Your store link: <a href="https://donmacdatahub.com/store/${data.slug}">donmacdatahub.com/store/${data.slug}</a></p>
        <p>You can now log in and set your own prices for all packages.</p>
      </div>`,
  }),
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, template, data } = await req.json()
    const tpl = templates[template as keyof typeof templates]
    if (!tpl) throw new Error('Unknown template')

    const { subject, html } = tpl(data)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Email send failed')

    return new Response(JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
