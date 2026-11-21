import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateConsent } from '@/lib/consent.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A new visit for an existing client. The client agrees to the current wording again, and signs again, for each visit.
export async function POST(req, { params }) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const c = validateConsent(body?.consent || {});
  if (!c.ok) return NextResponse.json({ error: 'Please check the consent.', fields: c.errors }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc('clinic_start_visit', { p_client: id, p_wording: body.consent.version, p_treatment: true, p_storage: true, p_signature: body.consent.signature_path });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'You cannot add a visit for this client.' }, { status: 403 });
    if (/wording has changed/.test(String(error.message))) return NextResponse.json({ error: 'The consent wording has changed. Please take consent again.', retake_consent: true }, { status: 409 });
    return NextResponse.json({ error: 'Could not start the visit. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ visit_id: data }, { status: 201 });
}
