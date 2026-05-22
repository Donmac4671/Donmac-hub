// src/pages/CartPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { C, NET, st, grad } from '../lib/styles'
import { getCart, setCart } from './DashboardLayout'
import toast from 'react-hot-toast'

export default function CartPage() {
  const { profile, refreshProfile } = useAuth()
  const { placeOrder, loading } = useOrders()
  const navigate = useNavigate()
  const [cartItems, setCartItemsState] = useState(getCart())
  const [method, setMethod] = useState('wallet')
  const [placed, setPlaced] = useState(false)

  const removeItem = (idx) => {
    const updated = cartItems.filter((_, i) => i !== idx)
    setCart(updated)
    setCartItemsState(updated)
    window.dispatchEvent(new Event('cart_update'))
  }

  const total = cartItems.reduce((s, i) => s + parseFloat(i.price), 0)
  const fee = method === 'paystack' ? total * 0.02 : 0

  const handleOrder = async () => {
    if (method === 'wallet' && (profile?.wallet_balance || 0) < total + fee) {
      toast.error('Insufficient wallet balance. Please top up first.')
      return
    }

    try {
      for (const item of cartItems) {
        await placeOrder({
          bundleId: item.id,
          network: item.network,
          bundleSize: item.size,
          phone: item.phone,
          amount: parseFloat(item.price),
          paymentMethod: method,
        })
      }
      setCart([])
      setCartItemsState([])
      window.dispatchEvent(new Event('cart_update'))
      await refreshProfile()
      setPlaced(true)
    } catch {
      // error already shown by useOrders
    }
  }

  if (placed) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={s.h2}>Order Placed!</h2>
      <p style={{ ...s.mutedText, marginBottom: 8 }}>
        Your bundles are being processed. You will receive a notification when delivered.
      </p>
      <p style={{ ...s.dimText, marginBottom: 24 }}>
        Delivery usually takes 1–5 minutes.
      </p>
      <button onClick={() => navigate('/orders')} style={{ ...s.btnPrimary, maxWidth: 200, margin: '0 auto' }}>
        View Orders
      </button>
    </div>
  )

  if (!cartItems.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
      <h2 style={s.h2}>Your cart is empty</h2>
      <p style={{ ...s.mutedText, marginBottom: 24 }}>Add some data bundles to get started</p>
      <button onClick={() => navigate('/bundles')} style={{ ...s.btnPrimary, maxWidth: 200, margin: '0 auto' }}>
        Browse Bundles
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cart items */}
      {cartItems.map((item, i) => (
        <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: NET[item.network]?.bg,
            border: `1.5px solid ${NET[item.network]?.bdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: NET[item.network]?.txt, flexShrink: 0,
          }}>{NET[item.network]?.badge}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
              {NET[item.network]?.label} {item.size}
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: '2px 0' }}>→ {item.phone}</p>
            <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{item.validity}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>
              ₵{parseFloat(item.price).toFixed(2)}
            </p>
            <button
              onClick={() => removeItem(i)}
              style={{ background: 'none', border: 'none', color: C.err, fontSize: 11, cursor: 'pointer', fontWeight: 600, marginTop: 2 }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Payment method */}
      <div style={s.card}>
        <h3 style={s.h3}>Payment Method</h3>
        {[
          {
            id: 'wallet',
            title: `Wallet (₵${(profile?.wallet_balance || 0).toFixed(2)})`,
            sub: 'Instant · no fees',
          },
          {
            id: 'paystack',
            title: 'Paystack',
            sub: '2% processing fee applies',
          },
        ].map(m => (
          <div
            key={m.id}
            onClick={() => setMethod(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 13px', borderRadius: 11, marginBottom: 8, cursor: 'pointer',
              background: method === m.id ? C.glow : C.hi,
              border: `1.5px solid ${method === m.id ? C.accent : C.bdr}`,
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${method === m.id ? C.accent : C.dim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {method === m.id && (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent }} />
              )}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{m.title}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div style={{ ...s.card, padding: '15px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Subtotal</span>
          <span style={{ color: C.text, fontWeight: 600 }}>₵{total.toFixed(2)}</span>
        </div>
        {fee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Processing fee (2%)</span>
            <span style={{ color: C.warn, fontWeight: 600 }}>₵{fee.toFixed(2)}</span>
          </div>
        )}
        <div style={s.divider} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Total</span>
          <span style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>₵{(total + fee).toFixed(2)}</span>
        </div>

        {method === 'wallet' && (profile?.wallet_balance || 0) < total + fee && (
          <div style={{
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 12,
          }}>
            <p style={{ fontSize: 12, color: C.err, margin: 0 }}>
              ⚠ Your wallet balance (₵{(profile?.wallet_balance || 0).toFixed(2)}) is not enough.
              Please top up your wallet first.
            </p>
          </div>
        )}

        <button
          onClick={handleOrder}
          disabled={loading || (method === 'wallet' && (profile?.wallet_balance || 0) < total + fee)}
          style={s.btnPrimary}
        >
          {loading ? 'Processing…' : `Pay ₵${(total + fee).toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
