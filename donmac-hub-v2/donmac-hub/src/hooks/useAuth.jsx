import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, ADMIN_EMAIL } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile from DB
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    return data
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ─── Sign Up ──────────────────────────────────────────────
  const signUp = async ({ email, password, fullName, phone, referralCode }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { full_name: fullName },
      },
    })
    if (error) throw error

    // Create profile
    if (data.user) {
      let referredBy = null
      if (referralCode) {
        const { data: ref } = await supabase
          .from('profiles')
          .select('id')
          .eq('agent_code', referralCode.toUpperCase())
          .single()
        referredBy = ref?.id || null
      }

      const role = email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'general'

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        email: email.toLowerCase(),
        phone,
        role,
        referred_by: referredBy,
      })
      if (profileError) console.error('Profile creation error:', profileError)
    }

    return data
  }

  // ─── Sign In ──────────────────────────────────────────────
  const signIn = async ({ email, password, rememberMe }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: rememberMe ? {} : { expiresIn: 3600 * 8 },
    })
    if (error) throw error
    return data
  }

  // ─── Sign Out ─────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // ─── Resend Verification ──────────────────────────────────
  const resendVerification = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (error) throw error
  }

  // ─── Forgot Password ──────────────────────────────────────
  const forgotPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  // ─── Reset Password ───────────────────────────────────────
  const resetPassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // ─── Refresh profile ─────────────────────────────────────
  const refreshProfile = () => user && fetchProfile(user.id)

  const isAdmin = profile?.role === 'admin'
  const isReseller = profile?.role === 'reseller' || isAdmin

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin, isReseller,
      signUp, signIn, signOut,
      resendVerification, forgotPassword, resetPassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
