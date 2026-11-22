'use client';
// The audit log (owner only): every sensitive action, who did it, and when. Read-only.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const input = { padding: '10px 12px', border: '1.5px solid #e1d6ee', borderRadius: 10, fontSize: 14 };
const ACTIONS = { client_created: 'Client added', visit_started: 'Visit started', visit_saved: 'Form saved', client_updated: 'Details edited', client_deleted: 'Client removed', client_restored: 'Client restored', viewed: 'Viewed', previewed: 'Previewed', pdf_downloaded: 'PDF downloaded', shared: 'Shared', consent_published: 'Consent wording published', assigned: 'Access given', unassigned: 'Access taken away', staff_set: 'Team changed', staff_details_set: 'Therapist details saved', assessment_saved: 'Assessment saved' };

export default function Audit() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const tok = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

  useEffect(() => { (async () => { const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; } setRole(r); })(); }, [router]);
  useEffect(() => {
    if (role !== 'owner') return;
    (async () => {
      const qs = new URLSearchParams({ page: String(page) });
      if (action) qs.set('action', action);
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await fetch(`/api/audit?${qs}`, { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not load the audit log.'); return; }
      setMsg(''); setData(d);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, page, action, from, to]);

  if (role === undefined) return <p style={{ padding: 24 }}>Checking access…</p>;
  if (role !== 'owner') return <main style={{ padding: 24 }}><p>Only the owner can view the audit log.</p><a href="/clinic">Back</a></main>;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <a href="/clinic" style={{ color: '#5b2a8c' }}>← Back</a>
      <h1 style={{ fontWeight: 500 }}>Audit log</h1>
      <p style={{ color: '#6f6581' }}>Every sensitive action, who did it, and when. Entries cannot be changed or deleted.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select value={action} onChange={(e) => { setPage(0); setAction(e.target.value); }} style={input} aria-label="Filter by action">
          <option value="">All actions</option>{Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} style={input} aria-label="From date" />
        <input type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} style={input} aria-label="To date" />
      </div>
      {msg && <p role="alert" style={{ color: '#7a1f1f' }}>{msg}</p>}
      {!data && !msg && <p>Loading…</p>}
      {data && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e1d6ee' }}><th style={{ padding: 8 }}>When</th><th style={{ padding: 8 }}>Who</th><th style={{ padding: 8 }}>What</th><th style={{ padding: 8 }}>On</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0e8f7' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-GB')}</td>
                  <td style={{ padding: 8 }}>{r.actor ? (data.names[r.actor] || 'Staff') : 'System'}</td>
                  <td style={{ padding: 8 }}>{ACTIONS[r.action] || r.action}</td>
                  <td style={{ padding: 8 }}>{r.entity}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}</td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={4} style={{ padding: 12, color: '#6f6581' }}>No entries match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} style={btnStyle}>Newer</button>
          <span style={{ fontSize: 14, color: '#6f6581' }}>Page {page + 1} of {pages} · {data.total} entries</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} style={btnStyle}>Older</button>
        </div>
      )}
    </main>
  );
}
const btnStyle = { padding: '10px 16px', borderRadius: 999, border: '1.5px solid #5b2a8c', color: '#5b2a8c', background: '#fff', cursor: 'pointer' };
