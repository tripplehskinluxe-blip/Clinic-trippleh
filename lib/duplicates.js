// The duplicate rule, pure so it can be tested: a matching name and phone is stopped unless the person says it is a different client.
export function duplicateDecision(isDuplicate, confirmed) {
  if (!isDuplicate) return 'ok';
  return confirmed === true ? 'ok' : 'ask';
}
