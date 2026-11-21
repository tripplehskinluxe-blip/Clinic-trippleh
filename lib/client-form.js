// Checks every field of the consultation form before anything is encrypted or saved. Shared by the page and the API.
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validateClient(b = {}) {
  const errors = {};
  const full_name = str(b.full_name, 120);
  if (full_name.length < 2) errors.full_name = 'Enter the full name.';
  const phone = str(b.phone, 20);
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) errors.phone = 'Enter a valid phone number.';
  const dob = str(b.dob, 10);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) errors.dob = 'Use the format YYYY-MM-DD.';
  const email = str(b.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  const emergency_phone = str(b.emergency_phone, 20);
  if (emergency_phone && !/^\+?[0-9 ()-]{7,20}$/.test(emergency_phone)) errors.emergency_phone = 'Enter a valid phone number.';
  const lifestyle = b.lifestyle === 'active' || b.lifestyle === 'sedentary' ? b.lifestyle : '';
  const value = {
    full_name, dob, phone, email,
    occupation: str(b.occupation, 120),
    emergency_name: str(b.emergency_name, 120),
    emergency_phone,
    gp_address: str(b.gp_address, 300),
    last_doctor_visit: str(b.last_doctor_visit, 80),
    lifestyle,
  };
  return { ok: Object.keys(errors).length === 0, errors, value };
}
