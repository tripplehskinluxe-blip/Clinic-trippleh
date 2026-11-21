// Builds the printable form exactly as the paper is laid out. Every answer is included: nothing is hidden or dropped.
// Pure: no database, no screen. Used by the preview page and tested so no question can go missing.
import { HEALTH } from './visit-form.js';
import { toAssessmentRows } from './assessment.js';

export const CONTACT = [
  ['full_name', 'Full name'], ['dob', 'Date of birth'], ['phone', 'Phone number'], ['email', 'Email address'],
  ['occupation', 'Occupation'], ['emergency_name', 'Emergency contact (name)'], ['emergency_phone', 'Emergency contact (phone)'],
  ['gp_address', 'GP address'], ['last_doctor_visit', 'Last visit to the doctor'],
];
const SLEEP = [['lt4', 'Less than 4'], ['4-6', '4 to 6'], ['7-8', '7 to 8'], ['9+', '9 or more']];
const WATER = [['lt1', 'Less than 1 litre'], ['1-2', '1 to 2 litres'], ['2-3', '2 to 3 litres'], ['gt3', 'More than 3 litres']];
const STRESS = [['high', 'High'], ['moderate', 'Moderate'], ['no', 'Not stressed']];
const SUN = [['daily', 'Daily'], ['occasionally', 'Occasionally'], ['rarely', 'Rarely']];
const ACTIVES = [['retinol', 'Retinol / retinoids'], ['aha_bha', 'AHA / BHA (glycolic, lactic, salicylic)'], ['vitamin_c', 'Vitamin C'], ['acne_medication', 'Acne medication'], ['exfoliants', 'Exfoliants (physical or chemical)']];
const REACTIONS = [['redness', 'Redness'], ['burning', 'Burning'], ['peeling', 'Peeling'], ['breakouts', 'Breakouts']];
const choice = (list, value) => list.map(([k, label]) => ({ label, ticked: value === k }));
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '');

export function buildPreview({ client, form, consent, assessment }) {
  const c = client || {};
  const unreadable = !client;
  return {
    unreadable,
    personal: CONTACT.map(([k, label]) => ({ label, value: c[k] ? String(c[k]) : '' })),
    lifestyle_status: choice([['active', 'Active'], ['sedentary', 'Sedentary']], c.lifestyle),
    health: HEALTH.map(([k, label]) => ({ label, ticked: !!form.health[k] })),
    pregnancy_weeks: form.pregnancy_weeks ?? null,
    health_other_detail: form.health_other_detail || '',
    medications: form.medications || '',
    allergies: form.allergies || '',
    medication_affects_skin: yesNo(form.medication_affects_skin),
    medication_detail: form.medication_detail || '',
    sleep: choice(SLEEP, form.lifestyle.sleep),
    water: choice(WATER, form.lifestyle.water),
    smokes_or_drinks: form.lifestyle.smokes_or_drinks ? 'Yes' : 'No',
    stress: choice(STRESS, form.lifestyle.stress),
    sun: choice(SUN, form.lifestyle.sun),
    uses_sunscreen: yesNo(form.lifestyle.uses_sunscreen),
    sunscreen_spf: form.lifestyle.sunscreen_spf || '',
    sunburns: yesNo(form.lifestyle.sunburns),
    routine: form.skin.routine || '',
    facial_before: yesNo(form.skin.facial_before),
    facial_detail: form.skin.facial_detail || '',
    actives: ACTIVES.map(([k, label]) => ({ label, ticked: !!form.skin.actives[k] })),
    reactions: REACTIONS.map(([k, label]) => ({ label, ticked: !!form.skin.reactions[k] })),
    recent_procedures: yesNo(form.skin.recent_procedures),
    procedures_detail: form.skin.procedures_detail || '',
    consent: consent ? {
      version: consent.version, captured_at: consent.captured_at,
      treatment: 'Agreed', storage: 'Agreed', signature_url: consent.signature_url || null,
    } : null,
    assessment: assessment ? toAssessmentRows(assessment) : null,   // null shows "not yet recorded"
  };
}
