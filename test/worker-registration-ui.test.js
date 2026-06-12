const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'worker-registration.html'),
  'utf8'
);

test('worker registration form includes required worker fields', () => {
  assert.match(html, /id="worker-name"/);
  assert.match(html, /name="workerName"/);
  assert.match(html, /id="daily-wage-rate"/);
  assert.match(html, /name="dailyWageRate"/);
  assert.match(html, /id="job-type"/);
  assert.match(html, /name="jobType"/);
});

test('worker registration form includes the expected job type options', () => {
  assert.match(html, />Bolt driver</);
  assert.match(html, />Dispatch rider</);
  assert.match(html, />Trader</);
});

test('worker registration form has a submit button', () => {
  assert.match(html, /<button[^>]+type="submit"[^>]*>Register worker<\/button>/);
});
