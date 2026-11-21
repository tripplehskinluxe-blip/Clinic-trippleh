// Consent rules shared by the page and the API. Both agreements are required, and a signature must have been received.
export const CONSENT_VERSION = /^consent-v\d{1,4}$/;
export const SIGNATURE_PATH = /^signatures\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;

export function validateConsent(c = {}) {
  const errors = {};
  if (!CONSENT_VERSION.test(c.version || '')) errors.version = 'The consent wording is missing. Please take consent again.';
  if (c.treatment !== true) errors.treatment = 'Treatment consent is required.';
  if (c.storage !== true) errors.storage = 'Record-keeping consent is required.';
  if (!SIGNATURE_PATH.test(c.signature_path || '')) errors.signature_path = 'A signature is required.';
  return { ok: Object.keys(errors).length === 0, errors };
}

// A random name for each signature, so it can never be guessed or overwritten.
export const newSignaturePath = () => `signatures/${crypto.randomUUID()}.png`;
