import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptJson, decryptJson } from '@/lib/crypto.js';
import { cleanForm, validateForm, contraindications } from '@/lib/visit-form.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The signed-in person's token is used every time, so the database decides who may read or change a visit.
function db(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(req, { params }) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await sb.from('clinic_visits').select('id,status,form_enc,assessment_enc').eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  let form = null;
  try { form = data.form_enc ? cleanForm(decryptJson(data.form_enc)) : cleanForm({}); }
  catch { return NextResponse.json({ error: 'This record could not be read. Please contact support.' }, { status: 500 }); }
  return NextResponse.json({ status: data.status, form, contraindications: contraindications(form), assessment_enc: data.assessment_enc }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req, { params }) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.complete === true ? 'complete' : 'draft';
  const form = cleanForm(body?.form || {});
  if (status === 'complete') {
    const v = validateForm(form);
    if (!v.ok) return NextResponse.json({ error: 'Please answer the highlighted questions before completing.', fields: v.errors }, { status: 400 });
  }
  let form_enc;
  try { form_enc = encryptJson(form); }
  catch { return NextResponse.json({ error: 'The spa system is not fully set up yet. Please contact support.' }, { status: 503 }); }
  // the assessment is kept exactly as it is; it is written in its own step
  const current = await sb.from('clinic_visits').select('assessment_enc').eq('id', id).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  const { error } = await sb.rpc('clinic_save_visit', { p_visit: id, p_form_enc: form_enc, p_assessment_enc: current.data.assessment_enc, p_status: status });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'You cannot change this visit.' : 'Could not save. Your answers are kept on this screen. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ status, contraindications: contraindications(form) });
}
