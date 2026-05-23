import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { C, grad, NET, st } from '../lib/styles'
import toast from 'react-hot-toast'

const NAV = [
  { path:'/dashboard',  label:'Dashboard',      icon:'🏠' },
  { path:'/bundles',    label:'Buy Data',        icon:'📦' },
  { path:'/cart',       label:'Cart',            icon:'🛒', badge:true },
  { path:'/orders',     label:'Orders',          icon:'📋' },
  { path:'/wallet',     label:'Wallet',          icon:'💳' },
  { path:'/referrals',  label:'Referrals',       icon:'🎁' },
  { path:'/reseller',   label:'Become Reseller', icon:'🏪' },
  { path:'/admin',      label:'Admin Panel',     icon:'🛡️',  admin:true },
  { path:'/profile',    label:'Profile',         icon:'⚙️' },
]

// ── Cart Context (simple global using localStorage) ──────────
export const getCart = () => {
  try { return JSON.parse(localStorage.getItem('dmh_cart') || '[]') } catch { return [] }
}
export const setCart = (items) => localStorage.setItem('dmh_cart', JSON.stringify(items))

export default function DashboardLayout() {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sideOpen, setSideOpen] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [cartLen, setCartLen] = useState(0)
  const [notifs, setNotifs] = useState([])

  // Sync cart length
  useEffect(() => {
    const update = () => setCartLen(getCart().length)
    update()
    window.addEventListener('storage', update)
    window.addEventListener('cart_update', update)
    return () => { window.removeEventListener('storage', update); window.removeEventListener('cart_update', update) }
  }, [])

  // Real-time notifications
  useEffect(() => {
    if (!profile) return
    const fetchNotifs = async () => {
      const { data } = await supabase.from('notifications').select('*')
        .eq('user_id', profile.id).eq('read', false).order('created_at', { ascending:false }).limit(10)
      setNotifs(data || [])
    }
    fetchNotifs()

    const sub = supabase.channel('notifs')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${profile.id}` },
        (payload) => {
          setNotifs(prev => [payload.new, ...prev])
          toast.success(payload.new.title, { icon: payload.new.type === 'success' ? '✅' : 'ℹ️' })
        }
      ).subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile])

  const markNotifsRead = async () => {
    if (!notifs.length || !profile) return
    await supabase.from('notifications').update({ read:true }).eq('user_id', profile.id).eq('read', false)
    setNotifs([])
  }

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('dmh_cart')
    navigate('/auth')
  }

  if (!profile) return (
    <div style={{...s.dashWrap, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <p style={{color:C.muted}}>Loading profile…</p>
    </div>
  )

  const initials = profile.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const roleLbl = profile.role.charAt(0).toUpperCase() + profile.role.slice(1)

  return (
    <div style={s.dashWrap}>
      {/* ── Sidebar overlay ── */}
      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:40}}/>}

      {/* ── Sidebar ── */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, width:238,
        background:C.surface, borderRight:`1px solid ${C.bdr}`,
        display:'flex', flexDirection:'column', zIndex:50,
        transform:sideOpen?'translateX(0)':'translateX(-100%)',
        transition:'transform .25s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Logo + user card */}
        <div style={{padding:'16px 14px', borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
            <div style={{width:30, height:30, borderRadius:8, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13, color:'#fff'}}>D</div>
            <div>
              <div style={{fontWeight:800, fontSize:13, color:C.text}}>Donmac</div>
              <div style={{fontSize:9, color:C.muted, letterSpacing:'0.09em'}}>DATA HUB</div>
            </div>
          </div>
          {/* User identity */}
          <div style={{background:C.hi, border:`1px solid ${C.bdr}`, borderRadius:12, padding:'11px 12px', display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:42, height:42, borderRadius:'50%', background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:'#fff', flexShrink:0}}>{initials}</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{profile.full_name}</div>
              <div style={{display:'flex', alignItems:'center', gap:4, marginTop:4}}>
                <span style={{fontSize:10, fontWeight:800, color:C.accent, fontFamily:'monospace', background:'rgba(59,130,246,.13)', border:'1px solid rgba(59,130,246,.25)', borderRadius:5, padding:'1px 7px'}}>{profile.agent_code}</span>
              </div>
              <div style={{fontSize:10, color:C.muted, marginTop:3}}>{roleLbl}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1, overflowY:'auto', padding:'10px 10px'}}>
          {NAV.filter(n => n.admin ? isAdmin : true).map(n => {
            const active = location.pathname === n.path
            return (
              <button key={n.path}
                onClick={() => { navigate(n.path); setSideOpen(false) }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'9px 11px', borderRadius:10, marginBottom:2,
                  background:active?C.glow:'transparent',
                  border:active?'1px solid rgba(59,130,246,.2)':'1px solid transparent',
                  color:active?C.accent:C.muted,
                  fontWeight:active?700:500, fontSize:13, cursor:'pointer', textAlign:'left', position:'relative',
                }}>
                <span>{n.icon}</span>{n.label}
                {n.badge && cartLen > 0 && (
                  <span style={{position:'absolute', right:10, background:C.accent, color:'#fff', fontSize:10, fontWeight:800, borderRadius:20, padding:'1px 7px'}}>{cartLen}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{padding:'10px 10px 14px', borderTop:`1px solid ${C.bdr}`}}>
          <button onClick={handleLogout}
            style={{width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.18)', color:C.err, fontWeight:600, fontSize:13, cursor:'pointer'}}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ── Topbar ── */}
      <div style={{position:'fixed', top:0, left:0, right:0, height:58, background:C.surface, borderBottom:`1px solid ${C.bdr}`, display:'flex', alignItems:'center', padding:'0 14px', zIndex:30, gap:12}}>
        <button onClick={()=>setSideOpen(v=>!v)} style={{background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:C.muted, padding:6, borderRadius:8}}>
          {sideOpen ? '✕' : '☰'}
        </button>
        <div style={{fontWeight:700, fontSize:15, color:C.text, flex:1}}>
          {NAV.find(n=>n.path===location.pathname)?.label || 'Donmac Data Hub'}
        </div>
        <button onClick={()=>setShowChat(v=>!v)}
          style={{background:C.glow, border:'1px solid rgba(59,130,246,.2)', color:C.accent, borderRadius:10, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer'}}>
          💬 Support
        </button>
        <div style={{position:'relative'}}>
          <button onClick={markNotifsRead} style={{background:'transparent', border:'none', fontSize:20, cursor:'pointer', color:C.muted, padding:6}}>🔔</button>
          {notifs.length > 0 && (
            <span style={{position:'absolute', top:4, right:4, background:C.err, color:'#fff', fontSize:9, fontWeight:800, borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center'}}>{notifs.length}</span>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={s.page}>
        <Outlet context={{ refreshProfile, cartLen, setCartLen }} />
      </div>

      {/* ── Floating cart ── */}
      {cartLen > 0 && location.pathname !== '/cart' && (
        <button onClick={() => navigate('/cart')}
          style={{position:'fixed', bottom:22, right:14, background:grad, border:'none', borderRadius:16, padding:'13px 18px', display:'flex', alignItems:'center', gap:9, cursor:'pointer', zIndex:60, boxShadow:'0 8px 28px rgba(59,130,246,.4)', color:'#fff', fontWeight:700, fontSize:13}}>
          🛒 {cartLen} item{cartLen>1?'s':''} in cart
        </button>
      )}

      {/* ── WhatsApp ── */}
      {!showChat && cartLen === 0 && (
        <a href="https://wa.me/233549358359" target="_blank" rel="noreferrer"
          style={{position:'fixed', bottom:22, right:14, zIndex:60, width:48, height:48, borderRadius:'50%', background:'#25D366', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 18px rgba(37,211,102,.4)', textDecoration:'none', fontSize:22}}>
          💬
        </a>
      )}

      {/* ── Chat Widget ── */}
      {showChat && <ChatWidget profile={profile} onClose={()=>setShowChat(false)} isAdmin={isAdmin}/>}
    </div>
  )
}

/* ── Chat Widget ─────────────────────────────────────────── */
function ChatWidget({ profile, onClose, isAdmin }) {
  const [chatTab, setChatTab] = useState('ai')
  const [msgs, setMsgs] = useState([
    { from:'ai', text:'Hi! I am your Donmac Data Hub assistant. Ask me anything about bundles, prices, orders, top-ups, or your account — I am here to help!' }
  ])
  const [adminMsgs, setAdminMsgs] = useState([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, adminMsgs])

  // Real-time admin chat subscription
  useEffect(() => {
    if (chatTab !== 'live') return
    const fetchAdminMsgs = async () => {
      const { data } = await supabase.from('chat_messages')
        .select('*').eq('user_id', profile.id).order('created_at', { ascending:true })
      setAdminMsgs(data || [])
    }
    fetchAdminMsgs()

    const sub = supabase.channel('chat_' + profile.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages', filter:`user_id=eq.${profile.id}` },
        (payload) => setAdminMsgs(prev => [...prev, payload.new])
      ).subscribe()
    return () => supabase.removeChannel(sub)
  }, [chatTab, profile.id])

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setFilePreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const uploadFile = async (file) => {
    const ext = file.name.split('.').pop()
    const path = `chat/${profile.id}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('chat-media').upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
    return { url: publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' }
  }

  const sendAI = async () => {
    if ((!input.trim() && !file) || busy) return
    const txt = input.trim()
    setInput('')

    let mediaUrl = null
    let mediaType = null

    if (file) {
      try {
        const uploaded = await uploadFile(file)
        mediaUrl = uploaded.url
        mediaType = uploaded.type
      } catch { toast.error('Could not upload file') }
      setFile(null)
      setFilePreview(null)
    }

    const userMsg = { from:'user', text:txt, mediaUrl, mediaType }
    setMsgs(m => [...m, userMsg])
    setBusy(true)

    try {
      // Save user message to DB
      await supabase.from('chat_messages').insert({ user_id:profile.id, sender:'user', content:txt, media_url:mediaUrl, media_type:mediaType })

      // Build message history for AI
      const history = msgs.filter(m => m.text).map(m => ({ role: m.from==='user'?'user':'assistant', content: m.text }))
      if (txt) history.push({ role:'user', content:txt })

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages: history, userId: profile.id }
      })

      const reply = data?.reply || 'I am having trouble right now. Please contact admin on WhatsApp at 0549358359.'
      setMsgs(m => [...m, { from:'ai', text:reply }])
    } catch {
      setMsgs(m => [...m, { from:'ai', text:'Something went wrong. Please contact admin on WhatsApp at 0549358359.' }])
    } finally {
      setBusy(false)
    }
  }

  const sendLive = async () => {
    if ((!input.trim() && !file) || busy) return
    const txt = input.trim()
    setInput('')
    setBusy(true)

    let mediaUrl = null
    let mediaType = null

    if (file) {
      try {
        const uploaded = await uploadFile(file)
        mediaUrl = uploaded.url
        mediaType = uploaded.type
      } catch { toast.error('Could not upload file') }
      setFile(null)
      setFilePreview(null)
    }

    try {
      await supabase.from('chat_messages').insert({ user_id:profile.id, sender:'user', content:txt, media_url:mediaUrl, media_type:mediaType })
    } catch { toast.error('Failed to send message') }
    finally { setBusy(false) }
  }

  const send = chatTab === 'ai' ? sendAI : sendLive
  const displayMsgs = chatTab === 'ai' ? msgs : adminMsgs.map(m => ({ from:m.sender==='user'?'user':'ai', text:m.content, mediaUrl:m.media_url, mediaType:m.media_type }))

  return (
    <div style={{position:'fixed', bottom:76, right:14, left:14, maxWidth:400, margin:'0 auto', background:C.surface, border:`1px solid ${C.bdr}`, borderRadius:20, zIndex:100, display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.6)', maxHeight:'70vh'}}>
      {/* Header */}
      <div style={{padding:'13px 15px', borderBottom:`1px solid ${C.bdr}`, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', gap:8}}>
          {['ai','live'].map(t => (
            <button key={t} onClick={()=>setChatTab(t)} style={{padding:'5px 13px', borderRadius:20, background:chatTab===t?C.accent:'transparent', border:`1px solid ${chatTab===t?C.accent:C.bdr}`, color:chatTab===t?'#fff':C.muted, fontSize:12, fontWeight:600, cursor:'pointer'}}>
              {t==='ai'?'🤖 AI':'💬 Live'}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:18}}>✕</button>
      </div>

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:13, display:'flex', flexDirection:'column', gap:9}}>
        {chatTab === 'live' && adminMsgs.length === 0 && (
          <div style={{textAlign:'center', padding:'28px 0', color:C.muted, fontSize:13}}>
            <div style={{fontSize:30, marginBottom:8}}>🛎️</div>
            <p style={{margin:0}}>Send a message and our team will reply shortly.</p>
            <p style={{margin:'8px 0 0', fontSize:12, color:C.dim}}>Typical response time: 30 minutes</p>
            <a href="https://wa.me/233549358359" style={{display:'inline-block', marginTop:10, color:C.ok, textDecoration:'none', fontWeight:600}}>Also chat on WhatsApp →</a>
          </div>
        )}
        {displayMsgs.map((m, i) => (
          <div key={i} style={{display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'80%', padding:'9px 13px', borderRadius:m.from==='user'?'15px 15px 4px 15px':'15px 15px 15px 4px', background:m.from==='user'?`linear-gradient(135deg,${C.g1},${C.g2})`:C.hi, color:C.text, fontSize:13, lineHeight:1.5}}>
              {m.text && <p style={{margin:0}}>{m.text}</p>}
              {m.mediaUrl && m.mediaType === 'image' && <img src={m.mediaUrl} alt="attachment" style={{maxWidth:'100%', borderRadius:8, marginTop:m.text?6:0}}/>}
              {m.mediaUrl && m.mediaType === 'video' && <video src={m.mediaUrl} controls style={{maxWidth:'100%', borderRadius:8, marginTop:m.text?6:0}}/>}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{display:'flex'}}>
            <div style={{background:C.hi, padding:'9px 13px', borderRadius:'15px 15px 15px 4px', color:C.muted, fontSize:13}}>Typing…</div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* File preview */}
      {filePreview && (
        <div style={{padding:'6px 12px', borderTop:`1px solid ${C.bdr}`, display:'flex', alignItems:'center', gap:8}}>
          {file?.type.startsWith('video') ? (
            <video src={filePreview} style={{height:48, borderRadius:6}}/>
          ) : (
            <img src={filePreview} alt="preview" style={{height:48, borderRadius:6, objectFit:'cover'}}/>
          )}
          <span style={{fontSize:11, color:C.muted, flex:1}}>{file?.name}</span>
          <button onClick={()=>{setFile(null);setFilePreview(null)}} style={{background:'none', border:'none', color:C.err, cursor:'pointer', fontSize:16}}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{padding:11, borderTop:`1px solid ${C.bdr}`, display:'flex', gap:8, alignItems:'center'}}>
        <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,video/*" style={{display:'none'}}/>
        <button onClick={()=>fileRef.current?.click()} style={{background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted, flexShrink:0}} title="Upload photo or video">📎</button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
          placeholder={chatTab==='ai'?'Ask anything about bundles, orders…':'Send a message to support…'}
          style={{flex:1, background:C.hi, border:`1px solid ${C.bdr}`, borderRadius:10, padding:'9px 12px', color:C.text, fontSize:13, outline:'none'}}/>
        <button onClick={send} disabled={busy && !file}
          style={{background:`linear-gradient(135deg,${C.g1},${C.g2})`, border:'none', borderRadius:10, padding:'9px 13px', cursor:'pointer', fontSize:16}}>
          ➤
        </button>
      </div>
    </div>
  )
}
