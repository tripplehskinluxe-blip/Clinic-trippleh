'use client';
// One client's record: details, owner actions (remove, restore), and every visit with its status, consent, signature and assessment.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import { CONTACT } from '@/lib/preview.js';

const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };
const btn = { padding: '12px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', color: '#5b2a8c', background: '#fff', textDecoration: 'none', display: 'inline-block', cursor: 'pointer', fontSize: 15 };
const solid = { ...btn, background: '#5b2a8c', color: '#fff' };
const STATUS = { draft: 'Form in progress', complete: 'Form completed' };
const date = (d) => new Date(d).toLocaleDateString('en-GB');
const tok = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

export default function Record({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  async function load() {
    const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not open this record.'); return; }
    setData(d);
  }
  useEffect(() => {
    if (!id) return;
    (async () => { const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; } await load(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  async function remove() {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/clients/${id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tok()}` }, body: JSON.stringify({ reason }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || 'Could not remove the client.'); return; }
    setReason(''); setSure(false); await load();
  }
  async function restore() {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/clients/${id}/restore`, { method: 'POST', headers: { Authorization: `Bearer ${await tok()}` } });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || 'Could not restore the client.'); return; }
    await load();
  }
  async function downloadPdf(visitId) {
    setMsg('');
    const res = await fetch(`/api/visits/${visitId}/pdf`, { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Could not create the PDF.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `consultation-${visitId.slice(0, 8)}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (msg && !data) return <main style={{ padding: 24 }}><p role="alert" style={{ color: '#7a1f1f' }}>{msg}</p><a href="/clinic">Back to clients</a></main>;
  if (!data) return <p style={{ padding: 24 }}>Opening the record…</p>;
  const det = data.client.details || {};
  const removed = !!data.client.deleted_at;
  const owner = data.role === 'owner';
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <a href="/clinic" style={{ color: '#5b2a8c' }}>← All clients</a>
      <h1 style={{ fontWeight: 500, marginTop: 8 }}>{det.full_name || 'Record needs checking'}</h1>
      {data.client.unreadable && <p role="alert" style={{ color: '#7a1f1f' }}>This record could not be read. Please contact support before using it.</p>}
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 12, borderRadius: 12 }}>{msg}</p>}

      {removed && (
        <section style={{ ...card, background: '#fff4e0', borderColor: '#e0a040' }}>
          <h2 style={{ fontWeight: 500, marginTop: 0 }}>This client has been removed</h2>
          <p style={{ margin: '4px 0' }}>Removed on {date(data.client.deleted_at)}. Reason: {data.client.delete_reason || '—'}</p>
          <p style={{ margin: '4px 0', color: '#6f6581' }}>The record is kept, and is hidden from the client list.</p>
          {owner && <button disabled={busy} onClick={restore} style={solid}>Restore this client</button>}
        </section>
      )}

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontWeight: 500, marginTop: 0 }}>Contact and personal details</h2>
          {!removed && <a href={`/clinic/clients/${id}/edit`} style={btn}>Edit details</a>}
        </div>
        {CONTACT.map(([k, label]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0e8f7' }}>
            <span style={{ color: '#6f6581' }}>{label}</span><span style={{ textAlign: 'right' }}>{det[k] ? String(det[k]) : '—'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
          <span style={{ color: '#6f6581' }}>Lifestyle</span><span>{det.lifestyle === 'active' ? 'Active' : det.lifestyle === 'sedentary' ? 'Sedentary' : '—'}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6f6581' }}>Registered {date(data.client.created_at)}</p>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Visit history</h2>
        {data.visits.length === 0 && <p style={{ color: '#6f6581' }}>No visits yet.</p>}
        {data.visits.map((v) => (
          <div key={v.id} style={{ padding: '14px 0', borderBottom: '1px solid #f0e8f7' }}>
            <div style={{ fontWeight: 500 }}>Visit on {date(v.created_at)}</div>
            <div style={{ fontSize: 14, color: '#6f6581', marginTop: 4 }}>
              {STATUS[v.status] || v.status} · Consent {v.consent_version || 'not recorded'}{v.consent_at ? ` on ${date(v.consent_at)}` : ''} · Signature {v.signed ? 'on file' : 'not on file'} · Assessment {v.assessment_recorded ? 'recorded' : 'not yet recorded'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <a href={`/clinic/visits/${v.id}`} style={btn}>Open form</a>
              <a href={`/clinic/visits/${v.id}/assessment`} style={btn}>Assessment</a>
              <a href={`/clinic/visits/${v.id}/preview`} style={btn}>Preview</a>
              <button onClick={() => downloadPdf(v.id)} style={solid}>Download PDF</button>
            </div>
          </div>
        ))}
        {!removed && <a href={`/clinic/clients/${id}/new-visit`} style={{ display: 'inline-block', marginTop: 16, padding: '14px 22px', borderRadius: 999, background: '#5b2a8c', color: '#fff', textDecoration: 'none' }}>Start a new visit</a>}
      </section>

      {owner && !removed && (
        <section style={{ ...card, borderColor: '#d9a0a0' }}>
          <h2 style={{ fontWeight: 500, marginTop: 0 }}>Remove this client</h2>
          <p style={{ color: '#6f6581', marginTop: 0 }}>The client is hidden from the list. Nothing is erased, and you can restore her at any time.</p>
          <label style={{ display: 'block' }}>Reason (required, kept on record)
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: 12, fontSize: 16, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box', marginTop: 6 }} />
          </label>
          <label style={{ display: 'flex', gap: 10, marginTop: 12 }}><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} /><span>I understand this hides the record and does not erase it.</span></label>
          <button disabled={busy || !sure || reason.trim().length < 3} onClick={remove} style={{ ...btn, marginTop: 12, borderColor: '#7a1f1f', color: '#7a1f1f', opacity: sure && reason.trim().length >= 3 ? 1 : 0.5 }}>Remove client</button>
        </section>
      )}
    </main>
  );
}
