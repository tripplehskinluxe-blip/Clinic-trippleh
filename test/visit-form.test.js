import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanForm, validateForm, contraindications } from '../lib/visit-form.js';

const DONE = { confirm: true, lifestyle: { sleep: '7-8', water: '2-3', stress: 'no', sun: 'rarely' } };
test('an empty form is cleaned into a full, safe shape', () => {
  const f = cleanForm({});
  assert.equal(f.pregnancy_weeks, null); assert.equal(f.lifestyle.sleep, ''); assert.equal(f.health.heart, false); assert.equal(f.confirm, false);
});
test('unknown or wrong answers are dropped, not saved', () => {
  const f = cleanForm({ lifestyle: { sleep: '<script>', water: 'lots' }, health: { heart: 'yes', made_up: true }, pregnancy_weeks: 99 });
  assert.equal(f.lifestyle.sleep, ''); assert.equal(f.lifestyle.water, ''); assert.equal(f.health.heart, false); assert.equal(f.health.made_up, undefined); assert.equal(f.pregnancy_weeks, null);
});
test('the form cannot be completed until the required answers are given', () => {
  const v = validateForm(cleanForm({}));
  assert.equal(v.ok, false);
  for (const k of ['sleep', 'water', 'stress', 'sun', 'confirm']) assert.ok(v.errors[k], k);
});
test('the client confirmation is required on its own', () => {
  const v = validateForm(cleanForm({ ...DONE, confirm: false }));
  assert.equal(v.ok, false); assert.ok(v.errors.confirm); assert.equal(v.errors.sleep, undefined);
});
test('a complete form with the confirmation is accepted', () => {
  assert.equal(validateForm(cleanForm(DONE)).ok, true);
});
test('pregnancy, recent Botox and retinoids are flagged for the therapist', () => {
  const w = contraindications(cleanForm({ pregnancy_weeks: 12, health: { botox_fillers: true }, skin: { actives: { retinol: true } } }));
  assert.ok(w.some((x) => /Pregnant \(12 weeks\)/.test(x)));
  assert.ok(w.some((x) => /Botox or fillers/.test(x)));
  assert.ok(w.some((x) => /Retinoid/.test(x)));
});
test('a clean form raises no warnings', () => {
  assert.deepEqual(contraindications(cleanForm({ lifestyle: { sleep: '7-8' } })), []);
});
test('pregnancy weeks outside 1 to 42 are ignored', () => {
  assert.equal(cleanForm({ pregnancy_weeks: 0 }).pregnancy_weeks, null);
  assert.equal(cleanForm({ pregnancy_weeks: 43 }).pregnancy_weeks, null);
});
