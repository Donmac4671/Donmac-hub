// src/lib/styles.js — shared design tokens and style helpers

export const C = {
  bg:'#070B14', surface:'#0F1623', hi:'#162032', bdr:'#1C2E46',
  text:'#EEF2FF', muted:'#6B82A8', dim:'#3A4D6A',
  accent:'#3B82F6', glow:'rgba(59,130,246,0.14)',
  ok:'#10B981', warn:'#F59E0B', err:'#EF4444',
  g1:'#3B82F6', g2:'#7C3AED',
}

export const grad = `linear-gradient(135deg,${C.g1},${C.g2})`

export const NET = {
  mtn:            { label:'MTN',                bg:'rgba(255,209,0,.09)', bdr:'rgba(255,209,0,.28)', txt:'#FFD100', badge:'MTN',  api:'mtn'         },
  telecel:        { label:'Telecel',            bg:'rgba(227,6,19,.09)',  bdr:'rgba(227,6,19,.28)',  txt:'#FF4D57', badge:'TCL',  api:'telecel'     },
  airtel_big:     { label:'AirtelTigo Big',     bg:'rgba(0,153,204,.09)', bdr:'rgba(0,153,204,.28)', txt:'#29B9E8', badge:'AT',   api:'at-big-time' },
  airtel_premium: { label:'AirtelTigo Premium', bg:'rgba(0,191,255,.09)', bdr:'rgba(0,191,255,.28)', txt:'#5DD4F8', badge:'AT+',  api:'at-premium'  },
}

export const GH_PFX = ['024','025','053','054','055','059','020','050','026','027','028','056','057']

export const STATUS_MAP = {
  waiting:    { bg:'rgba(99,102,241,.12)',  c:'#818CF8', t:'Waiting'    },
  pending:    { bg:'rgba(99,102,241,.12)',  c:'#818CF8', t:'Pending'    },
  processing: { bg:'rgba(245,158,11,.12)', c:'#F59E0B', t:'Processing' },
  completed:  { bg:'rgba(16,185,129,.12)', c:'#10B981', t:'Delivered'  },
  failed:     { bg:'rgba(239,68,68,.12)',  c:'#EF4444', t:'Failed'     },
  verified:   { bg:'rgba(16,185,129,.12)', c:'#10B981', t:'Verified'   },
  rejected:   { bg:'rgba(239,68,68,.12)',  c:'#EF4444', t:'Rejected'   },
  approved:   { bg:'rgba(16,185,129,.12)', c:'#10B981', t:'Approved'   },
}

export function pill(status) {
  const m = STATUS_MAP[status] || STATUS_MAP.pending
  return {
    background: m.bg, color: m.c,
    fontSize: 11, fontWeight: 600, padding: '3px 10px',
    borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block',
  }
}

export function pillText(status) {
  return STATUS_MAP[status]?.t || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown')
}

// ── Style object (named "st" to avoid conflicts with loop variables) ──────────
export const st = {
  authWrap: {
    minHeight:'100vh', background:C.bg,
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20,
  },
  authCard: {
    width:'100%', maxWidth:400, background:C.surface, border:`1px solid ${C.bdr}`,
    borderRadius:20, padding:24,
  },
  dashWrap: { background:C.bg, minHeight:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif" },
  page: { padding:'70px 14px 96px' },

  h2: { fontSize:19, fontWeight:800, color:C.text, margin:'0 0 8px' },
  h3: { fontSize:15, fontWeight:700, color:C.text, margin:'0 0 12px' },
  mutedText: { fontSize:13, color:C.muted, margin:0 },
  dimText: { fontSize:11, color:C.dim, margin:'5px 0 0' },
  boldText: { fontSize:14, fontWeight:700, color:C.text, margin:0 },
  errText: { fontSize:11, color:C.err, margin:'5px 0 0' },
  label: { fontSize:12, color:C.muted, fontWeight:500, display:'block', marginBottom:6 },

  logoBox: {
    width:56, height:56, borderRadius:16,
    background:grad, display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:900, fontSize:24, color:'#fff', margin:'0 auto 12px',
    boxShadow:'0 12px 40px rgba(59,130,246,.35)',
  },
  logoTitle: { fontWeight:900, fontSize:19, color:C.text, margin:0 },
  logoSub: { fontSize:12, color:C.muted, marginTop:3 },

  input: {
    width:'100%', background:C.hi, border:`1px solid ${C.bdr}`,
    borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14,
    boxSizing:'border-box', outline:'none', fontFamily:'inherit',
  },
  phonePfx: {
    position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
    display:'flex', alignItems:'center', gap:5, pointerEvents:'none',
    background:C.bdr, borderRadius:6, padding:'3px 8px',
    fontSize:12, color:C.muted, fontWeight:600,
  },
  eyeBtn: {
    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
    background:'none', border:'none', cursor:'pointer', fontSize:15, padding:2,
  },
  textarea: {
    width:'100%', background:C.hi, border:`1px solid ${C.bdr}`,
    borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14,
    boxSizing:'border-box', outline:'none', fontFamily:'inherit',
    resize:'vertical', minHeight:80,
  },
  select: {
    width:'100%', background:C.hi, border:`1px solid ${C.bdr}`,
    borderRadius:10, padding:'10px 14px', color:C.text, fontSize:14,
    boxSizing:'border-box', outline:'none', fontFamily:'inherit', cursor:'pointer',
  },

  btnPrimary: {
    width:'100%', background:grad, border:'none', borderRadius:12,
    padding:'12px', color:'#fff', fontWeight:700, fontSize:14,
    cursor:'pointer', boxShadow:'0 4px 18px rgba(59,130,246,.3)',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  },
  btnOutline: {
    width:'100%', background:'transparent', border:`1px solid ${C.bdr}`,
    borderRadius:12, padding:'11px', color:C.muted, fontWeight:600, fontSize:14, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  },
  btnGhost: {
    width:'100%', background:'none', border:'none',
    color:C.accent, fontWeight:600, fontSize:13, cursor:'pointer', padding:'8px',
  },
  btnSm: {
    background:grad, border:'none', borderRadius:9, padding:'7px 14px',
    color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer',
    display:'inline-flex', alignItems:'center', gap:6,
  },
  btnSmOutline: {
    background:'transparent', border:`1px solid ${C.bdr}`, borderRadius:9, padding:'7px 14px',
    color:C.muted, fontWeight:600, fontSize:12, cursor:'pointer',
    display:'inline-flex', alignItems:'center', gap:6,
  },
  btnDanger: {
    background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)',
    borderRadius:9, padding:'7px 14px', color:C.err, fontWeight:700, fontSize:12,
    cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
  },

  card: {
    background:C.surface, border:`1px solid ${C.bdr}`, borderRadius:16, padding:18,
  },
  cardSm: {
    background:C.hi, border:`1px solid ${C.bdr}`, borderRadius:12, padding:13,
  },

  tabRow: { display:'flex', gap:8, marginBottom:20 },
  tab: {
    flex:1, padding:'9px', borderRadius:10, background:'transparent',
    border:`1px solid ${C.bdr}`, color:C.muted, fontWeight:600, fontSize:14, cursor:'pointer',
  },
  tabActive: {
    background:C.glow, border:`1px solid rgba(59,130,246,.3)`, color:C.accent,
  },

  form: { display:'flex', flexDirection:'column', gap:14 },
  field: { display:'flex', flexDirection:'column' },
  infoBox: {
    background:'rgba(59,130,246,.05)', border:`1px solid rgba(59,130,246,.13)`,
    borderRadius:11, padding:'11px 13px',
  },

  divider: { height:1, background:C.bdr, margin:'14px 0' },
  iconCircle: {
    width:60, height:60, borderRadius:'50%',
    background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:26, margin:'0 auto 16px',
  },
  linkBtn: {
    background:'none', border:'none', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer',
  },
}

// Keep 's' as an alias for backward compat but named 'st' everywhere new
export const s = st
