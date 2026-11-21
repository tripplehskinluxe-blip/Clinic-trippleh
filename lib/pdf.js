// The consultation form as a PDF, generated on the server from the same data as the preview. Every answer is written out.
// An empty answer is written as "-", never left out. Ticked boxes read [X], empty ones [ ].
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const dash = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));
const safe = (s) => String(s).replace(/—/g, '-').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');
const boxes = (choices) => choices.map((o) => `${o.ticked ? '[X]' : '[ ]'} ${o.label}`).join('    ');
const line = (label, value) => ({ text: `${label}: ${dash(value)}` });

// Every piece of the form, as lines in paper order. Used by the PDF, and by the tests that check nothing is left out.
export function formLines(m) {
  const L = [];
  const sec = (t) => L.push({ head: t });
  sec('Personal information');
  for (const r of m.personal) L.push(line(r.label, r.value));
  L.push({ text: `Lifestyle: ${boxes(m.lifestyle_status)}` });
  sec('General health information');
  L.push({ text: 'Ticked [X] = the client has, or has had.' });
  for (const r of m.health) L.push({ text: `${r.ticked ? '[X]' : '[ ]'} ${r.label}` });
  L.push(line('Pregnancy (weeks, if pregnant)', m.pregnancy_weeks));
  L.push(line('Other medical conditions (details)', m.health_other_detail));
  sec('Medications and allergies');
  L.push(line('Medications currently used (topical or oral)', m.medications));
  L.push(line('Allergies (including skincare ingredients)', m.allergies));
  L.push(line('Medication that affects the skin (steroids, birth control, acne medication)', m.medication_affects_skin));
  L.push(line('Details', m.medication_detail));
  sec('Lifestyle and health factors');
  L.push({ text: `Hours of sleep: ${boxes(m.sleep)}` });
  L.push({ text: `Water per day: ${boxes(m.water)}` });
  L.push(line('Smokes or drinks alcohol regularly', m.smokes_or_drinks));
  L.push({ text: `Stress: ${boxes(m.stress)}` });
  L.push({ text: `Exposure to the sun: ${boxes(m.sun)}` });
  L.push(line('Uses sunscreen', `${m.uses_sunscreen}${m.sunscreen_spf ? ` (SPF ${m.sunscreen_spf})` : ''}`));
  L.push(line('Sunburns or sun damage in the past', m.sunburns));
  sec('Skin history');
  L.push(line('Current skincare routine', m.routine));
  L.push(line('Facial treatments before', `${m.facial_before}${m.facial_detail ? ` - ${m.facial_detail}` : ''}`));
  L.push({ text: 'Currently using:' });
  for (const a of m.actives) L.push({ text: `${a.ticked ? '[X]' : '[ ]'} ${a.label}` });
  L.push({ text: 'After treatments or products, has experienced:' });
  for (const r of m.reactions) L.push({ text: `${r.ticked ? '[X]' : '[ ]'} ${r.label}` });
  L.push(line('Recent cosmetic procedures (Botox, fillers, laser, peels)', `${m.recent_procedures}${m.procedures_detail ? ` - ${m.procedures_detail}` : ''}`));
  sec('Consent and signature');
  if (m.consent) {
    L.push(line('Wording version the client agreed to', m.consent.version));
    L.push({ text: '[X] Agreed to receive treatment today.' });
    L.push({ text: '[X] Agreed that the spa keeps the record as described.' });
    L.push(line('Date', m.consent.captured_at ? new Date(m.consent.captured_at).toLocaleDateString('en-GB') : ''));
    L.push({ text: 'Client signature:', signature: true });
  } else {
    L.push({ text: 'No consent recorded.' });
  }
  sec('Therapist assessment');
  const a = m.assessment;
  if (!a) {
    L.push({ text: 'Not yet recorded.' });
  } else {
    L.push(line('Therapist notes', a.notes));
    for (const r of a.skin) L.push({ text: `${r.label}: ${r.choices.map((o) => `${o.ticked ? '[X]' : '[ ]'} ${o.label}`).join('    ')}` });
    L.push(line('Overall skin type', a.overall_skin_type));
    L.push({ text: `Face diagram: ${a.diagram.length} area(s) marked.`, face: true });
    L.push(line('Skin lesions', a.lesions));
    L.push(line('Skin concerns', a.concerns));
    L.push(line('Treatment details', a.treatment_details));
    L.push(line('Client feedback', a.client_feedback));
  }
  return L.map((x) => (x.text ? { ...x, text: safe(x.text) } : x));
}

// signature: { png: Uint8Array|null, status: 'included' | 'missing' | 'none' }
export async function buildFormPdf(model, { signature = { png: null, status: 'none' }, marks = [] } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 50, WIDTH = W - 2 * M, LH = 14;
  const ink = rgb(0.13, 0.08, 0.2), purple = rgb(0.36, 0.16, 0.55);
  const pages = [];
  let page, y;
  const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - M; };
  const need = (h) => { if (y - h < M + 30) newPage(); };
  const wrap = (text, size, f) => {
    const words = String(text).split(/\s+/); const out = []; let cur = '';
    for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (f.widthOfTextAtSize(t, size) > WIDTH) { if (cur) out.push(cur); cur = w; } else cur = t; }
    if (cur || out.length === 0) out.push(cur);
    return out;
  };

  newPage();
  page.drawText('Heeshas Healing Hands Spa', { x: M, y, size: 16, font: bold, color: purple });
  y -= 22;
  page.drawText('Client Consultation Form', { x: M, y, size: 13, font: bold, color: ink });
  y -= 26;

  for (const item of formLines(model)) {
    if (item.head) {
      need(30); y -= 8;
      page.drawText(item.head, { x: M, y, size: 12, font: bold, color: purple });
      y -= 4; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: purple }); y -= LH;
      continue;
    }
    const lines = wrap(item.text, 10, font);
    need(lines.length * LH + 4);
    for (const t of lines) { page.drawText(t, { x: M, y, size: 10, font, color: ink }); y -= LH; }
    if (item.signature) {
      need(120);
      if (signature.png) {
        const img = await doc.embedPng(signature.png);
        const s = Math.min(220 / img.width, 90 / img.height);
        page.drawRectangle({ x: M, y: y - 96, width: 230, height: 100, borderColor: rgb(0.75, 0.7, 0.8), borderWidth: 0.8 });
        page.drawImage(img, { x: M + 6, y: y - 90, width: img.width * s, height: img.height * s });
        y -= 104;
      } else {
        const msg = signature.status === 'missing' ? 'Signature image could not be loaded. Please check the signature file.' : 'No signature on file.';
        page.drawText(safe(msg), { x: M, y, size: 10, font: bold, color: rgb(0.48, 0.12, 0.12) });
        y -= LH + 6;
      }
    }
    if (item.face) {
      need(190);
      const bx = M + 20, by = y - 180, bw = 150, bh = 180;
      page.drawEllipse({ x: bx + bw / 2, y: by + bh / 2, xScale: bw / 2, yScale: bh / 2, borderColor: purple, borderWidth: 1.2 });
      for (const m of marks) {
        page.drawCircle({ x: bx + (m.x / 100) * bw, y: by + bh - (m.y / 100) * bh, size: 5, color: rgb(0.88, 0.63, 0.25), borderColor: rgb(0.48, 0.12, 0.12), borderWidth: 1 });
      }
      y -= 190;
    }
  }
  const total = pages.length;
  const stamp = `Confidential. Generated ${new Date().toLocaleDateString('en-GB')}.`;
  pages.forEach((p, i) => {
    p.drawText(safe(`${stamp}  Page ${i + 1} of ${total}`), { x: M, y: 28, size: 8, font, color: rgb(0.4, 0.36, 0.45) });
  });
  return doc.save();
}
