'use client';
// The consultation form. Saves as you go (drafts), and is marked complete when the required questions are answered.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { HEALTH } from '@/lib/visit-form.js';

const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };
const row = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', fontSize: 18 };
const box = { width: 22, height: 22 };
const input = { width: '100%', padding: '12px 14px', fontSize: 17, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' };
const radio = (name, value, label, cur, set) => (
  <label style={{ ...row, cursor: 'pointer' }}><input type="radio" name={name} checked={cur === value} onChange={() => set(value)} style={box} /><span>{label}</span></label>
);

export default function VisitForm({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [ready, setReady] = useState(false);
  const [f, setF] = useState(null);
  const [status, setStatus] = useState('draft');
  const [warn, setWarn] = useState([]);
  const [errs, setErrs] = useState({});
  const [note, setNote] = useState('');
  const dirty = useRef(false);

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`/api/visits/${id}`, { headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setNote(d.error || 'Could not open this form.'); setReady(true); return; }
      setF(d.form); setStatus(d.status); setWarn(d.contraindications || []); setReady(true);
    })();
  }, [id, router]);

  // autosave: a short pause after the last change, then the answers are saved (encrypted) as a draft
  useEffect(() => {
    if (!f || !dirty.current) return;
    const t = setTimeout(() => save(false), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const set = (path, value) => {
    dirty.current = true;
    setF((cur) => { const n = structuredClone(cur); let o = n; for (const k of path.slice(0, -1)) o = o[k]; o[path[path.length - 1]] = value; return n; });
  };

  async function save(complete) {
    const { data: s } = await supabase.auth.getSession();
    setNote(complete ? 'Completing…' : 'Saving…');
    const res = await fetch(`/api/visits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` }, body: JSON.stringify({ form: f, complete }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErrs(d.fields || {}); setNote(d.error || 'Could not save. Please try again.'); return; }
    dirty.current = false; setErrs({}); setStatus(d.status); setWarn(d.contraindications || []);
    setNote(complete ? 'Form completed. The record is saved.' : 'Saved.');
  }

  if (!ready) return <p style={{ padding: 24 }}>Opening the form…</p>;
  if (!f) return <p style={{ padding: 24 }}>{note}</p>;
  const h = (k) => f.health[k];
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontWeight: 500 }}>Consultation form</h1>
      <p style={{ color: '#6f6581', margin: 0 }}>{status === 'complete' ? 'Completed' : 'Draft. Saves as you go.'} {note && `· ${note}`}</p>
      {warn.length > 0 && (
        <div role="alert" style={{ background: '#fff4e0', border: '1.5px solid #e0a040', borderRadius: 14, padding: 16, marginTop: 16 }}>
          <b>Check before treatment</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{warn.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>General health</h2>
        <p style={{ marginTop: 0 }}>Tick anything the client has, or has had.</p>
        {HEALTH.map(([k, label]) => (
          <label key={k} style={row}><input type="checkbox" style={box} checked={h(k)} onChange={(e) => set(['health', k], e.target.checked)} /><span>{label}</span></label>
        ))}
        <label style={{ display: 'block', marginTop: 10 }}>Pregnancy (weeks, if pregnant)
          <input type="number" min="1" max="42" value={f.pregnancy_weeks ?? ''} onChange={(e) => set(['pregnancy_weeks'], e.target.value ? Number(e.target.value) : null)} style={{ ...input, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>Other medical conditions (details)
          <input value={f.health_other_detail} onChange={(e) => set(['health_other_detail'], e.target.value)} style={{ ...input, marginTop: 6 }} />
        </label>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Medications and allergies</h2>
        <label style={{ display: 'block' }}>Medications currently used (topical or oral)
          <input value={f.medications} onChange={(e) => set(['medications'], e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
        <label style={{ display: 'block', marginTop: 12 }}>Allergies (including skincare ingredients)
          <input value={f.allergies} onChange={(e) => set(['allergies'], e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
        <label style={row}><input type="checkbox" style={box} checked={f.medication_affects_skin} onChange={(e) => set(['medication_affects_skin'], e.target.checked)} /><span>On medication that affects the skin (steroids, birth control, acne medication)</span></label>
        {f.medication_affects_skin && <input value={f.medication_detail} onChange={(e) => set(['medication_detail'], e.target.value)} placeholder="Details" style={input} />}
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Lifestyle</h2>
        {errs.sleep && <div style={{ color: '#7a1f1f' }}>{errs.sleep}</div>}
        <p style={{ margin: '8px 0 2px', fontWeight: 500 }}>Hours of sleep</p>
        {radio('sleep', 'lt4', 'Less than 4', f.lifestyle.sleep, (v) => set(['lifestyle', 'sleep'], v))}
        {radio('sleep', '4-6', '4 to 6', f.lifestyle.sleep, (v) => set(['lifestyle', 'sleep'], v))}
        {radio('sleep', '7-8', '7 to 8', f.lifestyle.sleep, (v) => set(['lifestyle', 'sleep'], v))}
        {radio('sleep', '9+', '9 or more', f.lifestyle.sleep, (v) => set(['lifestyle', 'sleep'], v))}
        {errs.water && <div style={{ color: '#7a1f1f' }}>{errs.water}</div>}
        <p style={{ margin: '12px 0 2px', fontWeight: 500 }}>Water per day</p>
        {radio('water', 'lt1', 'Less than 1 litre', f.lifestyle.water, (v) => set(['lifestyle', 'water'], v))}
        {radio('water', '1-2', '1 to 2 litres', f.lifestyle.water, (v) => set(['lifestyle', 'water'], v))}
        {radio('water', '2-3', '2 to 3 litres', f.lifestyle.water, (v) => set(['lifestyle', 'water'], v))}
        {radio('water', 'gt3', 'More than 3 litres', f.lifestyle.water, (v) => set(['lifestyle', 'water'], v))}
        <label style={row}><input type="checkbox" style={box} checked={f.lifestyle.smokes_or_drinks} onChange={(e) => set(['lifestyle', 'smokes_or_drinks'], e.target.checked)} /><span>Smokes or drinks alcohol regularly</span></label>
        {errs.stress && <div style={{ color: '#7a1f1f' }}>{errs.stress}</div>}
        <p style={{ margin: '12px 0 2px', fontWeight: 500 }}>Stress</p>
        {radio('stress', 'high', 'High', f.lifestyle.stress, (v) => set(['lifestyle', 'stress'], v))}
        {radio('stress', 'moderate', 'Moderate', f.lifestyle.stress, (v) => set(['lifestyle', 'stress'], v))}
        {radio('stress', 'no', 'Not stressed', f.lifestyle.stress, (v) => set(['lifestyle', 'stress'], v))}
        {errs.sun && <div style={{ color: '#7a1f1f' }}>{errs.sun}</div>}
        <p style={{ margin: '12px 0 2px', fontWeight: 500 }}>Sun exposure</p>
        {radio('sun', 'daily', 'Daily', f.lifestyle.sun, (v) => set(['lifestyle', 'sun'], v))}
        {radio('sun', 'occasionally', 'Occasionally', f.lifestyle.sun, (v) => set(['lifestyle', 'sun'], v))}
        {radio('sun', 'rarely', 'Rarely', f.lifestyle.sun, (v) => set(['lifestyle', 'sun'], v))}
        <label style={row}><input type="checkbox" style={box} checked={f.lifestyle.uses_sunscreen} onChange={(e) => set(['lifestyle', 'uses_sunscreen'], e.target.checked)} /><span>Uses sunscreen</span></label>
        <input value={f.lifestyle.sunscreen_spf} onChange={(e) => set(['lifestyle', 'sunscreen_spf'], e.target.value)} placeholder="SPF (if known)" style={input} />
        <label style={row}><input type="checkbox" style={box} checked={f.lifestyle.sunburns} onChange={(e) => set(['lifestyle', 'sunburns'], e.target.checked)} /><span>Has had sunburns or sun damage in the past</span></label>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Skin history</h2>
        <label style={{ display: 'block' }}>Current skincare routine (products or steps)
          <textarea rows={3} value={f.skin.routine} onChange={(e) => set(['skin', 'routine'], e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
        <label style={row}><input type="checkbox" style={box} checked={f.skin.facial_before} onChange={(e) => set(['skin', 'facial_before'], e.target.checked)} /><span>Has had facial treatments before</span></label>
        {f.skin.facial_before && <input value={f.skin.facial_detail} onChange={(e) => set(['skin', 'facial_detail'], e.target.value)} placeholder="Type and date" style={input} />}
        <p style={{ margin: '12px 0 2px', fontWeight: 500 }}>Currently using</p>
        {[['retinol', 'Retinol / retinoids'], ['aha_bha', 'AHA / BHA (glycolic, lactic, salicylic)'], ['vitamin_c', 'Vitamin C'], ['acne_medication', 'Acne medication'], ['exfoliants', 'Exfoliants (physical or chemical)']].map(([k, l]) => (
          <label key={k} style={row}><input type="checkbox" style={box} checked={f.skin.actives[k]} onChange={(e) => set(['skin', 'actives', k], e.target.checked)} /><span>{l}</span></label>
        ))}
        <p style={{ margin: '12px 0 2px', fontWeight: 500 }}>After treatments or products, has experienced</p>
        {[['redness', 'Redness'], ['burning', 'Burning'], ['peeling', 'Peeling'], ['breakouts', 'Breakouts']].map(([k, l]) => (
          <label key={k} style={row}><input type="checkbox" style={box} checked={f.skin.reactions[k]} onChange={(e) => set(['skin', 'reactions', k], e.target.checked)} /><span>{l}</span></label>
        ))}
        <label style={row}><input type="checkbox" style={box} checked={f.skin.recent_procedures} onChange={(e) => set(['skin', 'recent_procedures'], e.target.checked)} /><span>Recent cosmetic procedures (Botox, fillers, laser, peels)</span></label>
        {f.skin.recent_procedures && <input value={f.skin.procedures_detail} onChange={(e) => set(['skin', 'procedures_detail'], e.target.value)} placeholder="Details" style={input} />}
      </section>

      <div style={{ position: 'sticky', bottom: 0, background: '#faf7fd', padding: '14px 0', marginTop: 16 }}>
        <button onClick={() => save(true)} style={{ width: '100%', padding: 16, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 18 }}>Mark form complete</button>
      </div>
    </main>
  );
}
