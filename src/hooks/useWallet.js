import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

export function useWallet() {
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  // ─── Claim MoMo Top-up by Transaction ID ─────────────────
  const claimMomoTopup = async (txId) => {
    setLoading(true)
    try {
      // Check if txId already used
      const { data: existing } = await supabase
        .from('wallet_topups')
        .select('id, status')
        .eq('tx_id', txId)
        .single()

      if (existing) {
        if (existing.status === 'verified') throw new Error('This transaction ID has already been claimed.')
        if (existing.status === 'pending') throw new Error('This transaction is already submitted and awaiting verification.')
        throw new Error('This transaction ID has already been used.')
      }

      // Submit claim — admin will verify from SMS webhook data
      const { error } = await supabase.from('wallet_topups').insert({
        user_id: profile.id,
        method: 'momo',
        tx_id: txId,
        status: 'pending',
      })
      if (error) throw error

      toast.success('Claim submitted! Admin will verify and credit your wallet shortly.')
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // ─── Initiate Paystack Payment ────────────────────────────
  const initiatePaystack = async (amount) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { action: 'initialize', amount, email: profile.email, userId: profile.id },
      })
      if (error || data?.error) throw new Error(data?.error || 'Failed to initialize payment')
      // Redirect to Paystack checkout
      window.location.href = data.authorization_url
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // ─── Fetch Transactions ───────────────────────────────────
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  }

  // ─── Fetch Top-up History ─────────────────────────────────
  const fetchTopups = async () => {
    const { data, error } = await supabase
      .from('wallet_topups')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  return { loading, claimMomoTopup, initiatePaystack, fetchTransactions, fetchTopups }
}
