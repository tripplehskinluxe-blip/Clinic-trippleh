// Field-level encryption for client records (AES-256-GCM) and a keyed index for searching by name and phone.
// Server only. The keys come from Vercel environment variables and are never stored in the code or the database.
import crypto from 'node:crypto';

function keyFrom(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  const b = Buffer.from(v, 'base64');
  if (b.length !== 32) throw new Error(`${name} must be 32 random bytes, base64 encoded`);
  return b;
}

export function encryptJson(obj) {
  const key = keyFrom('CLINIC_ENCRYPTION_KEY');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function decryptJson(s) {
  const key = keyFrom('CLINIC_ENCRYPTION_KEY');
  const [v, iv, tag, body] = String(s).split('.');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('unrecognised record format');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  const plain = Buffer.concat([d.update(Buffer.from(body, 'base64')), d.final()]);
  return JSON.parse(plain.toString('utf8'));
}

// The same person gives the same index value however the name is typed (case, spaces) and however the phone is written.
export function lookupHash(fullName, phone) {
  const key = keyFrom('CLINIC_LOOKUP_KEY');
  let digits = String(phone).replace(/\D/g, '');
  // +234 803…, 234 803… and 0803… are the same Nigerian number: keep only the national part
  if (digits.startsWith('234') && digits.length >= 13) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  const norm = `${String(fullName).toLowerCase().replace(/\s+/g, ' ').trim()}|${digits}`;
  return crypto.createHmac('sha256', key).update(norm).digest('hex');
}
