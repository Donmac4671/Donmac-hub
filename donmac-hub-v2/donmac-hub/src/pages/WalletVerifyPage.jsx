import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { st, s, C } from '../lib/styles'
import toast from 'react-hot-toast'

export default function WalletVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    const ref = params.get('ref') || params.get('reference') || params.get('trxref')
    if (!ref) { setStatus('error'); return }

    supabase.functions.invoke('paystack-verify', {
      body: { action: 'verify', reference: ref }
    }).then(({ data, error }) => {
      if (error || data?.error) {
        setStatus('error')
        toast.error('Payment verification failed.')
      } else {
        setStatus('success')
        toast.success(`Wallet credited with ₵${data.amount}!`)
        setTimeout(() => navigate('/wallet'), 2500)
      }
    })
  }, [])

  return (
    <div style={{...s.authWrap, paddingTop:0}}>
      <div style={{...s.authCard, textAlign:'center', maxWidth:360}}>
        {status === 'verifying' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>⏳</div>
            <h2 style={s.h2}>Verifying payment…</h2>
            <p style={s.mutedText}>Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>✅</div>
            <h2 style={s.h2}>Payment Successful!</h2>
            <p style={s.mutedText}>Your wallet has been credited. Redirecting…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>❌</div>
            <h2 style={s.h2}>Verification Failed</h2>
            <p style={{...s.mutedText, marginBottom:16}}>Payment could not be verified. Contact admin if you were charged.</p>
            <a href="https://wa.me/233549358359" style={{display:'block', marginBottom:10, color:C.ok, textDecoration:'none', fontWeight:600}}>Contact Admin on WhatsApp</a>
            <button onClick={()=>navigate('/wallet')} style={s.btnPrimary}>Back to Wallet</button>
          </>
        )}
      </div>
    </div>
  )
}
