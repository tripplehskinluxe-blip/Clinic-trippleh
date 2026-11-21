import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreview, CONTACT } from '../lib/preview.js';
import { cleanForm } from '../lib/visit-form.js';
import { HEALTH } from '../lib/visit-form.js';

const CLIENT = { full_name: 'Ada Obi', dob: '1990-02-14', phone: '0803 123 4567', email: 'ada@example.com', occupation: 'Teacher', emergency_name: 'Tope', emergency_phone: '0809', gp_address: '1 Clinic Road', last_doctor_visit: 'March 2026', lifestyle: 'active' };
const FORM = cleanForm({
  health: { heart: true, botox_fillers: true }, pregnancy_weeks: 12, health_other_detail: 'Migraine tablets',
  medications: 'Vitamin D', allergies: 'Nuts', medication_affects_skin: true, medication_detail: 'Steroid cream',
  lifestyle: { sleep: '7-8', water: '2-3', smokes_or_drinks: true, stress: 'moderate', sun: 'daily', uses_sunscreen: true, sunscreen_spf: '50', sunburns: false },
  skin: { routine: 'Cleanser, serum', facial_before: true, facial_detail: 'Facial, Jan 2026', actives: { retinol: true, vitamin_c: true }, reactions: { burning: true }, recent_procedures: true, procedures_detail: 'Peel' },
});

test('every contact and personal detail appears, filled in or left blank, never dropped', () => {
  const p = buildPreview({ client: CLIENT, form: FORM });
  assert.equal(p.personal.length, CONTACT.length);
  for (const [k, label] of CONTACT) assert.ok(p.personal.some((r) => r.label === label && r.value === String(CLIENT[k] || '')), label);
});
test('every question on the health checklist appears, ticked where the client ticked', () => {
  const p = buildPreview({ client: CLIENT, form: FORM });
  assert.equal(p.health.length, HEALTH.length);
  assert.equal(p.health.find((r) => r.label === 'Heart conditions').ticked, true);
  assert.equal(p.health.find((r) => r.label === 'Asthma').ticked, false);
});
test('lifestyle, skin history and medications are all present with the right answers', () => {
  const p = buildPreview({ client: CLIENT, form: FORM });
  assert.equal(p.sleep.find((r) => r.ticked).label, '7 to 8');
  assert.equal(p.water.find((r) => r.ticked).label, '2 to 3 litres');
  assert.equal(p.stress.find((r) => r.ticked).label, 'Moderate');
  assert.equal(p.sun.find((r) => r.ticked).label, 'Daily');
  assert.equal(p.uses_sunscreen, 'Yes'); assert.equal(p.sunscreen_spf, '50'); assert.equal(p.sunburns, 'No');
  assert.equal(p.actives.filter((r) => r.ticked).length, 2);
  assert.equal(p.reactions.find((r) => r.ticked).label, 'Burning');
  assert.equal(p.recent_procedures, 'Yes'); assert.equal(p.procedures_detail, 'Peel');
  assert.equal(p.medications, 'Vitamin D'); assert.equal(p.allergies, 'Nuts');
  assert.equal(p.pregnancy_weeks, 12); assert.equal(p.health_other_detail, 'Migraine tablets');
});
test('the consent and signature are shown with the wording version the client saw', () => {
  const p = buildPreview({ client: CLIENT, form: FORM, consent: { version: 'consent-v2', captured_at: '2026-03-01', signature_url: 'https://x/sig.png' } });
  assert.equal(p.consent.version, 'consent-v2'); assert.equal(p.consent.signature_url, 'https://x/sig.png');
});
test('a record that cannot be read still shows every section, flagged, never hidden', () => {
  const p = buildPreview({ client: null, form: FORM });
  assert.equal(p.unreadable, true); assert.equal(p.personal.length, CONTACT.length); assert.equal(p.health.length, HEALTH.length);
});
test('the therapist section is shown as not yet recorded until it is filled in', () => {
  assert.equal(buildPreview({ client: CLIENT, form: FORM }).assessment, null);
});
