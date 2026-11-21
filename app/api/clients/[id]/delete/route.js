import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validReason } from '@/lib/access-owner.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Owner only. "delete" hides a client (the record is kept). "restore" brings a removed client back. The database checks the owner and two-factor.
export async function POST(req, { params }) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params; const action = 'delete';
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  if (action === 'delete') {
    const body = await req.json().catch(() => ({}));
    const r = validReason(body.reason);
    if (!r.ok) return NextResponse.json({ error: 'Please give a reason (at least 3 characters).', fields: { reason: 'Please give a reason.' } }, { status: 400 });
    const { error } = await sb.rpc('clinic_soft_delete_client', { p_client: id, p_reason: r.value });
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only the owner can remove a client.' : 'Could not remove the client. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
    return NextResponse.json({ removed: true });
  }
  if (action === 'restore') {
    const { error } = await sb.rpc('clinic_restore_client', { p_client: id });
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only the owner can restore a client.' : 'Could not restore the client. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
    return NextResponse.json({ restored: true });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
}
