import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateDecision } from '../lib/duplicates.js';
import { validTeamMember, validAssignment } from '../lib/team.js';

const UID = '00000000-0000-0000-0000-0000000000b1';
const CID = '10000000-0000-4000-8000-000000000001';
test('a new name and phone is saved straight away', () => { assert.equal(duplicateDecision(false, false), 'ok'); });
test('a matching client is stopped, and only saved when the person confirms it is a different client', () => {
  assert.equal(duplicateDecision(true, false), 'ask');
  assert.equal(duplicateDecision(true, true), 'ok');
  assert.equal(duplicateDecision(true, 'yes'), 'ask', 'only a real true confirms');
});
test('a therapist needs a real user id, a name, and a valid email if one is given', () => {
  assert.equal(validTeamMember({ user_id: UID, name: 'Tope Ade', email: '' }).ok, true);
  assert.equal(validTeamMember({ user_id: 'nope', name: 'Tope' }).ok, false);
  assert.equal(validTeamMember({ user_id: UID, name: 'T' }).ok, false);
  assert.equal(validTeamMember({ user_id: UID, name: 'Tope', email: 'bad' }).ok, false);
});
test('an assignment needs two real ids and a yes or no', () => {
  assert.equal(validAssignment({ user_id: UID, client_id: CID, assigned: true }).ok, true);
  assert.equal(validAssignment({ user_id: UID, client_id: CID, assigned: 'yes' }).ok, false);
  assert.equal(validAssignment({ user_id: 'x', client_id: CID, assigned: true }).ok, false);
});
