import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptJson, decryptJson } from '@/lib/crypto.js';
import { cleanAssessment } from '@/lib/assessment.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const { data, error } = await sb.from('clinic_visits').select('assessment_enc').eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  let assessment;
  try { assessment = data.assessment_enc ? cleanAssessment(decryptJson(data.assessment_enc)) : cleanAssessment({}); }
  catch { return NextResponse.json({ error: 'This assessment could not be read. Please contact support.' }, { status: 500 }); }
  return NextResponse.json({ assessment }, { headers: { 'Cache-Control': 'no-store' } });
}

// Only the assessment is changed here. The consultation form and the visit status are passed through exactly as they are.
export async function PUT(req, { params }) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const assessment = cleanAssessment(body?.assessment || {});
  let assessment_enc;
  try { assessment_enc = encryptJson(assessment); }
  catch { return NextResponse.json({ error: 'The spa system is not fully set up yet. Please contact support.' }, { status: 503 }); }
  const cur = await sb.from('clinic_visits').select('form_enc,status').eq('id', id).maybeSingle();
  if (cur.error || !cur.data) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  const { error } = await sb.rpc('clinic_save_visit', { p_visit: id, p_form_enc: cur.data.form_enc, p_assessment_enc: assessment_enc, p_status: cur.data.status });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'You cannot change this assessment.' : 'Could not save. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ saved: true });
}
