'use client';
// The consent wording (owner only). The owner publishes a new version; every version is kept, and new visits use the newest.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const area = { width: '100%', padding: 14, fontSize: 16, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box', lineHeight: 1.5 };
const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };

export default function ConsentSettings() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const tok = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

  async function load() {
    const res = await fetch('/api/consent', { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not load the consent wording.'); return; }
    setData(d); setText(d.active?.body || '');
  }
  useEffect(() => { (async () => { const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; } setRole(r); await load(); })(); }, [router]);

  async function publish() {
    setBusy(true); setMsg('');
    const res = await fetch('/api/consent', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tok()}` }, body: JSON.stringify({ body: text }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || 'Could not publish. Please try again.'); return; }
    setMsg(`Published as ${d.version}. New visits will use this version. Existing records keep the version they were signed under.`);
    await load();
  }

  if (role === undefined) return <p style={{ padding: 24 }}>Checking access…</p>;
  if (role !== 'owner') return <main style={{ padding: 24 }}><p>Only the owner can edit the consent wording.</p><a href="/clinic">Back</a></main>;
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <a href="/clinic" style={{ color: '#5b2a8c' }}>← Back</a>
      <h1 style={{ fontWeight: 500 }}>Consent wording</h1>
      <p style={{ color: '#6f6581' }}>Clients agree to this text before every visit. The two agreements (treatment, and record keeping) are always shown as tick boxes in the app, so they stay required.</p>
      {msg && <p role="status" style={{ background: '#e6f4ea', color: '#1e5b2e', padding: 12, borderRadius: 12 }}>{msg}</p>}
      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Current wording {data?.active ? `(${data.active.version})` : ''}</h2>
        <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} style={area} aria-label="Consent wording" />
        <p style={{ fontSize: 13, color: '#6f6581' }}>{text.trim().length} characters (200 to 8000)</p>
        <button disabled={busy || text.trim().length < 200 || text.trim() === (data?.active?.body || '').trim()} onClick={publish} style={{ padding: '14px 22px', borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 16, opacity: busy ? 0.6 : 1 }}>{busy ? 'Publishing…' : 'Publish as a new version'}</button>
      </section>
      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Version history</h2>
        {(data?.versions || []).map((v) => (
          <div key={v.version} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0e8f7' }}>
            <span>{v.version}{v.is_active ? ' (current)' : ''}</span><span style={{ color: '#6f6581' }}>{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
