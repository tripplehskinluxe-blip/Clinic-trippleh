import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptJson } from '@/lib/crypto.js';
import { cleanForm } from '@/lib/visit-form.js';
import { cleanAssessment } from '@/lib/assessment.js';
import { buildPreview } from '@/lib/preview.js';
import { buildFormPdf } from '@/lib/pdf.js';
import { logAccess } from '@/lib/access-log.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The finished form as a PDF file. Every download is logged first; if the log cannot be written, no file is given.
export async function GET(req, { params }) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const { id } = await params;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const v = await sb.from('clinic_visits').select('id,client_id,form_enc,assessment_enc').eq('id', id).maybeSingle();
  if (v.error || !v.data) return NextResponse.json({ error: 'Visit not found.' }, { status: 404 });
  const cl = await sb.from('clinic_clients').select('details_enc,deleted_at').eq('id', v.data.client_id).maybeSingle();
  if (cl.error || !cl.data) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  const role = await sb.rpc('clinic_role');
  if (cl.data.deleted_at && role.data !== 'owner') return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
  if (!(await logAccess(sb, 'pdf_downloaded', 'visit', id))) return NextResponse.json({ error: 'The access log is not available, so the file was not created. Please try again.' }, { status: 503 });

  let form, client = null, assessment = null;
  try { form = cleanForm(decryptJson(v.data.form_enc)); } catch { return NextResponse.json({ error: 'This form could not be read.' }, { status: 500 }); }
  try { client = decryptJson(cl.data.details_enc); } catch { client = null; }
  if (v.data.assessment_enc) { try { assessment = cleanAssessment(decryptJson(v.data.assessment_enc)); } catch { assessment = null; } }

  const co = await sb.from('clinic_consents').select('wording_version,captured_at,signature_path').eq('visit_id', id).maybeSingle();
  let consent = null, signature = { png: null, status: 'none' };
  if (co.data) {
    consent = { version: co.data.wording_version, captured_at: co.data.captured_at, signature_url: null };
    const signed = await sb.storage.from('clinic-signatures').createSignedUrl(co.data.signature_path, 120);
    if (signed.data?.signedUrl) {
      try {
        const res = await fetch(signed.data.signedUrl);
        if (res.ok) signature = { png: new Uint8Array(await res.arrayBuffer()), status: 'included' };
        else signature = { png: null, status: 'missing' };
      } catch { signature = { png: null, status: 'missing' }; }
    } else signature = { png: null, status: 'missing' };
  }
  const model = buildPreview({ client, form, consent, assessment });
  const bytes = await buildFormPdf(model, { signature, marks: assessment?.diagram || [] });
  return new NextResponse(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="consultation-${id.slice(0, 8)}.pdf"`, 'Cache-Control': 'no-store' },
  });
}
