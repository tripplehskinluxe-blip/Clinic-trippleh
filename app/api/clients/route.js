import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptJson, lookupHash } from '@/lib/crypto.js';
import { validateClient } from '@/lib/client-form.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adds a client. The signed-in person's token is used, so the database rules decide whether they may add a client.
// Nothing personal is logged.
export async function POST(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const v = validateClient(body || {});
  if (!v.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', fields: v.errors }, { status: 400 });

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
  const { data, error } = await sb.rpc('clinic_create_client', { p_details_enc: details_enc, p_lookup_hash: lookup });
  if (error) {
    const forbidden = error.code === '42501';
    return NextResponse.json({ error: forbidden ? 'Your account cannot add clients.' : 'Could not save the client. Please try again.' }, { status: forbidden ? 403 : 500 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
