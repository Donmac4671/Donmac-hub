import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWallet } from '../hooks/useWallet'
import { C, grad, st, pill, pillText } from '../lib/styles'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth()
  const { loading, claimMomoTopup, initiatePaystack, fetchTransactions, fetchTopups } = useWallet()
  const [tab, setTab] = useState('topup')
  const [method, setMethod] = useState('paystack')
  const [amount, setAmount] = useState('')
  const [txId, setTxId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [topups, setTopups] = useState([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (tab === 'history') {
      setDataLoading(true)
      fetchTransactions().then(setTransactions).catch(()=>{}).finally(()=>setDataLoading(false))
    }
    if (tab === 'topups') {
      setDataLoading(true)
      fetchTopups().then(setTopups).catch(()=>{}).finally(()=>setDataLoading(false))
    }
  }, [tab])

  const handlePaystack = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt < 5) return toast.error('Minimum top-up is ₵5')
    if (profile.role === 'reseller' && amt < 20) return toast.error('Minimum top-up for resellers is ₵20')
    await initiatePaystack(amt)
  }

  const handleMomoClaim = async (e) => {
    e.preventDefault()
    if (!txId.trim()) return toast.error('Enter your MoMo Transaction ID')
    await claimMomoTopup(txId.trim())
    setTxId('')
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      {/* Balance card */}
      <div style={{background:grad, borderRadius:20, padding:22, textAlign:'center'}}>
        <p style={{fontSize:12, color:'rgba(255,255,255,.7)', margin:'0 0 6px'}}>Available Balance</p>
        <p style={{fontSize:34, fontWeight:900, color:'#fff', letterSpacing:'-0.02em', margin:0}}>
          ₵ {(profile?.wallet_balance || 0).toFixed(2)}
        </p>
        <p style={{fontSize:12, color:'rgba(255,255,255,.6)', margin:'6px 0 0'}}>
          {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)} · {profile?.agent_code}
        </p>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:8}}>
        {['topup','history','topups'].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1, padding:'9px', borderRadius:10,
              background:tab===t?C.glow:'transparent',
              border:`1px solid ${tab===t?'rgba(59,130,246,.3)':C.bdr}`,
              color:tab===t?C.accent:C.muted, fontWeight:tab===t?700:500, fontSize:12, cursor:'pointer'}}>
            {{topup:'Top Up', history:'History', topups:'Top-ups'}[t]}
          </button>
        ))}
      </div>

      {/* Top Up */}
      {tab === 'topup' && (
        <div style={s.card}>
          <h3 style={s.h3}>Add Funds to Wallet</h3>

          {/* Method toggle */}
          {['paystack','momo'].map(m => (
            <div key={m} onClick={()=>setMethod(m)}
              style={{display:'flex', alignItems:'center', gap:11, padding:'11px 13px', borderRadius:11, marginBottom:8, cursor:'pointer',
                background:method===m?C.glow:C.hi, border:`1.5px solid ${method===m?C.accent:C.bdr}`}}>
              <div style={{width:15, height:15, borderRadius:'50%', flexShrink:0, border:`2px solid ${method===m?C.accent:C.dim}`, display:'flex', alignItems:'center', justifyContent:'center'}}>
                {method===m && <div style={{width:7, height:7, borderRadius:'50%', background:C.accent}}/>}
              </div>
              <div>
                <p style={{fontSize:13, fontWeight:600, color:C.text, margin:0}}>{m==='paystack'?'Paystack (Card / Bank Transfer)':'Mobile Money (MoMo)'}</p>
                <p style={{fontSize:11, color:C.muted, margin:0}}>{m==='paystack'?'Instant · small processing fee':'Claim by entering Transaction ID from SMS'}</p>
              </div>
            </div>
          ))}

          {/* Paystack */}
          {method === 'paystack' && (
            <form onSubmit={handlePaystack} style={{marginTop:10, display:'flex', flexDirection:'column', gap:12}}>
              <div style={s.field}>
                <label style={s.label}>Amount (₵)</label>
                <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))}
                  placeholder={`Enter amount (min ₵${profile?.role==='reseller'?20:5})`}
                  style={{...s.input, fontSize:16}} required />
                <p style={s.dimText}>You will be redirected to Paystack to complete payment securely.</p>
              </div>
              <button type="submit" style={s.btnPrimary} disabled={loading}>
                {loading ? 'Redirecting…' : `Pay ₵${amount||'0'} via Paystack`}
              </button>
            </form>
          )}

          {/* MoMo */}
          {method === 'momo' && (
            <form onSubmit={handleMomoClaim} style={{marginTop:10, display:'flex', flexDirection:'column', gap:12}}>
              <div style={{background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.18)', borderRadius:12, padding:14}}>
                <p style={{fontSize:12, color:C.warn, fontWeight:700, margin:'0 0 8px'}}>📱 How to top up via MoMo</p>
                {[
                  <>Send money to <strong style={{color:C.text, fontFamily:'monospace'}}>0549358359</strong> (Osei Michael)</>,
                  <>You will receive a confirmation SMS containing your Transaction ID</>,
                  <>Enter that Transaction ID below and tap Claim Payment</>
                ].map((step, i) => (
                  <div key={i} style={{display:'flex', gap:9, marginBottom:7}}>
                    <div style={{width:19, height:19, borderRadius:'50%', background:C.glow, border:'1px solid rgba(59,130,246,.25)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:C.accent}}>{i+1}</div>
                    <p style={{fontSize:12, color:C.muted, lineHeight:1.5, margin:0}}>{step}</p>
                  </div>
                ))}
              </div>
              <div style={s.field}>
                <label style={s.label}>Transaction ID <span style={{color:C.dim, fontWeight:400}}>(from your SMS)</span></label>
                <input value={txId} onChange={e=>setTxId(e.target.value.trim())}
                  placeholder="e.g. A4829103847"
                  style={{...s.input, fontFamily:'monospace', letterSpacing:'0.05em'}} required />
                <p style={s.dimText}>The amount is automatically extracted — no need to enter it separately.</p>
              </div>
              <button type="submit" style={s.btnPrimary} disabled={loading || !txId.trim()}>
                {loading ? 'Submitting…' : 'Claim MoMo Payment'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Transaction History */}
      {tab === 'history' && (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {dataLoading ? <p style={{color:C.muted, textAlign:'center', padding:20}}>Loading…</p>
          : transactions.length === 0 ? <p style={{color:C.dim, textAlign:'center', padding:20}}>No transactions yet</p>
          : transactions.map(t => (
            <div key={t.id} style={{...s.card, display:'flex', alignItems:'center', gap:11}}>
              <div style={{width:34, height:34, borderRadius:'50%', flexShrink:0,
                background:t.type==='credit'?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>
                {t.type==='credit'?'↑':'↓'}
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:13, fontWeight:600, color:C.text, margin:0}}>{t.description || (t.type==='credit'?'Credit':'Debit')}</p>
                <p style={{fontSize:11, color:C.dim, margin:0}}>{t.reference} · {format(new Date(t.created_at), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <p style={{fontSize:14, fontWeight:800, color:t.type==='credit'?C.ok:C.err, margin:0, flexShrink:0}}>
                {t.type==='credit'?'+':'−'}₵{Math.abs(t.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Top-up History */}
      {tab === 'topups' && (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {dataLoading ? <p style={{color:C.muted, textAlign:'center', padding:20}}>Loading…</p>
          : topups.length === 0 ? <p style={{color:C.dim, textAlign:'center', padding:20}}>No top-ups yet</p>
          : topups.map(t => (
            <div key={t.id} style={{...s.card, display:'flex', alignItems:'center', gap:11}}>
              <div style={{width:34, height:34, borderRadius:'50%', flexShrink:0, background:C.glow, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>💳</div>
              <div style={{flex:1}}>
                <p style={{fontSize:13, fontWeight:600, color:C.text, margin:0}}>
                  {t.amount ? `₵${parseFloat(t.amount).toFixed(2)} ` : 'Pending amount · '} via {t.method === 'paystack' ? 'Paystack' : 'MoMo'}
                </p>
                <p style={{fontSize:11, color:C.dim, margin:0}}>{t.tx_id || t.paystack_ref} · {format(new Date(t.created_at), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <span style={pill(t.status)}>{pillText(t.status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
