import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { st, s, C } from '../lib/styles'

export default function ConfirmPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | error

  useEffect(() => {
    // Supabase handles the token exchange automatically from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      } else if (event === 'TOKEN_REFRESHED') {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      }
    })

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      } else {
        // Give it a moment for token exchange
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s2 } }) => {
            if (s2) { setStatus('success'); setTimeout(() => navigate('/dashboard'), 2000) }
            else setStatus('error')
          })
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div style={s.authWrap}>
      <div style={{...s.authCard, textAlign:'center', maxWidth:360}}>
        {status === 'verifying' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>⏳</div>
            <h2 style={s.h2}>Verifying your email…</h2>
            <p style={s.mutedText}>Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>✅</div>
            <h2 style={s.h2}>Email Verified!</h2>
            <p style={s.mutedText}>Your account is active. Redirecting to dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{fontSize:48, marginBottom:16}}>❌</div>
            <h2 style={s.h2}>Verification Failed</h2>
            <p style={{...s.mutedText, marginBottom:16}}>The link may have expired. Please request a new one.</p>
            <button onClick={() => navigate('/auth')} style={s.btnPrimary}>Back to Sign In</button>
          </>
        )}
      </div>
    </div>
  )
}
