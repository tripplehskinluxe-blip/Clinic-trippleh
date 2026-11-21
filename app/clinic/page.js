'use client';
// The spa home page: the list of clients, their form status, and buttons to add a client or open a form.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const STATUS = { 'no form': 'No form yet', draft: 'Form in progress', complete: 'Form completed' };
const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 16, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' };

export default function SpaHome() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);
  const [saved, setSaved] = useState(false);
  const [clients, setClients] = useState(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await clinicRoleNow();
      if (!live) return;
      if (!r) { router.replace('/sign-in'); return; }
      setRole(r);
      setSaved(new URLSearchParams(window.location.search).get('saved') === '1');
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch('/api/clients', { headers: { Authorization: `Bearer ${s?.session?.access_token || ''}` }, cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || 'Could not load clients.'); setClients([]); return; }
      setClients(d.clients || []);
    })();
    return () => { live = false; };
  }, [router]);

  async function signOut() { await supabase.auth.signOut(); router.replace('/sign-in'); }

  if (role === undefined) return <p style={{ padding: 24 }}>Checking your access…</p>;
  const shown = (clients || []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/logo.png" alt="Heeshas Healing Hands Spa" width="64" height="64" style={{ borderRadius: '50%' }} />
          <h1 style={{ fontWeight: 500, margin: 0 }}>Heeshas Healing Hands Spa</h1>
        </div>
        <button onClick={signOut} style={{ padding: '10px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Sign out</button>
      </header>
      {saved && <p role="status" style={{ background: '#e6f4ea', color: '#1e5b2e', padding: 14, borderRadius: 12, marginTop: 20 }}>Saved.</p>}
      <p style={{ color: '#6f6581' }}>Signed in as <b>{role}</b>.</p>
      <a href="/clinic/clients/new" style={{ display: 'inline-block', marginTop: 4, padding: '14px 22px', borderRadius: 999, background: '#5b2a8c', color: '#fff', textDecoration: 'none' }}>Add a client</a>

      <h2 style={{ fontWeight: 500, marginTop: 32 }}>Clients</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search clients" style={{ width: '100%', padding: '12px 14px', fontSize: 17, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' }} />
      {msg && <p role="alert" style={{ color: '#7a1f1f' }}>{msg}</p>}
      {clients === null && <p>Loading clients…</p>}
      {clients && clients.length === 0 && <p style={{ color: '#6f6581' }}>No clients yet. Tap Add a client to start.</p>}
      {clients && clients.length > 0 && shown.length === 0 && <p style={{ color: '#6f6581' }}>No client matches that name.</p>}
      {shown.map((c) => (
        <div key={c.id} style={card}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{c.name}</div>
            <div style={{ color: '#6f6581', fontSize: 14 }}>Registered {new Date(c.registered).toLocaleDateString('en-GB')} · {STATUS[c.form_status] || c.form_status}</div>
          </div>
          {c.visit_id && <a href={`/clinic/visits/${c.visit_id}`} style={{ padding: '10px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', color: '#5b2a8c', textDecoration: 'none' }}>Open form</a>}
        </div>
      ))}
      <div style={{ marginTop: 28 }}><button onClick={signOut} style={{ display: 'none' }}>hidden</button></div>
    </main>
  );
}
