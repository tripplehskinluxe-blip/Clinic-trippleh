import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAssessment, toAssessmentRows, SKIN_ITEMS } from '../lib/assessment.js';

test('every skin item from the paper is kept, and a wrong answer is dropped', () => {
  const a = cleanAssessment({ skin: { moisture: 'good', sensitivity: 'extreme', pores: 'constricted' } });
  assert.equal(a.skin.moisture, 'good'); assert.equal(a.skin.sensitivity, ''); assert.equal(a.skin.pores, 'constricted');
  assert.equal(Object.keys(a.skin).length, SKIN_ITEMS.length);
});
test('marks on the face are kept as numbers within the face, and junk is dropped', () => {
  const a = cleanAssessment({ diagram: [{ x: 40.26, y: 22 }, { x: 150, y: 3 }, { x: 'bad', y: 5 }] });
  assert.deepEqual(a.diagram, [{ x: 40.3, y: 22 }]);
});
test('the preview shows every skin item with its ticked choice, and every written note', () => {
  const a = cleanAssessment({ notes: 'Calm skin', skin: { moisture: 'poor', skin_tone: 'dark' }, lesions: 'Small mole left cheek', concerns: 'Dark spots', treatment_details: 'Gentle peel', client_feedback: 'Happy', overall_skin_type: 'Combination' });
  const r = toAssessmentRows(a);
  assert.equal(r.skin.length, SKIN_ITEMS.length);
  assert.equal(r.skin.find((x) => x.label === 'Moisture content').value, 'Poor');
  assert.equal(r.skin.find((x) => x.label === 'Moisture content').choices.find((c) => c.ticked).label, 'Poor');
  assert.equal(r.notes, 'Calm skin'); assert.equal(r.lesions, 'Small mole left cheek'); assert.equal(r.concerns, 'Dark spots');
  assert.equal(r.treatment_details, 'Gentle peel'); assert.equal(r.client_feedback, 'Happy'); assert.equal(r.overall_skin_type, 'Combination');
});
test('an empty assessment still shows every item, with dashes, never hidden', () => {
  const r = toAssessmentRows(cleanAssessment({}));
  assert.equal(r.skin.length, SKIN_ITEMS.length); assert.equal(r.notes, '—'); assert.equal(r.lesions, '—');
});
