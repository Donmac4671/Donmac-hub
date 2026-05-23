// src/pages/OrdersPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, NET, st, grad, pill, pillText } from '../lib/styles'
import { format } from 'date-fns'

const FILTERS = ['all','waiting','pending','processing','completed','failed']

export default function OrdersPage() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState('all')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    if (!profile) return
    setLoading(true)
    let q = supabase.from('orders').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [profile, filter])

  // Real-time order status updates
  useEffect(() => {
    if (!profile) return
    const sub = supabase.channel('orders_' + profile.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
      }).subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 13px', borderRadius: 20, whiteSpace: 'nowrap',
              background: filter === f ? C.accent : C.hi,
              border: `1px solid ${filter === f ? C.accent : C.bdr}`,
              color: filter === f ? '#fff' : C.muted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: C.muted, textAlign: 'center', padding: 20 }}>Loading orders…</p>}

      {!loading && orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ color: C.muted, margin: 0 }}>No orders found</p>
        </div>
      )}

      {orders.map(o => (
        <div key={o.id} style={{ ...s.card, padding: '13px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: NET[o.network]?.bg, border: `1.5px solid ${NET[o.network]?.bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: NET[o.network]?.txt, flexShrink: 0,
            }}>{NET[o.network]?.badge}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
                    {NET[o.network]?.label} {o.bundle_size}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '2px 0' }}>{o.phone}</p>
                  <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>
                    {o.ref} · {format(new Date(o.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>₵{o.amount}</p>
                  <span style={pill(o.status)}>{pillText(o.status)}</span>
                </div>
              </div>
              {o.status === 'failed' && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: C.err, margin: 0 }}>
                    This order failed. Contact admin on WhatsApp <a href="https://wa.me/233549358359" style={{ color: C.ok, fontWeight: 600 }}>0549358359</a> for a refund.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
