'use client';
// Add a client. Step 1: consent and signature (a popup the client sees first). Step 2: the consultation details. Saved together.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { newSignaturePath } from '@/lib/consent.js';

const box = { width: '100%', padding: '14px 16px', fontSize: 18, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' };
const label = { display: 'block', marginTop: 16, marginBottom: 6, fontWeight: 500 };
const btn = { width: '100%', padding: 16, marginTop: 20, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 18 };

function SignaturePad({ padRef, onInk }) {
  const ref = useRef(null); const drawing = useRef(false);
  useEffect(() => {
    padRef.current = ref.current;
    const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1f1530';
  }, [padRef]);
  const at = (e) => { const r = ref.current.getBoundingClientRect(); return { x: (e.clientX - r.left) * (ref.current.width / r.width), y: (e.clientY - r.top) * (ref.current.height / r.height) }; };
  const down = (e) => { e.preventDefault(); drawing.current = true; const p = at(e); const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing.current) return; const p = at(e); const ctx = ref.current.getContext('2d'); ctx.lineTo(p.x, p.y); ctx.stroke(); onInk(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onInk(false); };
  return (
    <div>
      <canvas ref={ref} width={600} height={220} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        aria-label="Sign here" style={{ width: '100%', height: 220, background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 12, touchAction: 'none' }} />
      <button type="button" onClick={clear} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Clear signature</button>
    </div>
  );
}

function ConsentStep({ onAccepted, onDeclined }) {
  const [wording, setWording] = useState(null);
  const [treat, setTreat] = useState(false);
  const [store, setStore] = useState(false);
  const [ink, setInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const padRef = useRef(null);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('clinic_active_consent');
      if (error || !data?.[0]) setMsg('The consent wording could not be loaded. Please try again.');
      else setWording(data[0]);
    })();
  }, []);

  async function accept() {
    setBusy(true); setMsg('');
    try {
      const blob = await new Promise((res) => padRef.current.toBlob(res, 'image/png'));
      const path = newSignaturePath();
      const { error } = await supabase.storage.from('clinic-signatures').upload(path, blob, { contentType: 'image/png', upsert: false });
      if (error) throw error;
      onAccepted({ version: wording.version, treatment: true, storage: true, signature_path: path });
    } catch {
      setMsg('The signature could not be saved. Please check the connection and try again.');
      setBusy(false);
    }
  }

  const ready = !!wording && treat && store && ink && !busy;
  return (
    <div>
      <h1 style={{ fontWeight: 500 }}>Consent</h1>
      <p>Please read this with the client before she signs.</p>
      <div style={{ maxHeight: 280, overflowY: 'auto', background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.5 }}>
        {wording ? wording.body : 'Loading…'}
      </div>
      {wording && <p style={{ fontSize: 13, color: '#6f6581' }}>Version {wording.version}</p>}
      <label style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'flex-start' }}><input type="checkbox" checked={treat} onChange={(e) => setTreat(e.target.checked)} style={{ marginTop: 6 }} /><span>I agree to receive treatment today.</span></label>
      <label style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-start' }}><input type="checkbox" checked={store} onChange={(e) => setStore(e.target.checked)} style={{ marginTop: 6 }} /><span>I agree that the spa keeps my record as described above.</span></label>
      <p style={label}>Client signature</p>
      <SignaturePad padRef={padRef} onInk={setInk} />
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 14, borderRadius: 12 }}>{msg}</p>}
      <button disabled={!ready} onClick={accept} style={{ ...btn, opacity: ready ? 1 : 0.5 }}>{busy ? 'Saving signature…' : 'Accept and continue'}</button>
      <button type="button" onClick={onDeclined} style={{ ...btn, background: '#fff', color: '#5b2a8c', border: '1.5px solid #5b2a8c' }}>Client does not agree</button>
    </div>
  );
}

export default function AddClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState('consent');
  const [consent, setConsent] = useState(null);
  const [f, setF] = useState({ full_name: '', dob: '', phone: '', email: '', occupation: '', emergency_name: '', emergency_phone: '', gp_address: '', last_doctor_visit: '', lifestyle: '' });
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => { const r = await clinicRoleNow(); if (!r) router.replace('/sign-in'); else setReady(true); })(); }, [router]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg(''); setErrs({});
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` }, body: JSON.stringify({ ...f, consent }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 409 || d.retake_consent) { setConsent(null); setStage('consent'); setMsg(d.error || 'Please take consent again.'); return; }
    if (!res.ok) { setErrs(d.fields || {}); setMsg(d.error || 'Could not save. Please try again.'); return; }
    router.replace('/clinic?saved=1');
  }

  if (!ready) return <p style={{ padding: 24 }}>Checking access…</p>;
  if (stage === 'consent') {
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
        <ConsentStep
          onAccepted={(c) => { setConsent(c); setStage('form'); }}
          onDeclined={() => router.replace('/clinic')} />
      </main>
    );
  }
  const field = (k, text, type = 'text') => (
    <>
      <label htmlFor={k} style={label}>{text}</label>
      <input id={k} type={type} value={f[k]} onChange={set(k)} style={box} aria-invalid={!!errs[k]} />
      {errs[k] && <div style={{ color: '#7a1f1f', fontSize: 14, marginTop: 4 }}>{errs[k]}</div>}
    </>
  );
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontWeight: 500 }}>Client details</h1>
      <p style={{ color: '#6f6581' }}>Consent recorded. Now the consultation details.</p>
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 14, borderRadius: 12 }}>{msg}</p>}
      <form onSubmit={save}>
        {field('full_name', 'Full name')}
        {field('dob', 'Date of birth', 'date')}
        {field('phone', 'Phone number', 'tel')}
        {field('email', 'Email address', 'email')}
        {field('occupation', 'Occupation')}
        {field('emergency_name', 'Emergency contact (name)')}
        {field('emergency_phone', 'Emergency contact (phone)', 'tel')}
        {field('gp_address', 'GP address')}
        {field('last_doctor_visit', 'Last visit to the doctor')}
        <label htmlFor="lifestyle" style={label}>Lifestyle</label>
        <select id="lifestyle" value={f.lifestyle} onChange={set('lifestyle')} style={box}>
          <option value="">Choose</option><option value="active">Active</option><option value="sedentary">Sedentary</option>
        </select>
        <button disabled={busy} style={btn}>{busy ? 'Saving…' : 'Save client'}</button>
      </form>
    </main>
  );
}
