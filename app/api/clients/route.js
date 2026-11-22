import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptJson, decryptJson, lookupHash } from '@/lib/crypto.js';
import { validateClient } from '@/lib/client-form.js';
import { validateConsent } from '@/lib/consent.js';
import { duplicateDecision } from '@/lib/duplicates.js';
import { summarise } from '@/lib/client-list.js';

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
    console.error('spa: encryption keys are not configured');
    return NextResponse.json({ error: 'The spa system is not fully set up yet. Please contact support.' }, { status: 503 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const dup = await sb.rpc('clinic_find_duplicate', { p_lookup_hash: lookup });
  if (dup.error) return NextResponse.json({ error: 'Could not check for duplicates. Please try again.' }, { status: 500 });
  if (duplicateDecision(dup.data === true, body.confirm_duplicate === true) === 'ask') {
    return NextResponse.json({ error: 'A client with this name and phone number already exists. If this is a different person, tap "Add anyway".', duplicate: true }, { status: 409 });
  }
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
  const { data: vis } = await sb.from('clinic_visits').select('id').eq('client_id', data).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ id: data, visit_id: vis?.id || null }, { status: 201 });
}

// The list of clients this person may see (RLS decides: the owner sees all, a therapist sees her assigned clients). Names are decrypted here, on the server.
export async function GET(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const removed = new URL(req.url).searchParams.get('removed') === '1';
  if (removed) { const rr = await sb.rpc('clinic_role'); if (rr.data !== 'owner') return NextResponse.json({ error: 'Only the owner can see removed clients.' }, { status: 403 }); }
  const base = sb.from('clinic_clients').select('id,details_enc,created_at,deleted_at').order('created_at', { ascending: false }).limit(300);
  const cl = await (removed ? base.not('deleted_at', 'is', null) : base.is('deleted_at', null));
  if (cl.error) return NextResponse.json({ error: 'Could not load clients.' }, { status: 500 });
  const ids = (cl.data || []).map((c) => c.id);
  const vi = ids.length
    ? await sb.from('clinic_visits').select('id,client_id,status,created_at').in('client_id', ids).order('created_at', { ascending: false })
    : { data: [] };
  const clients = summarise(cl.data || [], vi.data || [], decryptJson).map((c, i) => ({ ...c, deleted_at: cl.data?.[i]?.deleted_at || null }));
  return NextResponse.json({ clients }, { headers: { 'Cache-Control': 'no-store' } });
}
