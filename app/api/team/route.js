import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validTeamMember } from '@/lib/team.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The owner's team: therapists (names, emails, on/off) and which client each therapist can see. The database checks every step.
function db(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
}
const denied = () => NextResponse.json({ error: 'Only the owner can manage the team.' }, { status: 403 });

export async function GET(req) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const role = await sb.rpc('clinic_role');
  if (role.data !== 'owner') return denied();
  const st = await sb.from('clinic_staff').select('user_id,role,active,display_name,email').order('created_at', { ascending: true });
  const as = await sb.from('clinic_assignments').select('user_id,client_id');
  if (st.error || as.error) return NextResponse.json({ error: 'Could not load the team.' }, { status: 500 });
  return NextResponse.json({ staff: st.data || [], assignments: as.data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === 'active') {
    if (typeof body.active !== 'boolean' || !/^[0-9a-f-]{36}$/i.test(body.user_id || '')) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    const { error } = await sb.rpc('clinic_set_staff', { p_user: body.user_id, p_role: 'therapist', p_active: body.active });
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only the owner can change the team.' : 'Could not change that. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
    return NextResponse.json({ saved: true });
  }
  const v = validTeamMember(body);
  if (!v.ok) return NextResponse.json({ error: 'Please check the highlighted fields.', fields: v.errors }, { status: 400 });
  const add = await sb.rpc('clinic_set_staff', { p_user: v.value.user_id, p_role: 'therapist', p_active: true });
  if (add.error) return NextResponse.json({ error: add.error.code === '42501' ? 'Only the owner can add a therapist.' : 'Could not add the therapist. Check the user ID, and that the account exists.' }, { status: add.error.code === '42501' ? 403 : 400 });
  const det = await sb.rpc('clinic_set_staff_details', { p_user: v.value.user_id, p_name: v.value.name, p_email: v.value.email });
  if (det.error) return NextResponse.json({ error: 'The therapist was added, but the name or email could not be saved: ' + (det.error.message || '') }, { status: 400 });
  return NextResponse.json({ saved: true }, { status: 201 });
}
