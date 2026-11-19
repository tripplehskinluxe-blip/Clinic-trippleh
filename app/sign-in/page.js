'use client';
// Owner sign-in: email and password, then two-factor (set up once, then a 6-digit code each time).
// The database enforces the real access rules. This page only guides the person through the steps.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clinicRoleNow } from '@/lib/supabase.js';

const box = { width: '100%', padding: '14px 16px', fontSize: 18, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' };
const btn = { width: '100%', padding: '16px', fontSize: 18, borderRadius: 999, border: 0, background: '#5b2a8c', color: '#fff', marginTop: 16 };

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState('password');   // password | enrol | code
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [factorId, setFactorId] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function enterIfAllowed() {
    const role = await clinicRoleNow();
    if (!role) {
      await supabase.auth.signOut();
      setStep('password');
      setMsg('This account does not have clinic access. Please contact the clinic owner.');
      return;
    }
    router.replace('/clinic');
  }

  async function afterPassword() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') return enterIfAllowed();
    const { data: f } = await supabase.auth.mfa.listFactors();
    const verified = (f?.totp || []).find((x) => x.status === 'verified');
    if (verified) { setFactorId(verified.id); setStep('code'); return; }
    for (const x of f?.totp || []) await supabase.auth.mfa.unenroll({ factorId: x.id });   // clear any half-finished set-up
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Clinic owner' });
    if (error) { setMsg('We could not start two-factor set-up. Please try again.'); return; }
    setQr(data.totp.qr_code); setFactorId(data.id); setStep('enrol');
  }

  async function submitPassword(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setMsg('Email or password is incorrect.'); return; }   // same message either way, so emails cannot be guessed
    await afterPassword();
  }

  async function submitCode(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (error) { setMsg('That code is not right or has expired. Use the newest code in your app.'); return; }
    setCode(''); await enterIfAllowed();
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontWeight: 500, marginBottom: 8 }}>Clinic sign in</h1>
      {msg && <p role="alert" style={{ background: '#fbe3e3', color: '#7a1f1f', padding: 14, borderRadius: 12 }}>{msg}</p>}

      {step === 'password' && (
        <form onSubmit={submitPassword}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} style={box} />
          <label htmlFor="pw" style={{ display: 'block', marginTop: 16 }}>Password</label>
          <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={box} />
          <button style={btn} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      )}

      {step === 'enrol' && (
        <div>
          <p>Set up two-factor sign-in. Scan this code with Google Authenticator or Microsoft Authenticator, then type the 6-digit code it shows.</p>
          {qr && <img src={qr} alt="Two-factor set-up code" width="220" height="220" style={{ display: 'block', margin: '16px auto', background: '#fff' }} />}
          <form onSubmit={submitCode}>
            <label htmlFor="code">6-digit code</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} style={box} />
            <button style={btn} disabled={busy}>{busy ? 'Checking…' : 'Finish set-up'}</button>
          </form>
        </div>
      )}

      {step === 'code' && (
        <form onSubmit={submitCode}>
          <p>Enter the 6-digit code from your authenticator app.</p>
          <label htmlFor="code2">6-digit code</label>
          <input id="code2" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} style={box} />
          <button style={btn} disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
        </form>
      )}
    </main>
  );
}
