// src/pages/ReferralsPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, st, grad } from '../lib/styles'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ReferralsPage() {
  const { profile } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [stats, setStats] = useState({ total: 0, earned: 0 })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const referralLink = `${window.location.origin}/auth?ref=${profile?.agent_code}`

  useEffect(() => {
    if (!profile) return
    supabase
      .from('referrals')
      .select('*, referred:referred_id(full_name, email, role, created_at)')
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setReferrals(list)
        setStats({
          total: list.length,
          earned: list.reduce((sum, r) => sum + (r.reward_paid ? parseFloat(r.reward_amount) : 0), 0),
        })
        setLoading(false)
      })
  }, [profile])

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(167,139,250,.13),rgba(59,130,246,.13))',
        border: '1px solid rgba(167,139,250,.22)',
        borderRadius: 20, padding: 22, textAlign: 'center',
      }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🎁</div>
        <h2 style={{ ...s.h2, margin: '0 0 6px' }}>Refer & Earn</h2>
        <p style={{ ...s.mutedText, margin: 0 }}>
          Earn <strong style={{ color: C.ok }}>₵0.50</strong> every time a referral makes their first purchase
        </p>
        <p style={{ ...s.mutedText, margin: '4px 0 0' }}>
          Earn <strong style={{ color: '#A78BFA' }}>₵10</strong> when they become a Reseller
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...s.card, padding: 16 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 5px' }}>Total Referrals</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: 0 }}>{stats.total}</p>
        </div>
        <div style={{ ...s.card, padding: 16 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 5px' }}>Total Earned</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: C.ok, margin: 0 }}>₵{stats.earned.toFixed(2)}</p>
        </div>
      </div>

      {/* Referral link */}
      <div style={s.card}>
        <h3 style={s.h3}>Your Referral Link</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, background: C.hi, border: `1px solid ${C.bdr}`, borderRadius: 10,
            padding: '10px 12px', fontSize: 12, color: C.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace',
          }}>{referralLink}</div>
          <button onClick={copyLink} style={{
            background: copied ? 'rgba(16,185,129,.12)' : C.glow,
            border: `1px solid ${copied ? 'rgba(16,185,129,.3)' : 'rgba(59,130,246,.2)'}`,
            borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
            color: copied ? C.ok : C.accent, fontWeight: 600, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p style={{ ...s.dimText, marginTop: 8 }}>
          Share this link with friends. When they sign up and make their first purchase, you earn automatically.
        </p>
      </div>

      {/* Referral list */}
      <div style={s.card}>
        <h3 style={s.h3}>Your Referrals</h3>
        {loading && <p style={{ color: C.muted, textAlign: 'center', padding: 16 }}>Loading…</p>}
        {!loading && referrals.length === 0 && (
          <p style={{ color: C.dim, textAlign: 'center', padding: 16, margin: 0 }}>
            No referrals yet. Share your link to start earning!
          </p>
        )}
        {referrals.map((r, i) => {
          const ref = r.referred
          const initials = ref?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 0', borderBottom: i < referrals.length - 1 ? `1px solid ${C.bdr}` : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: grad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
              }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{ref?.full_name || 'User'}</p>
                <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
                  {ref?.role?.charAt(0).toUpperCase() + ref?.role?.slice(1)} ·{' '}
                  {ref?.created_at ? format(new Date(ref.created_at), 'dd MMM yyyy') : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{
                  fontSize: 14, fontWeight: 700,
                  color: r.reward_paid ? C.ok : C.muted, margin: 0,
                }}>
                  {r.reward_paid ? `+₵${parseFloat(r.reward_amount).toFixed(2)}` : 'Pending'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
