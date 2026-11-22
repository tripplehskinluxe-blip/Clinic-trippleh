'use client';
// The contact and personal fields, the same on the add and the edit screens.
const box = { width: '100%', padding: '14px 16px', fontSize: 18, border: '1.5px solid #e1d6ee', borderRadius: 12, boxSizing: 'border-box' };
const label = { display: 'block', marginTop: 16, marginBottom: 6, fontWeight: 500 };
const err = { color: '#7a1f1f', fontSize: 14, marginTop: 4 };

export default function ClientFields({ f, set, errs }) {
  const field = (k, text, type = 'text') => (
    <>
      <label htmlFor={k} style={label}>{text}</label>
      <input id={k} type={type} value={f[k]} onChange={set(k)} style={box} aria-invalid={!!errs[k]} />
      {errs[k] && <div style={err}>{errs[k]}</div>}
    </>
  );
  return (
    <>
      {field('full_name', 'Full name')}
      {field('dob', 'Date of birth', 'date')}
      {field('phone', 'Phone number', 'tel')}
      {field('email', 'Email address', 'email')}
      {field('occupation', 'Occupation')}
      {field('emergency_name', 'Emergency contact (name)')}
      {field('emergency_phone', 'Emergency contact (phone)', 'tel')}
      {field('gp_address', 'GP address')}
      {field('last_doctor_visit', 'Last visit to the doctor')}
      <label htmlFor="lifestyle" style={label}>Lifestyle</label>
      <select id="lifestyle" value={f.lifestyle} onChange={set('lifestyle')} style={box}>
        <option value="">Choose</option><option value="active">Active</option><option value="sedentary">Sedentary</option>
      </select>
      {errs.lifestyle && <div style={err}>{errs.lifestyle}</div>}
    </>
  );
}
