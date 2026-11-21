'use client';
// Add a client. The form stays locked until the consent step is in place: nobody enters a client without consent.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const CONSENT_READY = false;   // turned on when the consent step is built
const box = { width: '100%', padding: '14px 16px', fontSize: 18, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' };
const label = { display: 'block', marginTop: 16, marginBottom: 6, fontWeight: 500 };

export default function AddClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [f, setF] = useState({ full_name: '', dob: '', phone: '', email: '', occupation: '', emergency_name: '', emergency_phone: '', gp_address: '', last_doctor_visit: '', lifestyle: '' });
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => { const r = await clinicRoleNow(); if (!r) router.replace('/sign-in'); else setReady(true); })();
  }, [router]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); setMsg(''); setErrs({});
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.session?.access_token || ''}` }, body: JSON.stringify(f) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErrs(d.fields || {}); setMsg(d.error || 'Could not save. Please try again.'); return; }
    router.replace('/clinic?saved=1');
  }

  if (!ready) return <p style={{ padding: 24 }}>Checking access…</p>;
  if (!CONSENT_READY) {
    return (
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontWeight: 500 }}>Add a client</h1>
        <p>Consent is taken first. This step is being finished, so no client can be added yet.</p>
        <button onClick={() => router.push('/clinic')} style={{ marginTop: 12, padding: '10px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Back</button>
      </main>
    );
  }
  const field = (k, text, type = 'text', extra = {}) => (
    <>
      <label htmlFor={k} style={label}>{text}</label>
      <input id={k} type={type} value={f[k]} onChange={set(k)} style={box} aria-invalid={!!errs[k]} {...extra} />
      {errs[k] && <div style={{ color: '#7a1f1f', fontSize: 14, marginTop: 4 }}>{errs[k]}</div>}
    </>
  );
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontWeight: 500 }}>Add a client</h1>
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
        <button disabled={busy} style={{ width: '100%', padding: 16, marginTop: 24, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 18 }}>{busy ? 'Saving…' : 'Save client'}</button>
      </form>
    </main>
  );
}
