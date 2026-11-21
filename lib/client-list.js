// Builds the client list from the stored rows. Pure, so it can be tested without the database.
// visits must be sorted newest first. A record that cannot be read is shown as "needs checking", never hidden.
export function summarise(clients, visits, decrypt) {
  const latest = new Map();
  for (const v of visits) if (!latest.has(v.client_id)) latest.set(v.client_id, v);
  return clients.map((c) => {
    let name;
    try { name = String(decrypt(c.details_enc).full_name || 'Unnamed client'); }
    catch { name = 'Record needs checking'; }
    const v = latest.get(c.id);
    return { id: c.id, name, registered: c.created_at, visit_id: v?.id || null, form_status: v ? v.status : 'no form' };
  });
}
