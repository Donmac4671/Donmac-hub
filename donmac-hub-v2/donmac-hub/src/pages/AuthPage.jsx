import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { st, s, C, NET, GH_PFX } from '../lib/styles'

const validatePhone = (p) => {
  if (!p || p.length !== 10) return 'Must be exactly 10 digits'
  if (!/^\d{10}$/.test(p)) return 'Digits only, no spaces'
  if (!GH_PFX.includes(p.slice(0, 3))) return 'Invalid Ghana carrier prefix'
  return ''
}

export default function AuthPage() {
  const { signIn, signUp, forgotPassword, resendVerification } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('login') // login | register | forgot
  const [loading, setLoading] = useState(false)
  const [resentEmail, setResentEmail] = useState('')
  const [showResend, setShowResend] = useState(false)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [remember, setRemember] = useState(false)
  const [showLoginPass, setShowLoginPass] = useState(false)

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPhoneErr, setRegPhoneErr] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regRef, setRegRef] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [showRegConfirm, setShowRegConfirm] = useState(false)
  const [regDone, setRegDone] = useState(false)

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotDone, setForgotDone] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail || !loginPass) return toast.error('Please fill in all fields')
    setLoading(true)
    try {
      await signIn({ email: loginEmail, password: loginPass, rememberMe: remember })
      navigate('/dashboard')
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setShowResend(true)
        setResentEmail(loginEmail)
        toast.error('Please verify your email first.')
      } else if (err.message.includes('Invalid login')) {
        toast.error('Incorrect email or password.')
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const phoneErr = validatePhone(regPhone)
    if (phoneErr) { setRegPhoneErr(phoneErr); return }
    if (regPass !== regConfirm) return toast.error('Passwords do not match')
    if (regPass.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await signUp({ email: regEmail, password: regPass, fullName: regName, phone: regPhone, referralCode: regRef })
      setRegDone(true)
    } catch (err) {
      if (err.message.includes('already registered')) toast.error('This email is already registered.')
      else toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!forgotEmail) return toast.error('Enter your email address')
    setLoading(true)
    try {
      await forgotPassword(forgotEmail)
      setForgotDone(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async (email) => {
    setLoading(true)
    try {
      await resendVerification(email)
      toast.success('Verification email sent! Check your inbox.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Registration done screen ──────────────────────────────
  if (regDone) return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.iconCircle}>📧</div>
        <h2 style={s.h2}>Check your email</h2>
        <p style={s.mutedText}>We sent a verification link to</p>
        <p style={{...s.boldText, marginBottom:20}}>{regEmail}</p>
        <p style={{...s.dimText, marginBottom:24}}>Click the link to activate your account. Check spam if you don't see it.</p>
        <button style={s.btnOutline} onClick={() => handleResend(regEmail)} disabled={loading}>
          {loading ? 'Sending…' : 'Resend Verification Email'}
        </button>
        <button style={{...s.btnGhost, marginTop:10}} onClick={() => { setRegDone(false); setTab('login') }}>
          Back to Sign In
        </button>
      </div>
    </div>
  )

  // ── Forgot done screen ────────────────────────────────────
  if (forgotDone) return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.iconCircle}>📬</div>
        <h2 style={s.h2}>Reset link sent</h2>
        <p style={{...s.mutedText, marginBottom:20}}>Check your email at {forgotEmail} for a password reset link.</p>
        <button style={s.btnGhost} onClick={() => { setForgotDone(false); setTab('login') }}>Back to Sign In</button>
      </div>
    </div>
  )

  return (
    <div style={s.authWrap}>
      {/* Logo */}
      <div style={{textAlign:'center', marginBottom:28}}>
        <div style={s.logoBox}>D</div>
        <h1 style={s.logoTitle}>Donmac Data Hub</h1>
        <p style={s.logoSub}>Ghana's Cheapest MTN, Telecel & AirtelTigo Data</p>
        <div style={{display:'flex', justifyContent:'center', gap:6, marginTop:10, flexWrap:'wrap'}}>
          {Object.entries(NET).map(([k,n]) => (
            <span key={k} style={{fontSize:10, fontWeight:700, color:n.txt, background:n.bg, border:`1px solid ${n.bdr}`, padding:'2px 9px', borderRadius:20}}>{n.label.split(' ')[0]}</span>
          ))}
        </div>
      </div>

      <div style={s.authCard}>
        {/* Tab switcher */}
        {tab !== 'forgot' && (
          <div style={s.tabRow}>
            {['login','register'].map((t,i) => (
              <button key={t} onClick={() => setTab(t)} style={{...s.tab, ...(tab===t ? s.tabActive : {})}}>
                {i===0 ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}
                placeholder="you@example.com" style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={{position:'relative'}}>
                <input type={showLoginPass?'text':'password'} value={loginPass} onChange={e=>setLoginPass(e.target.value)}
                  placeholder="••••••••" style={{...s.input, paddingRight:42}} required />
                <button type="button" onClick={()=>setShowLoginPass(v=>!v)} style={s.eyeBtn}>
                  {showLoginPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{accentColor:C.accent}}/>
                <span style={{fontSize:13, color:C.muted}}>Remember me</span>
              </label>
              <button type="button" onClick={()=>setTab('forgot')} style={s.linkBtn}>Forgot password?</button>
            </div>

            {showResend && (
              <div style={s.infoBox}>
                <p style={{fontSize:12, color:C.muted, marginBottom:8}}>Did not receive your verification email?</p>
                <button type="button" onClick={()=>handleResend(resentEmail||loginEmail)} disabled={loading}
                  style={s.btnOutline}>
                  {loading ? 'Sending…' : 'Resend Verification Email'}
                </button>
              </div>
            )}

            {!showResend && (
              <div style={s.infoBox}>
                <p style={{fontSize:12, color:C.muted, marginBottom:8}}>Did not receive your verification email?</p>
                <button type="button" onClick={()=>setShowResend(true)} style={s.btnOutline}>
                  Resend Verification Email
                </button>
              </div>
            )}

            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Your full name" style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="you@example.com" style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone Number (Ghana — no country code)</label>
              <div style={{position:'relative'}}>
                <div style={s.phonePfx}>🇬🇭 +233</div>
                <input value={regPhone}
                  onChange={e=>{ const v=e.target.value.replace(/\D/g,'').slice(0,10); setRegPhone(v); setRegPhoneErr(v.length===10?validatePhone(v):'') }}
                  placeholder="0549358359" maxLength={10}
                  style={{...s.input, paddingLeft:90, fontFamily:'monospace', letterSpacing:'0.06em', borderColor:regPhoneErr?C.err:C.bdr}} />
              </div>
              {regPhoneErr && <p style={s.errText}>⚠ {regPhoneErr}</p>}
              <p style={s.dimText}>MTN: 024/025/053-055/059 · Telecel: 020/050 · Airtel: 026-028/056-057</p>
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={{position:'relative'}}>
                <input type={showRegPass?'text':'password'} value={regPass} onChange={e=>setRegPass(e.target.value)}
                  placeholder="Min. 8 characters" style={{...s.input, paddingRight:42}} required />
                <button type="button" onClick={()=>setShowRegPass(v=>!v)} style={s.eyeBtn}>{showRegPass?'🙈':'👁️'}</button>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <div style={{position:'relative'}}>
                <input type={showRegConfirm?'text':'password'} value={regConfirm} onChange={e=>setRegConfirm(e.target.value)}
                  placeholder="Repeat your password" style={{...s.input, paddingRight:42}} required />
                <button type="button" onClick={()=>setShowRegConfirm(v=>!v)} style={s.eyeBtn}>{showRegConfirm?'🙈':'👁️'}</button>
              </div>
              {regConfirm && regPass !== regConfirm && <p style={s.errText}>Passwords do not match</p>}
            </div>
            <div style={s.field}>
              <label style={s.label}>Referral Code <span style={{color:C.dim, fontWeight:400}}>(optional)</span></label>
              <input value={regRef} onChange={e=>setRegRef(e.target.value.toUpperCase())} placeholder="e.g. DMH1081ED"
                style={{...s.input, fontFamily:'monospace', letterSpacing:'0.06em'}} />
            </div>
            <div style={{...s.infoBox, borderColor:'rgba(245,158,11,.2)', background:'rgba(245,158,11,.06)'}}>
              <p style={{fontSize:11, color:C.warn}}>A verification email will be sent. You must verify before signing in.</p>
            </div>
            <button type="submit" style={s.btnPrimary} disabled={loading || !!regPhoneErr || regPass !== regConfirm}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot} style={s.form}>
            <h3 style={{fontSize:16, fontWeight:700, color:C.text, marginBottom:6}}>Reset your password</h3>
            <p style={{...s.mutedText, marginBottom:16}}>Enter your email and we'll send you a reset link.</p>
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}
                placeholder="you@example.com" style={s.input} required />
            </div>
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={()=>setTab('login')} style={s.btnGhost}>Back to Sign In</button>
          </form>
        )}
      </div>

      {/* Sample prices */}
      <div style={{width:'100%', maxWidth:400, marginTop:18}}>
        <p style={{...s.dimText, textAlign:'center', marginBottom:10, letterSpacing:'0.07em'}}>SAMPLE PRICES</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {[
            {net:'mtn', label:'MTN 1GB', price:'₵5.00', sub:'90 Days'},
            {net:'telecel', label:'Telecel 2GB', price:'₵11.00', sub:'Non-Expiry'},
            {net:'airtel_big', label:'AT Big 15GB', price:'₵60.00', sub:'90D / Non-Expiry'},
            {net:'airtel_premium', label:'AT Pro 1GB', price:'₵4.80', sub:'60 Days'},
          ].map(p => (
            <div key={p.net} style={{background:NET[p.net].bg, border:`1px solid ${NET[p.net].bdr}`, borderRadius:11, padding:'11px 13px'}}>
              <p style={{fontSize:11, color:NET[p.net].txt, fontWeight:600, margin:0}}>{p.label}</p>
              <p style={{fontSize:16, fontWeight:800, color:C.text, margin:'3px 0'}}>{p.price}</p>
              <p style={{fontSize:10, color:C.dim, margin:0}}>{p.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
