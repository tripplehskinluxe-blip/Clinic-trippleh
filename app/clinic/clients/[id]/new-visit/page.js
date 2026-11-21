'use client';
// A new visit for an existing client: the consent is taken again, then the consultation form opens.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { newSignaturePath } from '@/lib/consent.js';

const btn = { width: '100%', padding: 16, marginTop: 20, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 18 };

function SignaturePad({ padRef, onInk }) {
  const ref = useRef(null); const drawing = useRef(false);
  useEffect(() => { padRef.current = ref.current; const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1f1530'; }, [padRef]);
  const at = (e) => { const r = ref.current.getBoundingClientRect(); return { x: (e.clientX - r.left) * (ref.current.width / r.width), y: (e.clientY - r.top) * (ref.current.height / r.height) }; };
  const down = (e) => { e.preventDefault(); drawing.current = true; const p = at(e); const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing.current) return; const p = at(e); const ctx = ref.current.getContext('2d'); ctx.lineTo(p.x, p.y); ctx.stroke(); onInk(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onInk(false); };
  return (
    <div>
      <canvas ref={ref} width={600} height={220} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Sign here" style={{ width: '100%', height: 220, background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 12, touchAction: 'none' }} />
      <button type="button" onClick={clear} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Clear signature</button>
    </div>
  );
}

export default function NewVisit({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [ready, setReady] = useState(false);
  const [wording, setWording] = useState(null);
  const [treat, setTreat] = useState(false);
  const [store, setStore] = useState(false);
  const [ink, setInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const padRef = useRef(null);

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const { data, error } = await supabase.rpc('clinic_active_consent');
      if (error || !data?.[0]) setMsg('The consent wording could not be loaded. Please try again.'); else setWording(data[0]);
      setReady(true);
    })();
  }, [id, router]);

  async function accept() {
    setBusy(true); setMsg('');
    try {
      const blob = await new Promise((res) => padRef.current.toBlob(res, 'image/png'));
      const path = newSignaturePath();
      const up = await supabase.storage.from('clinic-signatures').upload(path, blob, { contentType: 'image/png', upsert: false });
      if (up.error) throw up.error;
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`/api/clients/${id}/visits`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` }, body: JSON.stringify({ consent: { version: wording.version, treatment: true, storage: true, signature_path: path } }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not start the visit.'); setBusy(false); return; }
      router.replace(`/clinic/visits/${d.visit_id}`);
    } catch {
      setMsg('The signature could not be saved. Please check the connection and try again.'); setBusy(false);
    }
  }

  if (!ready) return <p style={{ padding: 24 }}>Preparing the consent…</p>;
  const can = !!wording && treat && store && ink && !busy;
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      <a href={`/clinic/clients/${id}`} style={{ color: '#5b2a8c' }}>← Back to the record</a>
      <h1 style={{ fontWeight: 500 }}>New visit: consent</h1>
      <div style={{ maxHeight: 280, overflowY: 'auto', background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.5 }}>{wording ? wording.body : 'Loading…'}</div>
      {wording && <p style={{ fontSize: 13, color: '#6f6581' }}>Version {wording.version}</p>}
      <label style={{ display: 'flex', gap: 10, marginTop: 14 }}><input type="checkbox" checked={treat} onChange={(e) => setTreat(e.target.checked)} /><span>I agree to receive treatment today.</span></label>
      <label style={{ display: 'flex', gap: 10, marginTop: 10 }}><input type="checkbox" checked={store} onChange={(e) => setStore(e.target.checked)} /><span>I agree that the spa keeps my record as described above.</span></label>
      <p style={{ fontWeight: 500, marginTop: 16 }}>Client signature</p>
      <SignaturePad padRef={padRef} onInk={setInk} />
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 14, borderRadius: 12 }}>{msg}</p>}
      <button disabled={!can} onClick={accept} style={{ ...btn, opacity: can ? 1 : 0.5 }}>{busy ? 'Saving…' : 'Accept and open the form'}</button>
    </main>
  );
}
