// src/pages/BundlesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { C, NET, st, grad, GH_PFX } from '../lib/styles'
import { getCart, setCart } from './DashboardLayout'
import toast from 'react-hot-toast'

const NET_TABS = [
  { key: 'mtn',            label: 'MTN'      },
  { key: 'telecel',        label: 'Telecel'  },
  { key: 'airtel_big',     label: 'AT Big'   },
  { key: 'airtel_premium', label: 'AT Pro'   },
]

function validatePhone(p) {
  if (!p || p.length !== 10) return 'Must be exactly 10 digits'
  if (!/^\d{10}$/.test(p)) return 'Digits only'
  if (!GH_PFX.includes(p.slice(0, 3))) return 'Invalid Ghana carrier prefix'
  return ''
}

export default function BundlesPage() {
  const navigate = useNavigate()
  const [activeNet, setActiveNet] = useState('mtn')
  const [bundles, setBundles] = useState({})
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [phoneErr, setPhoneErr] = useState('')
  const [cartItems, setCartItemsState] = useState(getCart())

  // Load visible bundles from Supabase
  useEffect(() => {
    supabase
      .from('bundles')
      .select('*')
      .eq('visible', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) { toast.error('Failed to load bundles'); return }
        const grouped = {}
        ;(data || []).forEach(b => {
          if (!grouped[b.network]) grouped[b.network] = []
          grouped[b.network].push(b)
        })
        setBundles(grouped)
        setLoading(false)
      })
  }, [])

  const onPhoneChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    setPhoneErr(digits.length === 10 ? validatePhone(digits) : '')
  }

  const addToCart = (bundle) => {
    const err = validatePhone(phone)
    if (err) { setPhoneErr(err || 'Enter a valid Ghana phone number'); return }

    const current = getCart()
    const alreadyIn = current.some(item => item.id === bundle.id && item.phone === phone)
    if (alreadyIn) { toast('Already in cart', { icon: 'ℹ️' }); return }

    const updated = [...current, { ...bundle, phone, network: activeNet }]
    setCart(updated)
    setCartItemsState(updated)
    window.dispatchEvent(new Event('cart_update'))
    toast.success(`${bundle.size} added to cart`)
  }

  const isInCart = (bundle) => cartItems.some(item => item.id === bundle.id && item.phone === phone)

  const currentNetwork = NET[activeNet]
  const currentBundles = bundles[activeNet] || []

  const validityLabel = {
    mtn: '90 Days',
    telecel: 'Non-Expiry',
    airtel_big: '90 Days / Non-Expiry',
    airtel_premium: '60 Days',
  }[activeNet]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Phone input */}
      <div style={st.card}>
        <label style={st.label}>Recipient Phone Number (Ghana, no country code)</label>
        <div style={{ position: 'relative' }}>
          <div style={st.phonePfx}>🇬🇭 +233</div>
          <input
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
            placeholder="0549358359"
            maxLength={10}
            style={{
              ...st.input,
              paddingLeft: 90,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              borderColor: phoneErr ? C.err : C.bdr,
            }}
          />
        </div>
        {phoneErr
          ? <p style={st.errText}>⚠ {phoneErr}</p>
          : <p style={st.dimText}>MTN: 024/025/053–055/059 · Telecel: 020/050 · Airtel: 026–028/056–057</p>
        }
      </div>

      {/* Network tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {NET_TABS.map(({ key, label }) => {
          const isActive = activeNet === key
          return (
            <button
              key={key}
              onClick={() => setActiveNet(key)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                background: isActive ? NET[key].bg : 'transparent',
                border: `1.5px solid ${isActive ? NET[key].bdr : C.bdr}`,
                color: isActive ? NET[key].txt : C.muted,
                fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Network header */}
      <div style={{
        background: currentNetwork.bg,
        border: `1px solid ${currentNetwork.bdr}`,
        borderRadius: 12, padding: '9px 13px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: currentNetwork.bg, border: `1.5px solid ${currentNetwork.bdr}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: currentNetwork.txt, flexShrink: 0,
        }}>{currentNetwork.badge}</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: currentNetwork.txt, margin: 0 }}>
            {currentNetwork.label}
          </p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
            Validity: {validityLabel} · {currentBundles.length} packages available
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <p style={{ color: C.muted, textAlign: 'center', padding: 30 }}>Loading bundles…</p>
      )}

      {/* Empty state */}
      {!loading && currentBundles.length === 0 && (
        <p style={{ color: C.dim, textAlign: 'center', padding: 30 }}>
          No bundles available for this network right now.
        </p>
      )}

      {/* Bundle list */}
      {currentBundles.map(bundle => {
        const inCart = isInCart(bundle)
        return (
          <div
            key={bundle.id}
            style={{
              ...st.card,
              display: 'flex', alignItems: 'center', gap: 11,
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: currentNetwork.bg, border: `1.5px solid ${currentNetwork.bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: currentNetwork.txt, flexShrink: 0,
            }}>{currentNetwork.badge}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>{bundle.size}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{bundle.validity}</p>
            </div>

            <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0, flexShrink: 0 }}>
              ₵{parseFloat(bundle.price).toFixed(2)}
            </p>

            <button
              onClick={() => addToCart(bundle)}
              disabled={inCart}
              style={{
                background: inCart ? 'rgba(16,185,129,.12)' : grad,
                border: 'none', borderRadius: 10,
                color: inCart ? C.ok : '#fff',
                padding: '9px 14px', fontWeight: 700, fontSize: 16,
                cursor: inCart ? 'default' : 'pointer',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, transition: 'all .15s',
              }}
            >
              {inCart ? '✓' : '+'}
            </button>
          </div>
        )
      })}

      {/* View cart hint if items added */}
      {cartItems.length > 0 && (
        <div style={{
          background: C.glow, border: '1px solid rgba(59,130,246,.2)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 13, color: C.accent, fontWeight: 600, margin: 0 }}>
            {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in cart
          </p>
          <button
            onClick={() => navigate('/cart')}
            style={{
              background: grad, border: 'none', borderRadius: 9,
              color: '#fff', fontWeight: 700, fontSize: 13,
              padding: '7px 16px', cursor: 'pointer',
            }}
          >
            View Cart →
          </button>
        </div>
      )}
    </div>
  )
}
