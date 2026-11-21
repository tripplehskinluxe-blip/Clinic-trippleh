import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConsent, newSignaturePath, SIGNATURE_PATH } from '../lib/consent.js';

const GOOD = { version: 'consent-v2', treatment: true, storage: true, signature_path: 'signatures/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.png' };

test('a complete consent with a signature is accepted', () => { assert.equal(validateConsent(GOOD).ok, true); });
test('both agreements are required: treatment and record keeping', () => {
  const r = validateConsent({ ...GOOD, treatment: false, storage: false });
  assert.equal(r.ok, false); assert.ok(r.errors.treatment); assert.ok(r.errors.storage);
});
test('no signature, or a signature name that is not ours, is refused', () => {
  assert.ok(validateConsent({ ...GOOD, signature_path: undefined }).errors.signature_path);
  assert.ok(validateConsent({ ...GOOD, signature_path: 'signatures/../../etc.png' }).errors.signature_path);
  assert.ok(validateConsent({ ...GOOD, signature_path: 'signatures/hello.png' }).errors.signature_path);
});
test('a wording version must look like one of ours', () => {
  assert.ok(validateConsent({ ...GOOD, version: 'whatever' }).errors.version);
});
test('every new signature gets a random, correctly shaped name', () => {
  const a = newSignaturePath(), b = newSignaturePath();
  assert.notEqual(a, b); assert.match(a, SIGNATURE_PATH);
});
