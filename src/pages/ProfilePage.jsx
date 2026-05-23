// src/pages/ProfilePage.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, st, grad, GH_PFX } from '../lib/styles'
import toast from 'react-hot-toast'

const validatePhone = (p) => {
  if (!p || p.length !== 10) return 'Must be exactly 10 digits'
  if (!/^\d{10}$/.test(p)) return 'Digits only'
  if (!GH_PFX.includes(p.slice(0, 3))) return 'Invalid Ghana carrier prefix'
  return ''
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [phoneErr, setPhoneErr] = useState('')
  const [saving, setSaving] = useState(false)

  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)

  const initials = (profile?.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const roleLbl = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'General'

  const handleSave = async (e) => {
    e.preventDefault()
    const err = validatePhone(phone)
    if (err) { setPhoneErr(err); return }
    setSaving(true)
    try {
      // Check phone uniqueness (exclude own record)
      if (phone !== profile.phone) {
        const { data: existing } = await supabase.from('profiles')
          .select('id').eq('phone', phone).neq('id', profile.id).single()
        if (existing) throw new Error('This phone number is already registered to another account.')
      }

      const { error } = await supabase.from('profiles')
        .update({ full_name: name, phone })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwdNew.length < 8) return toast.error('New password must be at least 8 characters')
    if (pwdNew !== pwdConfirm) return toast.error('Passwords do not match')
    setChangingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdNew })
      if (error) throw error
      toast.success('Password changed successfully!')
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center', padding: '18px 0' }}>
        <div style={{
          width: 70, height: 70, borderRadius: '50%', background: grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 auto 10px',
        }}>{initials}</div>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{profile?.full_name}</p>
        <span style={{
          display: 'inline-block', marginTop: 6,
          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          background: profile?.role === 'admin' ? 'rgba(124,58,237,.15)' : profile?.role === 'reseller' ? 'rgba(16,185,129,.12)' : 'rgba(107,130,168,.1)',
          color: profile?.role === 'admin' ? '#A78BFA' : profile?.role === 'reseller' ? C.ok : C.muted,
        }}>{roleLbl}</span>
      </div>

      {/* Edit profile */}
      <div style={s.card}>
        <h3 style={s.h3}>Edit Profile</h3>
        <form onSubmit={handleSave} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={s.input} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email <span style={{ color: C.dim, fontWeight: 400 }}>(cannot be changed)</span></label>
            <input value={profile?.email || ''} readOnly style={{ ...s.input, color: C.muted, cursor: 'not-allowed' }} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <div style={s.phonePfx}>🇬🇭 +233</div>
              <input
                value={phone}
                onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(v); setPhoneErr(v.length === 10 ? validatePhone(v) : '') }}
                placeholder="0549358359" maxLength={10}
                style={{ ...s.input, paddingLeft: 90, fontFamily: 'monospace', letterSpacing: '0.06em', borderColor: phoneErr ? C.err : C.bdr }}
              />
            </div>
            {phoneErr && <p style={s.errText}>⚠ {phoneErr}</p>}
          </div>
          <button type="submit" style={s.btnPrimary} disabled={saving || !!phoneErr}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Agent code */}
      <div style={s.card}>
        <h3 style={s.h3}>Your Agent Code</h3>
        <div style={{
          background: C.hi, border: `1px solid ${C.bdr}`, borderRadius: 10,
          padding: '11px 13px', fontFamily: 'monospace', fontSize: 16,
          fontWeight: 700, color: C.accent, letterSpacing: '0.08em',
        }}>{profile?.agent_code}</div>
        <p style={{ ...s.dimText, marginTop: 8 }}>Share this code with friends as your referral code.</p>
      </div>

      {/* Change password */}
      <div style={s.card}>
        <h3 style={s.h3}>Change Password</h3>
        <form onSubmit={handlePasswordChange} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'} value={pwdNew}
                onChange={e => setPwdNew(e.target.value)}
                placeholder="Min. 8 characters"
                style={{ ...s.input, paddingRight: 42 }} required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={s.eyeBtn}>{showPwd ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm New Password</label>
            <input
              type="password" value={pwdConfirm}
              onChange={e => setPwdConfirm(e.target.value)}
              placeholder="Repeat new password"
              style={s.input} required
            />
            {pwdConfirm && pwdNew !== pwdConfirm && <p style={s.errText}>Passwords do not match</p>}
          </div>
          <button type="submit" style={s.btnPrimary} disabled={changingPwd || pwdNew !== pwdConfirm || !pwdNew}>
            {changingPwd ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
