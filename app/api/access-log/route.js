import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validAccess } from '@/lib/access-owner.js';
import { logAccess } from '@/lib/access-log.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Logs a share from the browser (the app logs views and PDFs itself).
export async function POST(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const a = validAccess(await req.json().catch(() => ({})));
  if (!a.ok) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  if (!(await logAccess(sb, a.action, a.entity, a.id))) return NextResponse.json({ error: 'Could not record this. Please try again.' }, { status: 403 });
  return NextResponse.json({ logged: true });
}
