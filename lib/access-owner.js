// Shared rules for the owner tools and the access log. Pure, so the tests check them without a database.
export const ACCESS_ACTIONS = ['viewed', 'previewed', 'pdf_downloaded', 'shared'];
export const ACCESS_ENTITIES = ['client', 'visit'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validAccess(b = {}) {
  const action = ACCESS_ACTIONS.includes(b.action) ? b.action : null;
  const entity = ACCESS_ENTITIES.includes(b.entity) ? b.entity : null;
  const id = UUID.test(b.id || '') ? b.id : null;
  return { ok: !!(action && entity && id), action, entity, id };
}

// A reason for removing a client: 3 to 200 characters, kept on record.
export function validReason(s) {
  const v = typeof s === 'string' ? s.trim().slice(0, 200) : '';
  return { ok: v.length >= 3, value: v };
}

// The consent wording the owner publishes: 200 to 8000 characters (the database checks the same).
export function validConsentBody(s) {
  const v = typeof s === 'string' ? s.trim() : '';
  return { ok: v.length >= 200 && v.length <= 8000, value: v };
}
