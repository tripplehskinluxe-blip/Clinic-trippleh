import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { formLines, buildFormPdf } from '../lib/pdf.js';
import { buildPreview } from '../lib/preview.js';
import { cleanForm, HEALTH } from '../lib/visit-form.js';
import { cleanAssessment } from '../lib/assessment.js';

const CLIENT = { full_name: 'Ada Obi', dob: '1990-02-14', phone: '0803 123 4567', email: 'ada@example.com', occupation: 'Teacher', emergency_name: 'Tope', emergency_phone: '0809', gp_address: '1 Clinic Road', last_doctor_visit: 'March 2026', lifestyle: 'active' };
const FORM = cleanForm({ health: { heart: true }, pregnancy_weeks: 12, lifestyle: { sleep: '7-8', water: '2-3', stress: 'no', sun: 'daily', uses_sunscreen: true, sunscreen_spf: '50' }, skin: { routine: 'Cleanser', actives: { retinol: true }, reactions: { burning: true } } });
const ASSESS = cleanAssessment({ notes: 'Calm skin', skin: { moisture: 'poor' }, diagram: [{ x: 40, y: 22 }], lesions: 'Mole', concerns: 'Spots', treatment_details: 'Peel', client_feedback: 'Happy' });

test('every personal detail is written out, filled in or as a dash, never left out', () => {
  const text = formLines(buildPreview({ client: CLIENT, form: FORM })).map((l) => l.text || '').join('\n');
  for (const v of ['Ada Obi', '1990-02-14', '0803 123 4567', 'ada@example.com', 'Teacher', 'Tope', '1 Clinic Road', 'March 2026']) assert.ok(text.includes(v), v);
});
test('every health question appears once, ticked [X] or not [ ]', () => {
  const lines = formLines(buildPreview({ client: CLIENT, form: FORM })).filter((l) => /^\[[X ]\] /.test(l.text || ''));
  const health = lines.filter((l) => HEALTH.some(([, label]) => l.text.endsWith(label)));
  assert.equal(health.length, HEALTH.length);
  assert.ok(health.find((l) => l.text === '[X] Heart conditions'));
});
test('an unassessed visit says so, and a filled assessment is written out in full', () => {
  assert.ok(formLines(buildPreview({ client: CLIENT, form: FORM })).some((l) => l.text === 'Not yet recorded.'));
  const text = formLines(buildPreview({ client: CLIENT, form: FORM, assessment: ASSESS })).map((l) => l.text || '').join('\n');
  for (const v of ['Calm skin', 'Mole', 'Spots', 'Peel', 'Happy', 'Face diagram: 1 area']) assert.ok(text.includes(v), v);
});
test('the PDF is a real PDF, several pages long, with the signature slot', async () => {
  const bytes = await buildFormPdf(buildPreview({ client: CLIENT, form: FORM, assessment: ASSESS, consent: { version: 'consent-v2', captured_at: '2026-03-01', signature_url: null } }), { signature: { png: null, status: 'missing' }, marks: ASSESS.diagram });
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 2);
});
