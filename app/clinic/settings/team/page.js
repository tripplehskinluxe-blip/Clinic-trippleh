'use client';
// The team (owner only): add a therapist, switch her on or off, and choose which clients she can see.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const card = { background: '#fff', border: '1.5px solid #e1d6ee', borderRadius: 14, padding: 18, marginTop: 16 };
const input = { width: '100%', padding: 12, fontSize: 16, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box', marginTop: 6 };
const btn = { padding: '12px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', color: '#5b2a8c', background: '#fff', cursor: 'pointer', fontSize: 15 };
const solid = { ...btn, background: '#5b2a8c', color: '#fff' };

export default function Team() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [msg, setMsg] = useState('');
  const [add, setAdd] = useState({ user_id: '', name: '', email: '' });
  const [errs, setErrs] = useState({});
  const [pick, setPick] = useState({ user_id: '', client_id: '' });
  const tok = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

  async function load() {
    const [t, c] = await Promise.all([
      fetch('/api/team', { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/clients', { headers: { Authorization: `Bearer ${await tok()}` }, cache: 'no-store' }).then((r) => r.json()),
    ]);
    if (t.error) { setMsg(t.error); return; }
    setData(t); setClients(c.clients || []);
  }
  useEffect(() => { (async () => { const r = await clinicRoleNow(); if (!r) { router.replace('/sign-in'); return; } setRole(r); if (r === 'owner') await load(); })(); }, [router]);

  async function post(body) {
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tok()}` }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    return { ok: res.ok, d };
  }
  async function addTherapist(e) {
    e.preventDefault(); setMsg(''); setErrs({});
    const r = await post(add);
    if (!r.ok) { setErrs(r.d.fields || {}); setMsg(r.d.error || 'Could not add the therapist.'); return; }
    setAdd({ user_id: '', name: '', email: '' }); setMsg('Therapist added. Her access is on, and you choose her clients below.'); await load();
  }
  async function setActive(userId, active) {
    const r = await post({ action: 'active', user_id: userId, active });
    if (!r.ok) { setMsg(r.d.error || 'Could not change that.'); return; }
    await load();
  }
  async function assign(userId, clientId, assigned) {
    const res = await fetch('/api/team/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tok()}` }, body: JSON.stringify({ user_id: userId, client_id: clientId, assigned }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Could not change that assignment.'); return; }
    await load();
  }

  if (role === undefined) return <p style={{ padding: 24 }}>Checking access…</p>;
  if (role !== 'owner') return <main style={{ padding: 24 }}><p>Only the owner can manage the team.</p><a href="/clinic">Back</a></main>;
  const therapists = (data?.staff || []).filter((s) => s.role === 'therapist');
  const clientName = (id) => clients.find((c) => c.id === id)?.name || 'Client';
  const therapistName = (id) => therapists.find((t) => t.user_id === id)?.display_name || 'Therapist';
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <a href="/clinic" style={{ color: '#5b2a8c' }}>← Back</a>
      <h1 style={{ fontWeight: 500 }}>Team</h1>
      <p style={{ color: '#6f6581' }}>Create a therapist's login in Supabase first (Authentication, Users, Add user). Then paste her user ID here.</p>
      {msg && <p role="status" style={{ background: '#e6f4ea', color: '#1e5b2e', padding: 12, borderRadius: 12 }}>{msg}</p>}

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Therapists</h2>
        {therapists.length === 0 && <p style={{ color: '#6f6581' }}>No therapists yet.</p>}
        {therapists.map((t) => (
          <div key={t.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid #f0e8f7' }}>
            <div><div style={{ fontWeight: 500 }}>{t.display_name || 'No name yet'}</div><div style={{ fontSize: 13, color: '#6f6581' }}>{t.email || 'No email'} · {t.active ? 'Access on' : 'Access off'}</div></div>
            <button onClick={() => setActive(t.user_id, !t.active)} style={t.active ? btn : solid}>{t.active ? 'Switch access off' : 'Switch access on'}</button>
          </div>
        ))}
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Add a therapist</h2>
        <form onSubmit={addTherapist}>
          <label style={{ display: 'block' }}>User ID (from Supabase)<input value={add.user_id} onChange={(e) => setAdd({ ...add, user_id: e.target.value })} style={input} />{errs.user_id && <div style={{ color: '#7a1f1f', fontSize: 14 }}>{errs.user_id}</div>}</label>
          <label style={{ display: 'block', marginTop: 12 }}>Name<input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} style={input} />{errs.name && <div style={{ color: '#7a1f1f', fontSize: 14 }}>{errs.name}</div>}</label>
          <label style={{ display: 'block', marginTop: 12 }}>Email (optional)<input value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} style={input} />{errs.email && <div style={{ color: '#7a1f1f', fontSize: 14 }}>{errs.email}</div>}</label>
          <button style={{ ...solid, marginTop: 14 }}>Add therapist</button>
        </form>
      </section>

      <section style={card}>
        <h2 style={{ fontWeight: 500, marginTop: 0 }}>Which clients each therapist can see</h2>
        {therapists.length === 0 || clients.length === 0 ? <p style={{ color: '#6f6581' }}>Add a therapist and a client first.</p> : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={pick.user_id} onChange={(e) => setPick({ ...pick, user_id: e.target.value })} style={{ ...input, width: 'auto', flex: 1 }}>
                <option value="">Choose a therapist</option>{therapists.map((t) => <option key={t.user_id} value={t.user_id}>{t.display_name || t.user_id}</option>)}
              </select>
              <select value={pick.client_id} onChange={(e) => setPick({ ...pick, client_id: e.target.value })} style={{ ...input, width: 'auto', flex: 1 }}>
                <option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button disabled={!pick.user_id || !pick.client_id} onClick={() => assign(pick.user_id, pick.client_id, true)} style={solid}>Give access</button>
              <button disabled={!pick.user_id || !pick.client_id} onClick={() => assign(pick.user_id, pick.client_id, false)} style={btn}>Take access away</button>
            </div>
          </>
        )}
        <h3 style={{ fontWeight: 500, marginTop: 20 }}>Current access</h3>
        {(data?.assignments || []).length === 0 && <p style={{ color: '#6f6581' }}>No client is assigned yet.</p>}
        {(data?.assignments || []).map((a) => (
          <div key={`${a.user_id}-${a.client_id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0e8f7' }}>
            <span>{therapistName(a.user_id)} → {clientName(a.client_id)}</span>
            <button onClick={() => assign(a.user_id, a.client_id, false)} style={btn}>Take away</button>
          </div>
        ))}
      </section>
    </main>
  );
}
