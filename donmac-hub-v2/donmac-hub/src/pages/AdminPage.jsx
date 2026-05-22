// src/pages/AdminPage.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { C, NET, st, s, grad, pill, pillText } from '../lib/styles'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TABS = ['overview', 'orders', 'bundles', 'users', 'topups', 'webhook', 'resellers', 'chat']

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [topups, setTopups] = useState([])
  const [bundles, setBundles] = useState({})
  const [resellerApps, setResellerApps] = useState([])
  const [smsLog, setSmsLog] = useState([])

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*, user:user_id(full_name, email)').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('wallet_topups').select('*, user:user_id(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('bundles').select('*').order('network').order('sort_order'),
      supabase.from('reseller_applications').select('*, user:user_id(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('sms_webhook_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]).then(([oRes, uRes, tRes, bRes, rRes, sRes]) => {
      setOrders(oRes.data || [])
      setUsers(uRes.data || [])
      setTopups(tRes.data || [])
      const grp = {}
      ;(bRes.data || []).forEach(b => { if (!grp[b.network]) grp[b.network] = []; grp[b.network].push(b) })
      setBundles(grp)
      setResellerApps(rRes.data || [])
      setSmsLog(sRes.data || [])
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 13px', borderRadius: 20, whiteSpace: 'nowrap',
            background: tab === t ? C.accent : C.hi,
            border: `1px solid ${tab === t ? C.accent : C.bdr}`,
            color: tab === t ? '#fff' : C.muted,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview orders={orders} users={users} topups={topups} />}
      {tab === 'orders' && <AdminOrders orders={orders} setOrders={setOrders} />}
      {tab === 'bundles' && <AdminBundles bundles={bundles} setBundles={setBundles} />}
      {tab === 'users' && <AdminUsers users={users} setUsers={setUsers} />}
      {tab === 'topups' && <AdminTopups topups={topups} setTopups={setTopups} users={users} />}
      {tab === 'webhook' && <AdminWebhook smsLog={smsLog} setSmsLog={setSmsLog} topups={topups} setTopups={setTopups} />}
      {tab === 'resellers' && <AdminResellers apps={resellerApps} setApps={setResellerApps} />}
      {tab === 'chat' && <AdminChat users={users} />}
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function AdminOverview({ orders, users, topups }) {
  const revenue = orders.filter(o => ['completed','processing'].includes(o.status)).reduce((s, o) => s + parseFloat(o.amount), 0)
  const pendingTopups = topups.filter(t => t.status === 'pending').length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Total Revenue', value: `₵${revenue.toFixed(2)}`, icon: '📈', tint: 'rgba(16,185,129,.12)' },
          { label: 'Total Users', value: users.length, icon: '👥', tint: C.glow },
          { label: 'Total Orders', value: orders.length, icon: '📦', tint: 'rgba(245,158,11,.12)' },
          { label: 'Pending Top-ups', value: pendingTopups, icon: '⏳', tint: 'rgba(239,68,68,.1)' },
        ].map(item => (
          <div key={item.label} style={{ ...s.card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 5px' }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{item.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: item.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.icon}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {[
          { l: 'Delivered', v: orders.filter(o => o.status === 'completed').length, col: C.ok },
          { l: 'Processing', v: orders.filter(o => o.status === 'processing').length, col: C.warn },
          { l: 'Pending', v: orders.filter(o => ['pending','waiting'].includes(o.status)).length, col: '#818CF8' },
          { l: 'Failed', v: orders.filter(o => o.status === 'failed').length, col: C.err },
        ].map(x => (
          <div key={x.l} style={{ background: C.hi, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: x.col, margin: 0 }}>{x.v}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{x.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Orders ────────────────────────────────────────────────────
function AdminOrders({ orders, setOrders }) {
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const saveStatus = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', editing.id)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === editing.id ? { ...o, status: newStatus } : o))
      toast.success('Order status updated')
      setEditing(null)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const list = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, borderRadius: 20, width: '100%', maxWidth: 360, padding: 24 }}>
            <h3 style={s.h3}>Update Order Status</h3>
            <p style={{ ...s.mutedText, marginBottom: 4 }}>{editing.ref} · {NET[editing.network]?.label} {editing.bundle_size}</p>
            <p style={{ ...s.dimText, marginBottom: 14 }}>Current: <span style={pill(editing.status)}>{pillText(editing.status)}</span></p>
            <label style={s.label}>New Status</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...s.select, marginBottom: 16 }}>
              {['waiting','pending','processing','completed','failed'].map(x => (
                <option key={x} value={x}>{x.charAt(0).toUpperCase() + x.slice(1)}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveStatus} disabled={saving || newStatus === editing.status} style={{ ...s.btnPrimary, flex: 1 }}>
                {saving ? 'Saving…' : 'Save Status'}
              </button>
              <button onClick={() => setEditing(null)} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {['all', 'waiting', 'pending', 'processing', 'completed', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap',
            background: filter === f ? C.accent : C.hi, border: `1px solid ${filter === f ? C.accent : C.bdr}`,
            color: filter === f ? '#fff' : C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {list.map(o => (
        <div key={o.id} style={{ ...s.card, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: NET[o.network]?.bg, border: `1.5px solid ${NET[o.network]?.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: NET[o.network]?.txt, flexShrink: 0 }}>{NET[o.network]?.badge}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{o.user?.full_name || 'Unknown'} · {o.bundle_size}</p>
              <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{o.ref} · {o.phone} · {format(new Date(o.created_at), 'dd MMM, HH:mm')}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>₵{o.amount}</p>
              <span style={pill(o.status)}>{pillText(o.status)}</span>
              <br />
              <button onClick={() => { setEditing(o); setNewStatus(o.status) }} style={{ ...s.btnSm, marginTop: 4, padding: '3px 8px', fontSize: 10 }}>
                ✏️ Status
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Bundles ───────────────────────────────────────────────────
function AdminBundles({ bundles, setBundles }) {
  const NET_TABS = [{ key: 'mtn', label: 'MTN' }, { key: 'telecel', label: 'Telecel' }, { key: 'airtel_big', label: 'AT Big' }, { key: 'airtel_premium', label: 'AT Pro' }]
  const [activeNet, setActiveNet] = useState('mtn')
  const [editing, setEditing] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newB, setNewB] = useState({ size: '', validity: '', price: '' })
  const [saving, setSaving] = useState(false)

  const toggle = async (id, current) => {
    const { error } = await supabase.from('bundles').update({ visible: !current }).eq('id', id)
    if (!error) setBundles(prev => ({ ...prev, [activeNet]: prev[activeNet].map(b => b.id === id ? { ...b, visible: !current } : b) }))
  }

  const deleteBundle = async (id) => {
    if (!window.confirm('Delete this bundle?')) return
    const { error } = await supabase.from('bundles').delete().eq('id', id)
    if (!error) setBundles(prev => ({ ...prev, [activeNet]: prev[activeNet].filter(b => b.id !== id) }))
    else toast.error(error.message)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('bundles')
        .update({ size: editing.size, validity: editing.validity, price: parseFloat(editing.price) })
        .eq('id', editing.id)
      if (error) throw error
      setBundles(prev => ({ ...prev, [activeNet]: prev[activeNet].map(b => b.id === editing.id ? { ...b, ...editing } : b) }))
      toast.success('Bundle updated')
      setEditing(null)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const addBundle = async () => {
    if (!newB.size || !newB.validity || !newB.price) return toast.error('Fill all fields')
    setSaving(true)
    try {
      const { data, error } = await supabase.from('bundles').insert({
        network: activeNet, size: newB.size, validity: newB.validity,
        price: parseFloat(newB.price), visible: true, sort_order: 999,
      }).select().single()
      if (error) throw error
      setBundles(prev => ({ ...prev, [activeNet]: [...(prev[activeNet] || []), data] }))
      toast.success('Bundle added')
      setNewB({ size: '', validity: '', price: '' })
      setShowAdd(false)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const list = bundles[activeNet] || []

  const Modal = ({ title, onClose, children }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, borderRadius: 20, width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ ...s.h3, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {editing && (
        <Modal title="Edit Bundle" onClose={() => setEditing(null)}>
          {[{ key: 'size', label: 'Size (e.g. 5GB)' }, { key: 'validity', label: 'Validity' }, { key: 'price', label: 'Price (₵)', type: 'number' }].map(f => (
            <div key={f.key} style={{ ...s.field, marginBottom: 12 }}>
              <label style={s.label}>{f.label}</label>
              <input type={f.type || 'text'} value={editing[f.key]} onChange={e => setEditing(v => ({ ...v, [f.key]: e.target.value }))} style={s.input} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveEdit} disabled={saving} style={{ ...s.btnPrimary, flex: 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(null)} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}
      {showAdd && (
        <Modal title={`Add ${NET[activeNet]?.label} Bundle`} onClose={() => setShowAdd(false)}>
          {[{ key: 'size', label: 'Size (e.g. 5GB)' }, { key: 'validity', label: 'Validity (e.g. 90 Days)' }, { key: 'price', label: 'Price (₵)', type: 'number' }].map(f => (
            <div key={f.key} style={{ ...s.field, marginBottom: 12 }}>
              <label style={s.label}>{f.label}</label>
              <input type={f.type || 'text'} value={newB[f.key]} onChange={e => setNewB(v => ({ ...v, [f.key]: e.target.value }))} style={s.input} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addBundle} disabled={saving} style={{ ...s.btnPrimary, flex: 1 }}>{saving ? 'Adding…' : 'Add Bundle'}</button>
            <button onClick={() => setShowAdd(false)} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {NET_TABS.map(({ key, label }) => {
          const a = activeNet === key
          return <button key={key} onClick={() => setActiveNet(key)} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 10, background: a ? NET[key].bg : 'transparent', border: `1.5px solid ${a ? NET[key].bdr : C.bdr}`, color: a ? NET[key].txt : C.muted, fontWeight: a ? 700 : 500, fontSize: 12, cursor: 'pointer' }}>{label}</button>
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(true)} style={s.btnSm}>+ Add Package</button>
      </div>

      {list.map(b => (
        <div key={b.id} style={{ ...s.card, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, opacity: b.visible ? 1 : 0.5 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: NET[activeNet].bg, border: `1.5px solid ${NET[activeNet].bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: NET[activeNet].txt, flexShrink: 0 }}>{NET[activeNet].badge}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{b.size}</p>
            <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{b.validity}</p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, flexShrink: 0 }}>₵{parseFloat(b.price).toFixed(2)}</p>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => toggle(b.id, b.visible)} style={{ background: b.visible ? 'rgba(16,185,129,.1)' : 'rgba(107,130,168,.1)', border: `1px solid ${b.visible ? 'rgba(16,185,129,.25)' : C.bdr}`, borderRadius: 7, padding: '4px 9px', fontSize: 11, fontWeight: 600, color: b.visible ? C.ok : C.muted, cursor: 'pointer' }}>{b.visible ? 'Visible' : 'Hidden'}</button>
            <button onClick={() => setEditing({ ...b })} style={{ background: C.glow, border: '1px solid rgba(59,130,246,.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer' }}>✏️</button>
            <button onClick={() => deleteBundle(b.id)} style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer' }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────
function AdminUsers({ users, setUsers }) {
  const [selected, setSelected] = useState(null)
  const [txType, setTxType] = useState('credit')
  const [txAmt, setTxAmt] = useState('')
  const [newRole, setNewRole] = useState('')
  const [saving, setSaving] = useState(false)

  const applyWallet = async () => {
    if (!txAmt || isNaN(parseFloat(txAmt))) return
    setSaving(true)
    const amt = parseFloat(txAmt)
    try {
      const newBal = txType === 'credit' ? selected.wallet_balance + amt : Math.max(0, selected.wallet_balance - amt)
      const { error } = await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', selected.id)
      if (error) throw error
      await supabase.from('transactions').insert({ user_id: selected.id, type: txType, amount: amt, description: `Admin ${txType}`, balance_after: newBal })
      await supabase.from('notifications').insert({ user_id: selected.id, title: `Wallet ${txType === 'credit' ? 'Credited' : 'Debited'}`, body: `₵${amt.toFixed(2)} has been ${txType === 'credit' ? 'added to' : 'removed from'} your wallet by admin.`, type: txType === 'credit' ? 'success' : 'info' })
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, wallet_balance: newBal } : u))
      toast.success(`Wallet ${txType}ed successfully`)
      setSelected(null); setTxAmt('')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const applyRole = async () => {
    if (!newRole) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', selected.id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, role: newRole } : u))
      toast.success('Role updated')
      setSelected(null); setNewRole('')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, borderRadius: 20, width: '100%', maxWidth: 400, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ ...s.h3, margin: 0 }}>Manage — {selected.full_name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ ...s.cardSm, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px' }}>Current Wallet Balance</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>₵{selected.wallet_balance.toFixed(2)}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>{selected.role} · {selected.email}</p>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Wallet Adjustment</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['credit', 'debit'].map(t => (
                <button key={t} onClick={() => setTxType(t)} style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontWeight: txType === t ? 700 : 500, fontSize: 13,
                  background: txType === t ? (t === 'credit' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)') : 'transparent',
                  border: `1px solid ${txType === t ? (t === 'credit' ? 'rgba(16,185,129,.28)' : 'rgba(239,68,68,.28)') : C.bdr}`,
                  color: txType === t ? (t === 'credit' ? C.ok : C.err) : C.muted,
                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <input value={txAmt} onChange={e => setTxAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Enter amount (₵)" style={{ ...s.input, marginBottom: 10 }} />
            <button onClick={applyWallet} disabled={saving || !txAmt} style={{ ...s.btnPrimary, marginBottom: 16 }}>
              {saving ? 'Applying…' : `${txType === 'credit' ? 'Credit' : 'Debit'} Wallet`}
            </button>

            <div style={{ height: 1, background: C.bdr, margin: '0 0 16px' }} />
            <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Change User Role</h4>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...s.select, marginBottom: 10 }}>
              <option value="">Select role…</option>
              {['general', 'reseller', 'admin'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <button onClick={applyRole} disabled={saving || !newRole || newRole === selected.role} style={s.btnPrimary}>
              {saving ? 'Updating…' : 'Update Role'}
            </button>
          </div>
        </div>
      )}

      {users.map(u => {
        const initials = u.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        return (
          <div key={u.id} style={{ ...s.card, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{u.full_name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: u.role === 'admin' ? 'rgba(124,58,237,.15)' : u.role === 'reseller' ? 'rgba(16,185,129,.12)' : 'rgba(107,130,168,.1)', color: u.role === 'admin' ? '#A78BFA' : u.role === 'reseller' ? C.ok : C.muted }}>{u.role}</span>
                </div>
                <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{u.email} · {u.phone}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Balance: <strong style={{ color: C.text }}>₵{u.wallet_balance?.toFixed(2)}</strong> · {u.agent_code}</p>
              </div>
              <button onClick={() => { setSelected(u); setNewRole(u.role) }} style={{ ...s.btnSm, flexShrink: 0 }}>⚙️ Manage</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Top-ups ───────────────────────────────────────────────────
function AdminTopups({ topups, setTopups, users }) {
  const [showManual, setShowManual] = useState(false)
  const [mUser, setMUser] = useState('')
  const [mTxId, setMTxId] = useState('')
  const [mAmt, setMAmt] = useState('')
  const [mNet, setMNet] = useState('mtn')
  const [saving, setSaving] = useState(false)

  const approve = async (id) => {
    const { error } = await supabase.from('wallet_topups').update({ status: 'verified' }).eq('id', id)
    if (!error) { setTopups(prev => prev.map(t => t.id === id ? { ...t, status: 'verified' } : t)); toast.success('Top-up approved') }
    else toast.error(error.message)
  }

  const reject = async (id) => {
    const { error } = await supabase.from('wallet_topups').update({ status: 'rejected' }).eq('id', id)
    if (!error) { setTopups(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' } : t)); toast.success('Top-up rejected') }
  }

  const addManual = async () => {
    if (!mTxId || !mAmt || !mUser) return toast.error('Fill all fields')
    setSaving(true)
    try {
      const user = users.find(u => u.id === mUser)
      const { data, error } = await supabase.from('wallet_topups').insert({
        user_id: mUser, amount: parseFloat(mAmt), method: 'momo', tx_id: mTxId, network: mNet, status: 'pending',
      }).select().single()
      if (error) throw error
      setTopups(prev => [{ ...data, user }, ...prev])
      toast.success('Manual top-up entry added')
      setShowManual(false); setMTxId(''); setMAmt(''); setMUser('')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {showManual && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, borderRadius: 20, width: '100%', maxWidth: 380, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ ...s.h3, margin: 0 }}>Manual Top-up Entry</h3>
              <button onClick={() => setShowManual(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <label style={s.label}>User</label>
            <select value={mUser} onChange={e => setMUser(e.target.value)} style={{ ...s.select, marginBottom: 12 }}>
              <option value="">Select user…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
            </select>
            <label style={s.label}>Transaction ID (from MoMo SMS)</label>
            <input value={mTxId} onChange={e => setMTxId(e.target.value)} placeholder="e.g. A4829103847" style={{ ...s.input, fontFamily: 'monospace', marginBottom: 12 }} />
            <label style={s.label}>Amount (₵)</label>
            <input value={mAmt} onChange={e => setMAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" style={{ ...s.input, marginBottom: 12 }} />
            <label style={s.label}>Network</label>
            <select value={mNet} onChange={e => setMNet(e.target.value)} style={{ ...s.select, marginBottom: 16 }}>
              {Object.entries(NET).map(([k, n]) => <option key={k} value={k}>{n.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addManual} disabled={saving} style={{ ...s.btnPrimary, flex: 1 }}>{saving ? 'Adding…' : 'Add Entry'}</button>
              <button onClick={() => setShowManual(false)} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowManual(true)} style={s.btnSm}>+ Manual Entry</button>
      </div>
      {topups.map(t => (
        <div key={t.id} style={{ ...s.card, padding: '13px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: t.status === 'pending' ? 10 : 0 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{t.user?.full_name || 'Unmatched'} {t.amount ? `· ₵${parseFloat(t.amount).toFixed(2)}` : ''}</p>
              <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{t.tx_id || t.paystack_ref} · {format(new Date(t.created_at), 'dd MMM, HH:mm')}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Method: {t.method}{t.network ? ` · ${NET[t.network]?.label}` : ''}</p>
            </div>
            <span style={pill(t.status)}>{pillText(t.status)}</span>
          </div>
          {t.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => approve(t.id)} style={{ flex: 1, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 9, padding: '8px', color: C.ok, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Approve</button>
              <button onClick={() => reject(t.id)} style={{ flex: 1, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 9, padding: '8px', color: C.err, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✕ Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Webhook Log ───────────────────────────────────────────────
function AdminWebhook({ smsLog, setSmsLog, topups, setTopups }) {
  const [testSms, setTestSms] = useState('')
  const webhookUrl = `${window.location.origin.replace('http://localhost:3000', 'https://YOUR_PROJECT.supabase.co')}/functions/v1/sms-webhook`

  const simulate = async () => {
    if (!testSms.trim()) return
    const { data } = await supabase.functions.invoke('sms-webhook', { body: { message: testSms } })
    if (data?.success) {
      toast.success(`Parsed: TX=${data.parsed.txId}, Amount=₵${data.parsed.amount}`)
      const { data: logs } = await supabase.from('sms_webhook_log').select('*').order('created_at', { ascending: false }).limit(50)
      setSmsLog(logs || [])
    } else {
      toast.error('Could not parse SMS')
    }
    setTestSms('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={s.card}>
        <h3 style={s.h3}>SMS Forwarder Webhook</h3>
        <p style={{ ...s.mutedText, marginBottom: 12 }}>Configure your SMS forwarder app (e.g. SMS Forwarder on Android) to POST incoming MoMo SMS messages to this webhook URL:</p>
        <div style={{ background: C.hi, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: '10px 13px', fontFamily: 'monospace', fontSize: 11, color: C.accent, wordBreak: 'break-all', marginBottom: 12 }}>
          https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook
        </div>
        <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.17)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 12, color: C.warn, fontWeight: 700, margin: '0 0 6px' }}>📱 SMS Forwarder Settings</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Set filter to SMS from your MoMo provider. POST body should be JSON with a "message" field containing the raw SMS text. The webhook auto-extracts Transaction ID, amount, and network.</p>
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.h3}>Test SMS Parser</h3>
        <textarea value={testSms} onChange={e => setTestSms(e.target.value)} placeholder="Paste a MoMo SMS message here to test parsing…" style={{ ...s.textarea, marginBottom: 10 }} />
        <button onClick={simulate} disabled={!testSms.trim()} style={s.btnSm}>🔍 Simulate Webhook</button>
      </div>

      <div style={s.card}>
        <h3 style={s.h3}>Incoming SMS Log ({smsLog.length})</h3>
        {smsLog.length === 0 && <p style={{ color: C.dim, textAlign: 'center', padding: 16 }}>No SMS received yet</p>}
        {smsLog.map(l => (
          <div key={l.id} style={{ ...s.cardSm, marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: C.dim, margin: '0 0 6px' }}>{format(new Date(l.created_at), 'dd MMM yyyy, HH:mm')}</p>
            <p style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', margin: '0 0 8px', lineHeight: 1.5 }}>"{l.raw_message}"</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {l.parsed_tx_id && <span style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: C.accent, fontFamily: 'monospace' }}>TX: {l.parsed_tx_id}</span>}
              {l.parsed_amount && <span style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: C.ok }}>₵{l.parsed_amount}</span>}
              {l.parsed_network && <span style={{ background: NET[l.parsed_network]?.bg, border: `1px solid ${NET[l.parsed_network]?.bdr}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: NET[l.parsed_network]?.txt }}>{NET[l.parsed_network]?.label}</span>}
              {l.matched_topup_id && <span style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: C.ok }}>✓ Matched</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reseller Applications ─────────────────────────────────────
function AdminResellers({ apps, setApps }) {
  const approve = async (id) => {
    const { error } = await supabase.from('reseller_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id)
    if (!error) { setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a)); toast.success('Reseller approved!') }
    else toast.error(error.message)
  }
  const reject = async (id) => {
    const { error } = await supabase.from('reseller_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id)
    if (!error) { setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a)); toast.success('Application rejected') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {apps.length === 0 && <p style={{ color: C.dim, textAlign: 'center', padding: 30 }}>No reseller applications</p>}
      {apps.map(a => (
        <div key={a.id} style={{ ...s.card, padding: '13px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: a.status === 'pending' ? 10 : 0 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{a.user?.full_name}</p>
              <p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{a.user?.email} · {format(new Date(a.created_at), 'dd MMM yyyy, HH:mm')}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>TX: <span style={{ fontFamily: 'monospace', color: C.accent }}>{a.tx_id}</span> · ₵{a.amount}</p>
            </div>
            <span style={pill(a.status)}>{pillText(a.status)}</span>
          </div>
          {a.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => approve(a.id)} style={{ flex: 1, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 9, padding: '8px', color: C.ok, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Approve</button>
              <button onClick={() => reject(a.id)} style={{ flex: 1, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 9, padding: '8px', color: C.err, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✕ Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Admin Chat ────────────────────────────────────────────────
function AdminChat({ users }) {
  const { profile } = useAuth()
  const [selectedUser, setSelectedUser] = useState(null)
  const [chatUsers, setChatUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const fileRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    // Get users who have sent chat messages
    supabase.from('chat_messages').select('user_id').then(({ data }) => {
      const ids = [...new Set((data || []).map(m => m.user_id))]
      setChatUsers(users.filter(u => ids.includes(u.id)))
    })
  }, [users])

  useEffect(() => {
    if (!selectedUser) return
    supabase.from('chat_messages').select('*').eq('user_id', selectedUser.id).order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []))

    const sub = supabase.channel('admin_chat_' + selectedUser.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${selectedUser.id}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      ).subscribe()
    return () => supabase.removeChannel(sub)
  }, [selectedUser])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setFilePreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const send = async () => {
    if (!selectedUser || (!input.trim() && !file)) return
    let mediaUrl = null, mediaType = null
    if (file) {
      const path = `chat/${selectedUser.id}/admin-${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('chat-media').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
        mediaUrl = publicUrl
        mediaType = file.type.startsWith('video') ? 'video' : 'image'
      }
      setFile(null); setFilePreview(null)
    }
    const txt = input.trim(); setInput('')
    await supabase.from('chat_messages').insert({ user_id: selectedUser.id, sender: 'admin', content: txt, media_url: mediaUrl, media_type: mediaType })
    await supabase.from('notifications').insert({ user_id: selectedUser.id, title: 'New message from support', body: txt || 'Admin sent a file', type: 'info' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!selectedUser ? (
        <>
          <h3 style={s.h3}>Live Chat — Select a User</h3>
          {chatUsers.length === 0 && <p style={{ color: C.dim, textAlign: 'center', padding: 20 }}>No active chats</p>}
          {chatUsers.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)} style={{ ...s.card, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.bdr}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>{u.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div><p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{u.full_name}</p><p style={{ fontSize: 11, color: C.dim, margin: 0 }}>{u.email}</p></div>
              <span style={{ marginLeft: 'auto', color: C.accent, fontSize: 18 }}>›</span>
            </div>
          ))}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 20 }}>‹</button>
            <h3 style={{ ...s.h3, margin: 0 }}>{selectedUser.full_name}</h3>
          </div>
          <div style={{ ...s.card, minHeight: 300, maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, padding: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: m.sender === 'admin' ? '15px 15px 4px 15px' : '15px 15px 15px 4px', background: m.sender === 'admin' ? `linear-gradient(135deg,${C.g1},${C.g2})` : C.hi, color: C.text, fontSize: 13, lineHeight: 1.5 }}>
                  {m.content && <p style={{ margin: 0 }}>{m.content}</p>}
                  {m.media_url && m.media_type === 'image' && <img src={m.media_url} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, marginTop: m.content ? 6 : 0 }} />}
                  {m.media_url && m.media_type === 'video' && <video src={m.media_url} controls style={{ maxWidth: '100%', borderRadius: 8, marginTop: m.content ? 6 : 0 }} />}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {filePreview && (
            <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {file?.type.startsWith('video') ? <video src={filePreview} style={{ height: 48, borderRadius: 6 }} /> : <img src={filePreview} alt="preview" style={{ height: 48, borderRadius: 6, objectFit: 'cover' }} />}
              <button onClick={() => { setFile(null); setFilePreview(null) }} style={{ background: 'none', border: 'none', color: C.err, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,video/*" style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>📎</button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Reply to user…" style={{ flex: 1, background: C.hi, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none' }} />
            <button onClick={send} style={{ background: grad, border: 'none', borderRadius: 10, padding: '9px 13px', cursor: 'pointer', fontSize: 16 }}>➤</button>
          </div>
        </>
      )}
    </div>
  )
}
