'use client';
// The therapist assessment: notes, skin analysis, lesions, concerns, treatment details, the face diagram (tap to mark), and client feedback.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { SKIN_ITEMS } from '@/lib/assessment.js';

const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };
const area = { width: '100%', padding: '12px 14px', fontSize: 17, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box', marginTop: 6 };
const chip = (on) => ({ padding: '10px 16px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: on ? '#5b2a8c' : '#fff', color: on ? '#fff' : '#5b2a8c', fontSize: 16, marginRight: 8, marginTop: 8, cursor: 'pointer' });

export default function Assessment({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [a, setA] = useState(null);
  const [note, setNote] = useState('');
  const dirty = useRef(false);

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`/api/visits/${id}/assessment`, { headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` }, cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote(d.error || 'Could not open the assessment.'); return; }
      setA(d.assessment);
    })();
  }, [id, router]);

  useEffect(() => {
    if (!a || !dirty.current) return;
    const t = setTimeout(() => save(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a]);

  const set = (path, value) => {
    dirty.current = true;
    setA((cur) => { const n = structuredClone(cur); let o = n; for (const k of path.slice(0, -1)) o = o[k]; o[path[path.length - 1]] = value; return n; });
  };

  async function save() {
    const { data: s } = await supabase.auth.getSession();
    setNote('Saving…');
    const res = await fetch(`/api/visits/${id}/assessment`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` }, body: JSON.stringify({ assessment: a }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setNote(d.error || 'Could not save. Please try again.'); return; }
    dirty.current = false; setNote('Saved.');
  }

  // tap the face to mark an area; tap a mark again to remove it
  function tapFace(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    const near = a.diagram.findIndex((m) => Math.abs(m.x - x) < 4 && Math.abs(m.y - y) < 4);
    const next = near >= 0 ? a.diagram.filter((_, i) => i !== near) : [...a.diagram, { x, y }];
    set(['diagram'], next.slice(0, 60));
  }

  if (!a) return <p style={{ padding: 24 }}>{note || 'Opening the assessment…'}</p>;
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 80px' }}>
      <a href={`/clinic/visits/${id}`} style={{ color: '#5b2a8c' }}>← Back to the form</a>
      <h1 style={{ fontWeight: 500 }}>Therapist assessment</h1>
      <p style={{ color: '#6f6581', margin: 0 }}>{note}</p>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Therapist notes</h2>
        <textarea rows={4} value={a.notes} onChange={(e) => set(['notes'], e.target.value)} style={area} />
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Skin analysis</h2>
        {SKIN_ITEMS.map(([k, label, opts]) => (
          <div key={k} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 500 }}>{label}</div>
            {opts.map((o) => (
              <button key={o} type="button" onClick={() => set(['skin', k], a.skin[k] === o ? '' : o)} style={chip(a.skin[k] === o)}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
        ))}
        <label style={{ display: 'block', marginTop: 16 }}>Overall skin type
          <input value={a.overall_skin_type} onChange={(e) => set(['overall_skin_type'], e.target.value)} style={area} /></label>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Face diagram</h2>
        <p style={{ marginTop: 0, color: '#6f6581' }}>Tap the face to mark an area. Tap a mark again to remove it.</p>
        <svg viewBox="0 0 200 260" onClick={tapFace} style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto', cursor: 'crosshair', background: '#fff', borderRadius: 12 }} role="img" aria-label="Face diagram">
          <path d="M100 14 C150 14 170 54 170 110 C170 170 140 232 100 240 C60 232 30 170 30 110 C30 54 50 14 100 14 Z" fill="none" stroke="#5b2a8c" strokeWidth="2" />
          <circle cx="78" cy="110" r="6" fill="none" stroke="#5b2a8c" strokeWidth="1.5" />
          <circle cx="122" cy="110" r="6" fill="none" stroke="#5b2a8c" strokeWidth="1.5" />
          <path d="M100 124 L94 160 L106 160" fill="none" stroke="#5b2a8c" strokeWidth="1.5" />
          <path d="M80 190 Q100 204 120 190" fill="none" stroke="#5b2a8c" strokeWidth="1.5" />
          {a.diagram.map((m, i) => <circle key={i} cx={m.x * 2} cy={m.y * 2.6} r="7" fill="#e0a040" stroke="#7a1f1f" strokeWidth="2" />)}
        </svg>
        <p style={{ fontSize: 14, color: '#6f6581' }}>{a.diagram.length} area{a.diagram.length === 1 ? '' : 's'} marked</p>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Skin lesions</h2>
        <textarea rows={3} value={a.lesions} onChange={(e) => set(['lesions'], e.target.value)} style={area} />
      </section>
      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Skin concerns</h2>
        <textarea rows={3} value={a.concerns} onChange={(e) => set(['concerns'], e.target.value)} style={area} />
      </section>
      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Treatment details</h2>
        <textarea rows={4} value={a.treatment_details} onChange={(e) => set(['treatment_details'], e.target.value)} style={area} />
      </section>
      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Client feedback</h2>
        <textarea rows={3} value={a.client_feedback} onChange={(e) => set(['client_feedback'], e.target.value)} style={area} />
      </section>
    </main>
  );
}
