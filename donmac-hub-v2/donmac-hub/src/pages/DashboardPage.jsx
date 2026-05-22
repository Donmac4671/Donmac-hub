// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, grad, NET, st, pill, pillText } from '../lib/styles'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(4 * 3600 + 23 * 60 + 11)
  const [recentOrders, setRecentOrders] = useState([])
  const [promo, setPromo] = useState(null)

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load data
  useEffect(() => {
    if (!profile) return
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentOrders(data || []))

    supabase
      .from('promotions')
      .select('*')
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .then(({ data }) => setPromo(data?.[0] || null))
  }, [profile])

  const formatTimer = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const sec = totalSecs % 60
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
  }

  const todayOrders = recentOrders.filter(
    o => new Date(o.created_at).toDateString() === new Date().toDateString()
  )
  const todaySpent = todayOrders.reduce((acc, o) => acc + parseFloat(o.amount || 0), 0)

  const quickActions = [
    { label: 'Buy Data',   icon: '📦', path: '/bundles',  rgb: '59,130,246'  },
    { label: 'Top Up',     icon: '💳', path: '/wallet',   rgb: '16,185,129'  },
    { label: 'My Orders',  icon: '📋', path: '/orders',   rgb: '245,158,11'  },
    { label: 'Referrals',  icon: '🎁', path: '/referrals',rgb: '167,139,250' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Promo banner */}
      {promo && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(59,130,246,.14),rgba(124,58,237,.14))',
          border: '1px solid rgba(124,58,237,.22)', borderRadius: 16,
          padding: 18, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>🔥 Active Promotion</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{promo.title}</p>
            {promo.code && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Code: {promo.code}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: C.dim, margin: '0 0 3px' }}>Ends in</p>
            <p style={{
              fontFamily: 'monospace', fontSize: 22, fontWeight: 800,
              color: C.accent, letterSpacing: '0.05em', margin: 0,
            }}>{formatTimer(countdown)}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          {
            label: 'Wallet Balance',
            value: `₵${(profile?.wallet_balance || 0).toFixed(2)}`,
            icon: '💳',
            tint: C.glow,
          },
          {
            label: "Today's Orders",
            value: todayOrders.length,
            sub: recentOrders[0] ? `Last: ${format(new Date(recentOrders[0].created_at), 'HH:mm')}` : 'None yet',
            icon: '📋',
            tint: 'rgba(16,185,129,.12)',
          },
          {
            label: 'Amount Spent Today',
            value: `₵${todaySpent.toFixed(2)}`,
            icon: '📊',
            tint: 'rgba(245,158,11,.12)',
          },
          {
            label: 'Total Orders',
            value: recentOrders.length,
            icon: '📦',
            tint: 'rgba(167,139,250,.12)',
          },
        ].map(item => (
          <div key={item.label} style={{ ...st.card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '0 0 5px' }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>{item.value}</p>
                {item.sub && <p style={{ fontSize: 11, color: C.dim, margin: '3px 0 0' }}>{item.sub}</p>}
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: item.tint,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{item.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ ...st.card, padding: 16 }}>
        <h3 style={st.h3}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{
                background: `rgba(${action.rgb},.08)`,
                border: `1px solid rgba(${action.rgb},.2)`,
                borderRadius: 12, padding: '13px 11px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 7, cursor: 'pointer', transition: 'background .15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div style={st.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...st.h3, margin: 0 }}>Recent Orders</h3>
          <button
            onClick={() => navigate('/orders')}
            style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            View All
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <p style={{ color: C.dim, textAlign: 'center', padding: '20px 0', margin: 0 }}>
            No orders yet. Buy your first data bundle!
          </p>
        ) : (
          recentOrders.map((order, idx) => {
            const network = NET[order.network]
            return (
              <div
                key={order.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 0',
                  borderBottom: idx < recentOrders.length - 1 ? `1px solid ${C.bdr}` : 'none',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: network?.bg || C.hi,
                  border: `1.5px solid ${network?.bdr || C.bdr}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: network?.txt || C.muted, flexShrink: 0,
                }}>{network?.badge || '?'}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                    {order.bundle_size} · {order.phone}
                  </p>
                  <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
                    {order.ref} · {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>
                    ₵{order.amount}
                  </p>
                  <span style={pill(order.status)}>{pillText(order.status)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
