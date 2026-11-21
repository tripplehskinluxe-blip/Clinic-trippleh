import test from 'node:test';
import assert from 'node:assert/strict';
import { summarise } from '../lib/client-list.js';

const decrypt = (s) => { if (s === 'BAD') throw new Error('cannot read'); return { full_name: s.replace('ENC-', '') }; };
test('each client appears once, with her name and her most recent form', () => {
  const rows = summarise(
    [{ id: 'c1', details_enc: 'ENC-Ada Obi', created_at: '2026-01-01' }, { id: 'c2', details_enc: 'ENC-Tope Ade', created_at: '2026-01-02' }],
    [{ id: 'v2', client_id: 'c1', status: 'complete' }, { id: 'v1', client_id: 'c1', status: 'draft' }],
    decrypt);
  assert.deepEqual(rows[0], { id: 'c1', name: 'Ada Obi', registered: '2026-01-01', visit_id: 'v2', form_status: 'complete' });
});
test('a client with no form yet is still listed', () => {
  const [r] = summarise([{ id: 'c2', details_enc: 'ENC-Tope', created_at: 'x' }], [], decrypt);
  assert.equal(r.form_status, 'no form'); assert.equal(r.visit_id, null); assert.equal(r.name, 'Tope');
});
test('an unreadable record is listed as needing a check, never silently dropped', () => {
  const rows = summarise([{ id: 'c3', details_enc: 'BAD', created_at: 'x' }], [], decrypt);
  assert.equal(rows.length, 1); assert.equal(rows[0].name, 'Record needs checking');
});
