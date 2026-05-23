// src/pages/ResellerPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, NET, st, grad } from '../lib/styles'
import toast from 'react-hot-toast'

export default function ResellerPage() {
  const { profile, refreshProfile } = useAuth()
  const isReseller = profile?.role === 'reseller' || profile?.role === 'admin'

  return isReseller
    ? <ResellerStorefront profile={profile} />
    : <BecomeResellerForm profile={profile} refreshProfile={refreshProfile} />
}

// ── Storefront price editor ───────────────────────────────────
function ResellerStorefront({ profile }) {
  const [bundles, setBundles] = useState({})
  const [prices, setPrices] = useState({})  // bundleId → custom price
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('bundles').select('*').eq('visible', true).order('sort_order'),
      supabase.from('reseller_prices').select('*').eq('reseller_id', profile.id),
    ]).then(([{ data: bData }, { data: pData }]) => {
      const grouped = {}
      ;(bData || []).forEach(b => {
        if (!grouped[b.network]) grouped[b.network] = []
        grouped[b.network].push(b)
      })
      setBundles(grouped)
      const priceMap = {}
      ;(pData || []).forEach(p => { priceMap[p.bundle_id] = p.price })
      setPrices(priceMap)
      setLoading(false)
    })
  }, [profile.id])

  const handlePriceChange = (bundleId, value) => {
    setPrices(prev => ({ ...prev, [bundleId]: value }))
  }

  const savePrices = async () => {
    setSaving(true)
    try {
      const rows = Object.entries(prices)
        .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
        .map(([bundleId, price]) => ({
          reseller_id: profile.id,
          bundle_id: bundleId,
          price: parseFloat(price),
        }))

      // Upsert all prices
      const { error } = await supabase
        .from('reseller_prices')
        .upsert(rows, { onConflict: 'reseller_id,bundle_id' })

      if (error) throw error
      toast.success('Storefront prices saved!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const storeUrl = `${window.location.origin}/store/${profile?.store_slug}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(16,185,129,.12),rgba(59,130,246,.12))',
        border: '1px solid rgba(16,185,129,.22)', borderRadius: 20, padding: 22, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
        <h2 style={{ ...s.h2, margin: '0 0 6px' }}>Your Reseller Storefront</h2>
        <p style={{ ...s.mutedText, margin: '0 0 14px' }}>Set your own prices and share your store link with customers.</p>
        <div style={{
          background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: 10, padding: '10px 14px', display: 'inline-block',
        }}>
          <p style={{ fontSize: 10, color: C.dim, margin: '0 0 2px' }}>Your Store Link</p>
          <a href={storeUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, fontFamily: 'monospace', color: C.ok, textDecoration: 'none' }}>
            {storeUrl}
          </a>
        </div>
      </div>

      {/* Price editor */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ ...s.h3, margin: 0 }}>Set Your Selling Prices</h3>
          <button onClick={savePrices} disabled={saving} style={{ ...s.btnSm }}>
            {saving ? 'Saving…' : '💾 Save Prices'}
          </button>
        </div>
        <p style={{ ...s.dimText, marginBottom: 16 }}>
          Your cost price is shown on the left. Set your selling price on the right — you keep the difference as profit.
        </p>

        {loading ? <p style={{ color: C.muted, textAlign: 'center' }}>Loading bundles…</p>
          : Object.entries(bundles).map(([netKey, blist]) => (
            <div key={netKey} style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                padding: '6px 10px', background: NET[netKey].bg,
                border: `1px solid ${NET[netKey].bdr}`, borderRadius: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: NET[netKey].bg,
                  border: `1.5px solid ${NET[netKey].bdr}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, fontWeight: 800, color: NET[netKey].txt,
                }}>{NET[netKey].badge}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: NET[netKey].txt }}>{NET[netKey].label}</span>
              </div>

              {blist.map(b => {
                const myPrice = prices[b.id] !== undefined ? prices[b.id] : (parseFloat(b.price) * 1.10).toFixed(2)
                const profit = myPrice !== '' && !isNaN(parseFloat(myPrice))
                  ? (parseFloat(myPrice) - parseFloat(b.price)).toFixed(2) : '0.00'
                const profitPos = parseFloat(profit) >= 0
                return (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                    padding: '8px 10px', background: C.hi, borderRadius: 10,
                  }}>
                    <div style={{ width: 52, flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{b.size}</p>
                      <p style={{ fontSize: 10, color: C.dim, margin: 0 }}>{b.validity}</p>
                    </div>
                    <p style={{ fontSize: 11, color: C.dim, width: 72, flexShrink: 0, margin: 0 }}>Cost: ₵{parseFloat(b.price).toFixed(2)}</p>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: C.muted, fontWeight: 600,
                      }}>₵</span>
                      <input
                        type="number" step="0.01" min={parseFloat(b.price)}
                        value={myPrice}
                        onChange={e => handlePriceChange(b.id, e.target.value)}
                        style={{ ...s.input, paddingLeft: 26, fontSize: 13, height: 36 }}
                      />
                    </div>
                    <p style={{
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      color: profitPos ? C.ok : C.err, margin: 0, minWidth: 52, textAlign: 'right',
                    }}>
                      {profitPos ? '+' : ''}₵{profit}
                    </p>
                  </div>
                )
              })}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── Become Reseller form ──────────────────────────────────────
function BecomeResellerForm({ profile, refreshProfile }) {
  const [txId, setTxId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingApp, setExistingApp] = useState(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('reseller_applications').select('*')
      .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setExistingApp(data[0]) })
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!txId.trim()) return toast.error('Please enter your MoMo Transaction ID')
    setLoading(true)
    try {
      // Check if txId already submitted
      const { data: existing } = await supabase.from('reseller_applications')
        .select('id').eq('tx_id', txId.trim()).single()
      if (existing) throw new Error('This Transaction ID has already been submitted.')

      const { error } = await supabase.from('reseller_applications').insert({
        user_id: profile.id,
        tx_id: txId.trim(),
        amount: 40,
        status: 'pending',
      })
      if (error) throw error
      toast.success('Application submitted! Admin will review within 24 hours.')
      setSubmitted(true)
      refreshProfile()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted || existingApp?.status === 'pending') return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>⏳</div>
      <h2 style={s.h2}>Application Submitted!</h2>
      <p style={{ ...s.mutedText, lineHeight: 1.7, marginBottom: 20 }}>
        We will verify your MoMo payment and activate your reseller account within 24 hours.
        You will receive a notification when approved.
      </p>
      {(existingApp?.tx_id || txId) && (
        <div style={{ ...s.cardSm, display: 'inline-block', textAlign: 'left' }}>
          <p style={{ fontSize: 11, color: C.dim, margin: '0 0 3px' }}>Transaction ID submitted</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.accent, fontFamily: 'monospace', letterSpacing: '0.06em', margin: 0 }}>
            {existingApp?.tx_id || txId}
          </p>
        </div>
      )}
    </div>
  )

  if (existingApp?.status === 'rejected') return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
      <h2 style={s.h2}>Application Rejected</h2>
      <p style={{ ...s.mutedText, marginBottom: 16 }}>
        Your previous application was rejected. Please contact admin for more details,
        then reapply with a valid Transaction ID.
      </p>
      <a href="https://wa.me/233549358359" style={{ color: C.ok, fontWeight: 600 }}>
        Contact Admin on WhatsApp →
      </a>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Benefits */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(59,130,246,.1),rgba(124,58,237,.1))',
        border: '1px solid rgba(124,58,237,.2)', borderRadius: 20, padding: 22,
      }}>
        <h3 style={{ ...s.h3, marginBottom: 14 }}>🏪 Reseller Benefits</h3>
        {[
          'Get your own branded storefront link to share with customers',
          'Set your own selling prices — you keep the profit margin',
          'Access wholesale prices on all networks (MTN, Telecel, AirtelTigo)',
          'Earn ₵10 commission when a referral becomes a reseller',
          'Priority order processing and dedicated support',
        ].map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ color: C.ok, flexShrink: 0 }}>✓</span>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{b}</p>
          </div>
        ))}
      </div>

      {/* Application form */}
      <div style={s.card}>
        <h3 style={s.h3}>One-time Activation Fee — ₵40</h3>

        {/* Step 1 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: grad, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>1</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>Send ₵40 via MoMo to this number</p>
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.18)', borderRadius: 10, padding: '11px 13px' }}>
              <p style={{ fontSize: 18, color: C.text, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.06em', margin: 0 }}>0549358359</p>
              <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Osei Michael · MoMo / Telecel Cash</p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: grad, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>2</div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>
                Enter your MoMo Transaction ID{' '}
                <span style={{ color: C.dim, fontWeight: 400 }}>(from the SMS you received)</span>
              </label>
              <input
                value={txId} onChange={e => setTxId(e.target.value.trim())}
                placeholder="e.g. A4829103847"
                style={{ ...s.input, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                required
              />
              <p style={s.dimText}>The Transaction ID is in the confirmation SMS sent to your phone after payment.</p>
            </div>
          </div>
          <button type="submit" style={s.btnPrimary} disabled={loading || !txId.trim()}>
            {loading ? 'Submitting…' : 'Submit Application for Approval'}
          </button>
        </form>
      </div>
    </div>
  )
}
