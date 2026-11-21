import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validConsentBody } from '@/lib/access-owner.js';

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

// The current wording and its history (staff can read it, so the consent step works for everyone).
export async function GET(req) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const active = await sb.rpc('clinic_active_consent');
  const versions = await sb.from('clinic_consent_texts').select('version,created_at,is_active').order('created_at', { ascending: false });
  if (active.error || versions.error) return NextResponse.json({ error: 'Could not load the consent wording.' }, { status: 403 });
  return NextResponse.json({ active: active.data?.[0] || null, versions: versions.data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

// The owner publishes new wording. Every version is kept; new visits use the new one.
export async function POST(req) {
  const sb = db(req); if (!sb) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const v = validConsentBody(body.body);
  if (!v.ok) return NextResponse.json({ error: 'The consent wording must be between 200 and 8000 characters.', fields: { body: 'Too short or too long.' } }, { status: 400 });
  const { data, error } = await sb.rpc('clinic_publish_consent', { p_body: v.value });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only the owner can publish consent wording.' : 'Could not publish. Please try again.' }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ version: data }, { status: 201 });
}
