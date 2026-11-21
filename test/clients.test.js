import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.env.CLINIC_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
process.env.CLINIC_LOOKUP_KEY = crypto.randomBytes(32).toString('base64');
const { encryptJson, decryptJson, lookupHash } = await import('../lib/crypto.js');
const { validateClient } = await import('../lib/client-form.js');

const GOOD = { full_name: '  Ada   Obi ', phone: '+234 803 123 4567', dob: '1990-02-14', email: 'ada@example.com', lifestyle: 'active', gp_address: '1 Clinic Road, Yaba' };

test('the form accepts a complete, valid client and trims the text', () => {
  const r = validateClient(GOOD);
  assert.equal(r.ok, true); assert.equal(r.value.full_name, 'Ada   Obi'); assert.equal(r.value.lifestyle, 'active');
});
test('the form refuses bad input with a message for each field', () => {
  const r = validateClient({ full_name: 'A', phone: '12', dob: '14/02/1990', email: 'nope', emergency_phone: 'abc' });
  assert.equal(r.ok, false);
  for (const k of ['full_name', 'phone', 'dob', 'email', 'emergency_phone']) assert.ok(r.errors[k], k);
});
test('an unknown lifestyle value is ignored, not saved', () => {
  assert.equal(validateClient({ ...GOOD, lifestyle: '<script>' }).value.lifestyle, '');
});
test('a record is encrypted: the names and numbers are not readable in the stored text', () => {
  const stored = encryptJson(validateClient(GOOD).value);
  assert.doesNotMatch(stored, /Ada|Obi|0803|Clinic Road/);
  assert.equal(decryptJson(stored).full_name, 'Ada   Obi');
});
test('every encryption is different (fresh random values each time)', () => {
  assert.notEqual(encryptJson({ a: 1 }), encryptJson({ a: 1 }));
});
test('a tampered record is refused, not silently changed', () => {
  const stored = encryptJson({ full_name: 'Ada' });
  const parts = stored.split('.'); parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decryptJson(parts.join('.')));
});
test('the same person gets the same search index however the name and phone are typed', () => {
  assert.equal(lookupHash('Ada Obi', '+234 803 123 4567'), lookupHash('  ada   OBI ', '0803-123-4567'));
  assert.notEqual(lookupHash('Ada Obi', '0803 123 4567'), lookupHash('Ada Obi', '0803 123 4568'));
});
test('with no key set, nothing is saved: encryption refuses to run', () => {
  const k = process.env.CLINIC_ENCRYPTION_KEY; delete process.env.CLINIC_ENCRYPTION_KEY;
  assert.throws(() => encryptJson({ a: 1 }), /CLINIC_ENCRYPTION_KEY is not set/);
  process.env.CLINIC_ENCRYPTION_KEY = k;
});
test('a key that is not 32 bytes is refused', () => {
  const k = process.env.CLINIC_LOOKUP_KEY; process.env.CLINIC_LOOKUP_KEY = Buffer.from('short').toString('base64');
  assert.throws(() => lookupHash('a', '1234567'), /32 random bytes/);
  process.env.CLINIC_LOOKUP_KEY = k;
});
