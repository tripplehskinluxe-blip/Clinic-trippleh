import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptJson } from '@/lib/crypto.js';
import { logAccess } from '@/lib/access-log.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One client: every contact and personal detail, and her visits with their consent, signature and assessment status.
// Removed clients are visible to the owner only (so they can be restored). Every view is logged first.
export async function GET(req, { params }) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const cl = await sb.from('clinic_clients').select('id,details_enc,created_at,deleted_at,delete_reason').eq('id', id).maybeSingle();
  if (cl.error || !cl.data) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const role = await sb.rpc('clinic_role');
  if (cl.data.deleted_at && role.data !== 'owner') return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  if (!(await logAccess(sb, 'viewed', 'client', id))) return NextResponse.json({ error: 'The access log is not available, so this record cannot be shown. Please try again.' }, { status: 503 });
  let details = null;
  try { details = decryptJson(cl.data.details_enc); } catch { details = null; }
  const vi = await sb.from('clinic_visits').select('id,status,created_at,assessment_enc').eq('client_id', id).order('created_at', { ascending: false });
  const co = await sb.from('clinic_consents').select('visit_id,wording_version,captured_at,signature_path').eq('client_id', id);
  const byVisit = new Map((co.data || []).map((c) => [c.visit_id, c]));
  const visits = (vi.data || []).map((v) => {
    const c = byVisit.get(v.id);
    return { id: v.id, status: v.status, created_at: v.created_at, consent_version: c?.wording_version || null, consent_at: c?.captured_at || null, signed: !!c?.signature_path, assessment_recorded: !!v.assessment_enc };
  });
  return NextResponse.json({ client: { id: cl.data.id, created_at: cl.data.created_at, details, unreadable: !details, deleted_at: cl.data.deleted_at, delete_reason: cl.data.delete_reason }, visits, role: role.data || null }, { headers: { 'Cache-Control': 'no-store' } });
}
