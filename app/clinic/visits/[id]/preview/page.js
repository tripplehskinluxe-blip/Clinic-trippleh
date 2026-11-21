'use client';
// The finished form, laid out like the paper. Every answer is shown. Print it, or save it as a PDF from the print dialog.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { buildPreview } from '@/lib/preview.js';

const tick = (on) => (on ? '☑' : '☐');
const val = (v) => (v === '' || v === null || v === undefined ? '—' : String(v));
const sec = { border: '1.5px solid #bdb3cc', padding: 16, marginTop: 14, pageBreakInside: 'avoid' };
const h2 = { fontSize: 17, margin: '0 0 10px', borderBottom: '1px solid #bdb3cc', paddingBottom: 6 };
const row = { display: 'flex', justifyContent: 'space-between', gap: 14, padding: '4px 0', borderBottom: '1px dotted #ddd' };

export default function Preview({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [model, setModel] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const { data: s } = await supabase.auth.getSession();
      const h = { Authorization: `Bearer ${s?.session?.access_token || ''}` };
      const v = await fetch(`/api/visits/${id}`, { headers: h, cache: 'no-store' }).then((r) => r.json());
      if (v.error) { setMsg(v.error); return; }
      const c = await fetch(`/api/clients/${v.client_id}`, { headers: h, cache: 'no-store' }).then((r) => r.json());
      if (c.error) { setMsg(c.error); return; }
      setModel(buildPreview({ client: c.client.details, form: v.form, consent: v.consent, assessment: null }));
    })();
  }, [id, router]);

  if (msg) return <p style={{ padding: 24, color: '#7a1f1f' }}>{msg}</p>;
  if (!model) return <p style={{ padding: 24 }}>Preparing the form…</p>;
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: '#fff', fontFamily: 'Georgia, serif', color: '#111', fontSize: 15 }}>
      <style>{`@media print { .noprint { display: none !important } body { background: #fff } }`}</style>
      <div className="noprint" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ padding: '10px 18px', borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff' }}>Print or save as PDF</button>
        <button onClick={() => history.back()} style={{ padding: '10px 18px', background: 'none', border: 0, color: '#5b2a8c' }}>Back</button>
      </div>

      <header style={{ textAlign: 'center', borderBottom: '2px solid #5b2a8c', paddingBottom: 10 }}>
        <img src="/logo.png" alt="Heeshas Healing Hands Spa" width="90" height="90" style={{ borderRadius: '50%' }} />
        <h1 style={{ fontSize: 22, margin: '8px 0 0', color: '#5b2a8c' }}>Client Consultation Form</h1>
        <p style={{ margin: 0 }}>Heeshas Healing Hands Spa</p>
      </header>

      {model.unreadable && <p style={{ color: '#7a1f1f', fontWeight: 'bold' }}>The personal details of this record could not be read. Every section below is still shown.</p>}

      <section style={sec}>
        <h2 style={h2}>Personal information</h2>
        {model.personal.map((r) => <div key={r.label} style={row}><span>{r.label}</span><span>{val(r.value)}</span></div>)}
        <div style={row}><span>Lifestyle</span><span>{model.lifestyle_status.map((o) => `${tick(o.ticked)} ${o.label}`).join('    ')}</span></div>
      </section>

      <section style={sec}>
        <h2 style={h2}>General health information</h2>
        <p style={{ margin: '0 0 8px' }}>Ticked = the client has, or has had.</p>
        {model.health.map((r) => <div key={r.label} style={row}><span>{tick(r.ticked)} {r.label}</span></div>)}
        <div style={row}><span>Pregnancy (weeks, if pregnant)</span><span>{val(model.pregnancy_weeks)}</span></div>
        <div style={row}><span>Other medical conditions (details)</span><span>{val(model.health_other_detail)}</span></div>
      </section>

      <section style={sec}>
        <h2 style={h2}>Medications and allergies</h2>
        <div style={row}><span>Medications currently used (topical or oral)</span><span>{val(model.medications)}</span></div>
        <div style={row}><span>Allergies (including skincare ingredients)</span><span>{val(model.allergies)}</span></div>
        <div style={row}><span>Medication that affects the skin (steroids, birth control, acne medication)</span><span>{val(model.medication_affects_skin)}</span></div>
        <div style={row}><span>Details</span><span>{val(model.medication_detail)}</span></div>
      </section>

      <section style={sec}>
        <h2 style={h2}>Lifestyle and health factors</h2>
        <p style={{ margin: '0 0 4px' }}>Hours of sleep</p>
        {model.sleep.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <p style={{ margin: '8px 0 4px' }}>Water per day</p>
        {model.water.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <div style={row}><span>Smokes or drinks alcohol regularly</span><span>{model.smokes_or_drinks}</span></div>
        <p style={{ margin: '8px 0 4px' }}>Stress</p>
        {model.stress.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <p style={{ margin: '8px 0 4px' }}>Exposure to the sun</p>
        {model.sun.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <div style={row}><span>Uses sunscreen</span><span>{model.uses_sunscreen}{model.sunscreen_spf ? ` (SPF ${model.sunscreen_spf})` : ''}</span></div>
        <div style={row}><span>Sunburns or sun damage in the past</span><span>{model.sunburns}</span></div>
      </section>

      <section style={sec}>
        <h2 style={h2}>Skin history</h2>
        <div style={row}><span>Current skincare routine</span><span>{val(model.routine)}</span></div>
        <div style={row}><span>Facial treatments before</span><span>{model.facial_before}{model.facial_detail ? ` — ${model.facial_detail}` : ''}</span></div>
        <p style={{ margin: '8px 0 4px' }}>Currently using</p>
        {model.actives.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <p style={{ margin: '8px 0 4px' }}>After treatments or products, has experienced</p>
        {model.reactions.map((o) => <div key={o.label} style={row}><span>{tick(o.ticked)} {o.label}</span></div>)}
        <div style={row}><span>Recent cosmetic procedures (Botox, fillers, laser, peels)</span><span>{model.recent_procedures}{model.procedures_detail ? ` — ${model.procedures_detail}` : ''}</span></div>
      </section>

      <section style={sec}>
        <h2 style={h2}>Consent and signature</h2>
        <div style={row}><span>Wording version the client agreed to</span><span>{val(model.consent?.version)}</span></div>
        <div style={row}><span>Agreed to treatment today</span><span>{model.consent ? '☑ Yes' : '—'}</span></div>
        <div style={row}><span>Agreed that the spa keeps the record</span><span>{model.consent ? '☑ Yes' : '—'}</span></div>
        <div style={row}><span>Date</span><span>{model.consent?.captured_at ? new Date(model.consent.captured_at).toLocaleDateString('en-GB') : '—'}</span></div>
        <p style={{ margin: '10px 0 4px' }}>Client signature</p>
        {model.consent?.signature_url ? <img src={model.consent.signature_url} alt="Client signature" style={{ maxWidth: 360, height: 'auto', border: '1px solid #ddd' }} /> : <p>—</p>}
      </section>

      <section style={sec}>
        <h2 style={h2}>Therapist assessment</h2>
        <p style={{ margin: 0, fontStyle: 'italic' }}>{model.assessment ? '' : 'Not yet recorded.'}</p>
      </section>
    </main>
  );
}
