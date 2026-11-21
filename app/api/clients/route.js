import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptJson, lookupHash } from '@/lib/crypto.js';
import { validateClient } from '@/lib/client-form.js';
import { validateConsent } from '@/lib/consent.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adds a client together with the consent, in one step. Nothing is saved unless the consent is complete and the signature was received.
// The signed-in person's token is used, so the database rules decide what they may do. Nothing personal is logged.
export async function POST(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const v = validateClient(body || {});
  const c = validateConsent(body?.consent || {});
  if (!v.ok || !c.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', fields: { ...v.errors, ...c.errors } }, { status: 400 });

  let details_enc, lookup;
  try {
    details_enc = encryptJson(v.value);
    lookup = lookupHash(v.value.full_name, v.value.phone);
  } catch {
    console.error('clinic: encryption keys are not configured');
    return NextResponse.json({ error: 'The clinic system is not fully set up yet. Please contact support.' }, { status: 503 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc('clinic_create_client_with_consent', {
    p_details_enc: details_enc, p_lookup_hash: lookup,
    p_wording: body.consent.version, p_treatment: true, p_storage: true, p_signature: body.consent.signature_path,
  });
  if (error) {
    const msg = String(error.message || '');
    if (error.code === '42501') return NextResponse.json({ error: 'Your account cannot add clients.' }, { status: 403 });
    if (/wording has changed/.test(msg)) return NextResponse.json({ error: 'The consent wording has changed. Please take consent again.', retake_consent: true }, { status: 409 });
    if (/signature/.test(msg)) return NextResponse.json({ error: 'The signature was not received. Please sign again.', retake_consent: true }, { status: 400 });
    return NextResponse.json({ error: 'Could not save the client. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
