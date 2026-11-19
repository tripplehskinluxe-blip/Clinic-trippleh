import test from 'node:test';
import assert from 'node:assert/strict';
import cfg from '../next.config.mjs';

test('every page gets the security headers, is never cached, and is not indexed', async () => {
  const rules = await cfg.headers();
  const h = Object.fromEntries(rules[0].headers.map((x) => [x.key, x.value]));
  assert.match(h['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(h['Content-Security-Policy'], /object-src 'none'/);
  assert.equal(h['X-Frame-Options'], 'DENY');
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.match(h['Strict-Transport-Security'], /max-age=\d+/);
  assert.equal(h['Referrer-Policy'], 'no-referrer');
  assert.equal(h['Cache-Control'], 'no-store, max-age=0');
  assert.match(h['X-Robots-Tag'], /noindex/);
});
