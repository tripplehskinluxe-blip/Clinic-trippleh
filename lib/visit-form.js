// The consultation form, field by field, exactly as on the paper. Shared by the page and the API.
export const HEALTH = [
  ['heart', 'Heart conditions'], ['blood_pressure', 'Blood pressure'], ['high_low', 'High / low'], ['diabetes', 'Diabetes'],
  ['epilepsy', 'Epilepsy'], ['localized_swelling', 'Localized swelling'], ['skin_cancer', 'Skin cancer'], ['recent_facial_ops', 'Recent facial operations'],
  ['hyperkeratosis', 'Hyperkeratosis'], ['botox_fillers', 'Botox / dermal fillers (in the last 1 week)'], ['bruises', 'Bruises'], ['asthma', 'Asthma'],
  ['sinusitis', 'Sinusitis'], ['hypersensitive_skin', 'Hypersensitive skin'], ['skin_allergies', 'Skin allergies or sensitivities'], ['eczema_psoriasis', 'Eczema / psoriasis'],
  ['conjunctivitis', 'Conjunctivitis'], ['migraine', 'Migraine / headache'], ['recent_surgery', 'Recent surgery (last 6 months)'], ['claustrophobia', 'Claustrophobia'],
  ['varicose_veins', 'Varicose veins'], ['watery_eyes', 'Watery eyes'], ['styes', 'Styes'], ['abrasions', 'Abrasions / scrapes / grazes'],
  ['blood_disorders', 'Blood disorders'], ['retin_a_steroids', 'Use of Retin-A, Accutane or steroids'], ['other', 'Other medical conditions'],
];
const HEALTH_KEYS = new Set(HEALTH.map(([k]) => k));
const SLEEP = ['lt4', '4-6', '7-8', '9+'], WATER = ['lt1', '1-2', '2-3', 'gt3'], STRESS = ['high', 'moderate', 'no'], SUN = ['daily', 'occasionally', 'rarely'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v) => v === true;
const oneOf = (v, list) => (list.includes(v) ? v : '');

export function cleanForm(b = {}) {
  const health = {};
  for (const k of HEALTH_KEYS) health[k] = bool(b.health?.[k]);
  const weeks = Number.parseInt(b.pregnancy_weeks, 10);
  return {
    health,
    pregnancy_weeks: bool(health.other) || !Number.isFinite(weeks) || weeks < 1 || weeks > 42 ? null : weeks,
    health_other_detail: str(b.health_other_detail, 300),
    medications: str(b.medications, 500),
    allergies: str(b.allergies, 500),
    medication_affects_skin: bool(b.medication_affects_skin),
    medication_detail: str(b.medication_detail, 300),
    lifestyle: { sleep: oneOf(b.lifestyle?.sleep, SLEEP), water: oneOf(b.lifestyle?.water, WATER), smokes_or_drinks: bool(b.lifestyle?.smokes_or_drinks), stress: oneOf(b.lifestyle?.stress, STRESS), sun: oneOf(b.lifestyle?.sun, SUN), uses_sunscreen: bool(b.lifestyle?.uses_sunscreen), sunscreen_spf: str(b.lifestyle?.sunscreen_spf, 20), sunburns: bool(b.lifestyle?.sunburns) },
    skin: { routine: str(b.skin?.routine, 1000), facial_before: bool(b.skin?.facial_before), facial_detail: str(b.skin?.facial_detail, 300),
      actives: { retinol: bool(b.skin?.actives?.retinol), aha_bha: bool(b.skin?.actives?.aha_bha), vitamin_c: bool(b.skin?.actives?.vitamin_c), acne_medication: bool(b.skin?.actives?.acne_medication), exfoliants: bool(b.skin?.actives?.exfoliants) },
      reactions: { redness: bool(b.skin?.reactions?.redness), burning: bool(b.skin?.reactions?.burning), peeling: bool(b.skin?.reactions?.peeling), breakouts: bool(b.skin?.reactions?.breakouts) },
      recent_procedures: bool(b.skin?.recent_procedures), procedures_detail: str(b.skin?.procedures_detail, 300) },
  };
}

// Required answers before the form can be marked complete.
export function validateForm(f) {
  const errors = {};
  if (!f.lifestyle.sleep) errors.sleep = 'Choose hours of sleep.';
  if (!f.lifestyle.water) errors.water = 'Choose daily water intake.';
  if (!f.lifestyle.stress) errors.stress = 'Choose stress level.';
  if (!f.lifestyle.sun) errors.sun = 'Choose sun exposure.';
  return { ok: Object.keys(errors).length === 0, errors };
}

// Things the therapist must check before treating. Shown as a clear banner. Never blocks saving.
export function contraindications(f) {
  const w = [];
  if (f.pregnancy_weeks) w.push(`Pregnant (${f.pregnancy_weeks} weeks). Check before any treatment.`);
  if (f.health.botox_fillers) w.push('Botox or fillers in the last week. Avoid facial treatment for now.');
  if (f.health.retin_a_steroids || f.skin.actives.retinol) w.push('Retinoid or steroid use. Discuss before treatment.');
  if (f.skin.actives.acne_medication) w.push('On acne medication. Check suitability.');
  if (f.health.blood_disorders) w.push('Blood disorder reported. Check with the client before treatment.');
  if (f.health.skin_cancer) w.push('Skin cancer reported. Treatment needs medical permission.');
  if (f.health.recent_facial_ops) w.push('Recent facial operation. Medical permission needed.');
  if (f.health.recent_surgery) w.push('Surgery in the last 6 months. Check before treatment.');
  if (f.health.epilepsy) w.push('Epilepsy reported. Check before treatment.');
  if (f.health.hypersensitive_skin || f.health.skin_allergies) w.push('Sensitive skin or allergies reported. Patch-test first.');
  if (f.skin.recent_procedures) w.push('Recent cosmetic procedure. Check timing before treatment.');
  return w;
}
