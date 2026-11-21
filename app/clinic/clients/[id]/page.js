'use client';
// One client's record: every contact and personal detail, every visit, and what to do next.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { CONTACT } from '@/lib/preview.js';

const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };
const btn = { padding: '12px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', color: '#5b2a8c', background: '#fff', textDecoration: 'none', display: 'inline-block' };
const STATUS = { draft: 'Form in progress', complete: 'Form completed' };

export default function Record({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` }, cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not open this record.'); return; }
      setData(d);
    })();
  }, [id, router]);

  if (msg) return <main style={{ padding: 24 }}><p role="alert" style={{ color: '#7a1f1f' }}>{msg}</p><a href="/clinic">Back to clients</a></main>;
  if (!data) return <p style={{ padding: 24 }}>Opening the record…</p>;
  const det = data.client.details || {};
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <a href="/clinic" style={{ color: '#5b2a8c' }}>← All clients</a>
      <h1 style={{ fontWeight: 500, marginTop: 8 }}>{det.full_name || 'Record needs checking'}</h1>
      {data.client.unreadable && <p role="alert" style={{ color: '#7a1f1f' }}>This record could not be read. Please contact support before using it.</p>}

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Contact and personal details</h2>
        {CONTACT.map(([k, label]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0e8f7' }}>
            <span style={{ color: '#6f6581' }}>{label}</span><span style={{ textAlign: 'right' }}>{det[k] ? String(det[k]) : '—'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
          <span style={{ color: '#6f6581' }}>Lifestyle</span><span>{det.lifestyle === 'active' ? 'Active' : det.lifestyle === 'sedentary' ? 'Sedentary' : '—'}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6f6581' }}>Registered {new Date(data.client.created_at).toLocaleDateString('en-GB')}</p>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Visits</h2>
        {data.visits.length === 0 && <p style={{ color: '#6f6581' }}>No visits yet.</p>}
        {data.visits.map((v) => (
          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid #f0e8f7' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Visit on {new Date(v.created_at).toLocaleDateString('en-GB')}</div>
              <div style={{ fontSize: 14, color: '#6f6581' }}>{STATUS[v.status] || v.status}{v.consent_version ? ` · consent ${v.consent_version}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`/clinic/visits/${v.id}`} style={btn}>Open form</a>
              <a href={`/clinic/visits/${v.id}/preview`} style={btn}>Preview</a>
            </div>
          </div>
        ))}
        <a href={`/clinic/clients/${id}/new-visit`} style={{ display: 'inline-block', marginTop: 16, padding: '14px 22px', borderRadius: 999, background: '#5b2a8c', color: '#fff', textDecoration: 'none' }}>Start a new visit</a>
      </section>
    </main>
  );
}
