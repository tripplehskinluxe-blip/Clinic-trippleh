import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptJson, encryptJson, lookupHash } from '@/lib/crypto.js';
import { validateClient } from '@/lib/client-form.js';
import { duplicateDecision } from '@/lib/duplicates.js';
import { logAccess } from '@/lib/access-log.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function db(req, token) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
}
const tokenOf = (req) => { const h = req.headers.get('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; };

// One client: every contact and personal detail, and her visits with their consent, signature and assessment status.
// Removed clients are visible to the owner only. Every view is logged first.
export async function GET(req, { params }) {
  const token = tokenOf(req);
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const sb = db(req, token);
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

// Edit the contact and personal details. Same checks as adding a client, and a duplicate is stopped unless confirmed.
export async function PUT(req, { params }) {
  const token = tokenOf(req);
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const v = validateClient(body || {});
  if (!v.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', fields: v.errors }, { status: 400 });
  let details_enc, lookup;
  try { details_enc = encryptJson(v.value); lookup = lookupHash(v.value.full_name, v.value.phone); }
  catch { return NextResponse.json({ error: 'The spa system is not fully set up yet. Please contact support.' }, { status: 503 }); }
  const sb = db(req, token);
  const dup = await sb.rpc('clinic_find_duplicate', { p_lookup_hash: lookup, p_except: id });
  if (dup.error) return NextResponse.json({ error: 'Could not check for duplicates. Please try again.' }, { status: 500 });
  if (duplicateDecision(dup.data === true, body.confirm_duplicate === true) === 'ask') {
    return NextResponse.json({ error: 'Another client has this name and phone number. If this is a different person, tap "Save anyway".', duplicate: true }, { status: 409 });
  }
  const { error } = await sb.rpc('clinic_update_client', { p_client: id, p_details_enc: details_enc, p_lookup_hash: lookup });
  if (error) {
    const msg = String(error.message || '');
    if (error.code === '42501') return NextResponse.json({ error: 'You cannot change this client.' }, { status: 403 });
    if (/removed/.test(msg)) return NextResponse.json({ error: 'This client has been removed. Restore her before editing.' }, { status: 409 });
    if (/not found/.test(msg)) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Could not save the changes. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ updated: true });
}
