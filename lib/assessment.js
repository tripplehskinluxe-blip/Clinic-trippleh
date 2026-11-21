// The therapist assessment (page 3 of the paper form). Every answer is kept, and every answer appears in the preview.
export const SKIN_ITEMS = [
  ['moisture', 'Moisture content', ['good', 'poor']],
  ['muscle_tone', 'Muscle tone', ['good', 'poor']],
  ['elasticity', 'Elasticity', ['good', 'poor']],
  ['sensitivity', 'Sensitivity', ['high', 'medium', 'low']],
  ['healing', 'Skin healing ability', ['good', 'poor']],
  ['skin_tone', 'Skin tone', ['fair', 'medium', 'dark']],
  ['circulation', 'Circulation', ['good', 'poor']],
  ['pores', 'Pores', ['dilated', 'constricted']],
];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null; };

export function cleanAssessment(b = {}) {
  const skin = {};
  for (const [k, , opts] of SKIN_ITEMS) skin[k] = opts.includes(b.skin?.[k]) ? b.skin[k] : '';
  const diagram = (Array.isArray(b.diagram) ? b.diagram : []).slice(0, 60)
    .map((m) => ({ x: pct(m?.x), y: pct(m?.y) })).filter((m) => m.x !== null && m.y !== null);
  return {
    notes: str(b.notes, 3000),
    skin,
    overall_skin_type: str(b.overall_skin_type, 120),
    lesions: str(b.lesions, 1000),
    concerns: str(b.concerns, 1000),
    treatment_details: str(b.treatment_details, 2000),
    client_feedback: str(b.client_feedback, 1000),
    diagram,
  };
}

// The assessment as the preview shows it: every item, with a dash where nothing was entered.
export function toAssessmentRows(a) {
  const d = (v) => (v === '' || v === null || v === undefined ? '—' : String(v));
  return {
    notes: d(a.notes),
    skin: SKIN_ITEMS.map(([k, label, opts]) => ({ label, value: a.skin[k] ? cap(a.skin[k]) : '—', choices: opts.map((o) => ({ label: cap(o), ticked: a.skin[k] === o })) })),
    overall_skin_type: d(a.overall_skin_type),
    lesions: d(a.lesions),
    concerns: d(a.concerns),
    treatment_details: d(a.treatment_details),
    client_feedback: d(a.client_feedback),
    diagram: a.diagram,
  };
}
