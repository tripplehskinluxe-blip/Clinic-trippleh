import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptJson } from '@/lib/crypto.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One client: every contact and personal detail, plus her visits. Read as the signed-in person; the database decides what they may see.
export async function GET(req, { params }) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const cl = await sb.from('clinic_clients').select('id,details_enc,created_at').eq('id', id).is('deleted_at', null).maybeSingle();
  if (cl.error || !cl.data) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  let details = null;
  try { details = decryptJson(cl.data.details_enc); } catch { details = null; }
  const vi = await sb.from('clinic_visits').select('id,status,created_at').eq('client_id', id).order('created_at', { ascending: false });
  const co = await sb.from('clinic_consents').select('visit_id,wording_version,captured_at').eq('client_id', id);
  const byVisit = new Map((co.data || []).map((c) => [c.visit_id, c]));
  const visits = (vi.data || []).map((v) => ({ id: v.id, status: v.status, created_at: v.created_at, consent_version: byVisit.get(v.id)?.wording_version || null, consent_at: byVisit.get(v.id)?.captured_at || null }));
  return NextResponse.json({ client: { id: cl.data.id, created_at: cl.data.created_at, details, unreadable: !details }, visits }, { headers: { 'Cache-Control': 'no-store' } });
}
