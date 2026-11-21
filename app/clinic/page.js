'use client';
// The spa's home page (the owner's). Access is checked here too, but the real protection is in the database.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

export default function SpaHome() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);   // undefined = checking, null = not allowed
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await clinicRoleNow();
      if (!live) return;
      if (!r) { router.replace('/sign-in'); return; }
      setRole(r);
      setSaved(new URLSearchParams(window.location.search).get('saved') === '1');
    })();
    return () => { live = false; };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/sign-in');
  }

  if (role === undefined) return <p style={{ padding: 24 }}>Checking your access…</p>;
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/logo.png" alt="Heeshas Healing Hands Spa" width="64" height="64" style={{ borderRadius: '50%' }} />
          <h1 style={{ fontWeight: 500, margin: 0 }}>Heeshas Healing Hands Spa</h1>
        </div>
        <button onClick={signOut} style={{ padding: '10px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Sign out</button>
      </header>
      {saved && <p role="status" style={{ background: '#e6f4ea', color: '#1e5b2e', padding: 14, borderRadius: 12, marginTop: 20 }}>Client saved. Their record is stored securely.</p>}
      <p style={{ marginTop: 24 }}>Signed in as: <b>{role}</b>. Client records will appear here.</p>
      <a href="/clinic/clients/new" style={{ display: 'inline-block', marginTop: 16, padding: '14px 22px', borderRadius: 999, background: '#5b2a8c', color: '#fff', textDecoration: 'none' }}>Add a client</a>
    </main>
  );
}
