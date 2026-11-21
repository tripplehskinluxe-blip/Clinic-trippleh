import test from 'node:test';
import assert from 'node:assert/strict';
import { validAccess, validReason, validConsentBody } from '../lib/access-owner.js';

const ID = '20000000-0000-4000-8000-000000000001';
test('only the four known actions and two kinds of record can be logged', () => {
  assert.equal(validAccess({ action: 'viewed', entity: 'visit', id: ID }).ok, true);
  assert.equal(validAccess({ action: 'deleted', entity: 'visit', id: ID }).ok, false);
  assert.equal(validAccess({ action: 'viewed', entity: 'signature', id: ID }).ok, false);
  assert.equal(validAccess({ action: 'viewed', entity: 'visit', id: 'not-an-id' }).ok, false);
});
test('a removal needs a real reason, and is kept to 200 characters', () => {
  assert.equal(validReason('  ').ok, false);
  assert.equal(validReason('ok').ok, false);
  assert.equal(validReason('Client asked for removal').ok, true);
  assert.equal(validReason('x'.repeat(500)).value.length, 200);
});
test('published consent wording must be a full text, 200 to 8000 characters', () => {
  assert.equal(validConsentBody('short').ok, false);
  assert.equal(validConsentBody('x'.repeat(200)).ok, true);
  assert.equal(validConsentBody('x'.repeat(8001)).ok, false);
});
