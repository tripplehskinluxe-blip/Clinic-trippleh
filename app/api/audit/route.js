import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The audit log, for the owner only. Read-only. Names come from the team list. The database limits what can be read.
const clean = (s) => String(s || '').replace(/[%_,()*"\\]/g, '').trim().slice(0, 60);
const PAGE = 50;

export async function GET(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const role = await sb.rpc('clinic_role');
  if (role.data !== 'owner') return NextResponse.json({ error: 'Only the owner can view the audit log.' }, { status: 403 });
  const u = new URL(req.url);
  const page = Math.max(0, Number.parseInt(u.searchParams.get('page') || '0', 10) || 0);
  let q = sb.from('clinic_audit').select('id,at,actor,action,entity,entity_id,detail', { count: 'exact' }).order('at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  if (clean(u.searchParams.get('action'))) q = q.ilike('action', `%${clean(u.searchParams.get('action'))}%`);
  if (clean(u.searchParams.get('entity'))) q = q.ilike('entity', `%${clean(u.searchParams.get('entity'))}%`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('from') || '')) q = q.gte('at', new Date(`${u.searchParams.get('from')}T00:00:00`).toISOString());
  if (/^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('to') || '')) q = q.lte('at', new Date(`${u.searchParams.get('to')}T23:59:59.999`).toISOString());
  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: 'Could not load the audit log.' }, { status: 500 });
  const st = await sb.from('clinic_staff').select('user_id,role,display_name');
  const names = {};
  for (const s of st.data || []) names[s.user_id] = s.role === 'owner' ? 'Owner' : (s.display_name || 'Therapist');
  return NextResponse.json({ rows: data || [], total: count || 0, page, pageSize: PAGE, names }, { headers: { 'Cache-Control': 'no-store' } });
}
