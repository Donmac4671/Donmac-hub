import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

export function useOrders() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)

  // ─── Place Order ──────────────────────────────────────────
  const placeOrder = async ({ bundleId, network, bundleSize, phone, amount, paymentMethod }) => {
    setLoading(true)
    try {
      if (paymentMethod === 'wallet' && profile.wallet_balance < amount) {
        throw new Error(`Insufficient wallet balance. Your balance is ₵${profile.wallet_balance.toFixed(2)}.`)
      }

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          network,
          bundle_id: bundleId,
          bundle_size: bundleSize,
          phone,
          amount,
          payment_method: paymentMethod,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // Call GHDataConnect via Edge Function
      const { data: fulfillResult, error: fnErr } = await supabase.functions.invoke('ghconnect-order', {
        body: { orderId: order.id, network, bundleSize, phone, amount },
      })

      if (fnErr || fulfillResult?.error) {
        // Mark order as failed
        await supabase.from('orders').update({ status: 'failed' }).eq('id', order.id)
        throw new Error(fulfillResult?.error || 'Order fulfillment failed. Please contact support.')
      }

      toast.success('Order placed successfully!')
      return order
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // ─── Fetch My Orders ──────────────────────────────────────
  const fetchOrders = async ({ status } = {}) => {
    let q = supabase
      .from('orders')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (status && status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data
  }

  return { loading, placeOrder, fetchOrders }
}
