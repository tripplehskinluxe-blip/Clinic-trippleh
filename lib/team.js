// Team rules (owner): a therapist needs a real id, a name and a valid email if one is given. Assignments are on/off.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validTeamMember(b = {}) {
  const errors = {};
  if (!UUID.test(b.user_id || '')) errors.user_id = 'Paste the therapist\'s user ID exactly as shown in Supabase.';
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (name.length < 2 || name.length > 80) errors.name = 'Enter the therapist\'s name (2 to 80 characters).';
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (email && (email.length > 120 || !EMAIL.test(email))) errors.email = 'Enter a valid email address, or leave it blank.';
  return { ok: Object.keys(errors).length === 0, errors, value: { user_id: b.user_id, name, email } };
}

export function validAssignment(b = {}) {
  const ok = UUID.test(b.user_id || '') && UUID.test(b.client_id || '') && typeof b.assigned === 'boolean';
  return { ok, value: { user_id: b.user_id, client_id: b.client_id, assigned: b.assigned } };
}
