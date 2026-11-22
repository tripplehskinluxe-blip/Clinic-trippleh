import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validAssignment } from '@/lib/team.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The owner gives or takes away a therapist's access to one client.
export async function POST(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const v = validAssignment(await req.json().catch(() => ({})));
  if (!v.ok) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.rpc('clinic_set_assignment', { p_user: v.value.user_id, p_client: v.value.client_id, p_assigned: v.value.assigned });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only the owner can change assignments.' : 'Could not change that assignment. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ saved: true });
}
