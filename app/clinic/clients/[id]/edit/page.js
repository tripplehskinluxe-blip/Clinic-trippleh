'use client';
// Edit a client's contact and personal details. The same checks as adding a client.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';
import ClientFields from '@/components/ClientFields.js';

const btn = { width: '100%', padding: 16, marginTop: 20, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', fontSize: 18 };
const EMPTY = { full_name: '', dob: '', phone: '', email: '', occupation: '', emergency_name: '', emergency_phone: '', gp_address: '', last_doctor_visit: '', lifestyle: '' };

export default function EditClient({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [ready, setReady] = useState(false);
  const [f, setF] = useState(null);
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');
  const [dup, setDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const tok = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

  useEffect(() => { (async () => { const p = await params; setId(p.id); })(); }, [params]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; }
      const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not open this record.'); setReady(true); return; }
      if (d.client.deleted_at) { setMsg('This client has been removed. Restore her before editing.'); setReady(true); return; }
      const det = d.client.details || {};
      setF({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, det[k] ? String(det[k]) : ''])) });
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(confirmDuplicate) {
    setBusy(true); setMsg(''); setErrs({});
    const res = await fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tok()}` }, body: JSON.stringify({ ...f, confirm_duplicate: confirmDuplicate === true }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 409 && d.duplicate) { setDup(true); setMsg(d.error); return; }
    if (!res.ok) { setErrs(d.fields || {}); setMsg(d.error || 'Could not save the changes.'); return; }
    router.replace(`/clinic/clients/${id}`);
  }

  if (!ready) return <p style={{ padding: 24 }}>Opening the record…</p>;
  if (!f) return <main style={{ padding: 24 }}><p role="alert" style={{ color: '#7a1f1f' }}>{msg}</p><a href={id ? `/clinic/clients/${id}` : '/clinic'}>Back</a></main>;
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <a href={`/clinic/clients/${id}`} style={{ color: '#5b2a8c' }}>← Back to the record</a>
      <h1 style={{ fontWeight: 500 }}>Edit details</h1>
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 14, borderRadius: 12 }}>{msg}</p>}
      <form onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <ClientFields f={f} set={set} errs={errs} />
        <button disabled={busy} style={btn}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
      {dup && <button onClick={() => save(true)} disabled={busy} style={{ ...btn, background: '#fff', color: '#7a1f1f', border: '1.5px solid #7a1f1f' }}>Save anyway (a different person)</button>}
    </main>
  );
}
