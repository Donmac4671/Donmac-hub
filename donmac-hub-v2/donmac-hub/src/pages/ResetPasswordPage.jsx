// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { st, s, C, grad } from '../lib/styles'

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await resetPassword(password)
      toast.success('Password updated successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.authWrap}>
      <div style={{...s.authCard, maxWidth:380}}>
        <div style={{textAlign:'center', marginBottom:20}}>
          <div style={s.logoBox}>D</div>
          <h2 style={s.h2}>Set New Password</h2>
          <p style={s.mutedText}>Choose a strong password for your account</p>
        </div>
        <form onSubmit={handleReset} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>New Password</label>
            <div style={{position:'relative'}}>
              <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Min. 8 characters" style={{...s.input, paddingRight:42}} required />
              <button type="button" onClick={()=>setShowPass(v=>!v)} style={s.eyeBtn}>{showPass?'🙈':'👁️'}</button>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <div style={{position:'relative'}}>
              <input type={showConfirm?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat password" style={{...s.input, paddingRight:42}} required />
              <button type="button" onClick={()=>setShowConfirm(v=>!v)} style={s.eyeBtn}>{showConfirm?'🙈':'👁️'}</button>
            </div>
            {confirm && password !== confirm && <p style={s.errText}>Passwords do not match</p>}
          </div>
          <button type="submit" style={s.btnPrimary} disabled={loading || password !== confirm}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
