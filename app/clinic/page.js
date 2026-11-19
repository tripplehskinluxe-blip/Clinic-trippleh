'use client';
// The owner's home page. Access is checked here too, but the real protection is in the database.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

export default function ClinicHome() {
  const router = useRouter();
  const [role, setRole] = useState(undefined);   // undefined = checking, null = not allowed

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await clinicRoleNow();
      if (!live) return;
      if (!r) { router.replace('/sign-in'); return; }
      setRole(r);
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontWeight: 500 }}>Clinic</h1>
        <button onClick={signOut} style={{ padding: '10px 18px', borderRadius: 999, border: '1.5px solid #5b2a8c', background: '#fff', color: '#5b2a8c' }}>Sign out</button>
      </header>
      <p>Signed in as: <b>{role}</b>. Client records will appear here.</p>
    </main>
  );
}
