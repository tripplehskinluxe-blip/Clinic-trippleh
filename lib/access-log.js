// Records a view, preview, PDF download or share in the audit log. Uses the signed-in person's token; the database checks them.
export async function logAccess(sb, action, entity, id) {
  const r = await sb.rpc('clinic_log_action', { p_action: action, p_entity: entity, p_id: id });
  return !r.error;
}
