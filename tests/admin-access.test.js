const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboard = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

test('dashboard contains one database-backed admin settings flow', () => {
  assert.match(dashboard, /from\('admin_users'\)/);
  assert.match(dashboard, /data-admin-settings/);
  assert.match(dashboard, /rpc\('add_hub_admin'/);
  assert.doesNotMatch(dashboard, /superadmin/i);
});

test('dashboard exposes Google SSO as the only sign-in method', () => {
  assert.match(dashboard, /id="googleLoginButton"/);
  assert.match(dashboard, /signInWithOAuth\(\{\s*provider: 'google'/);
  assert.doesNotMatch(dashboard, /or use email and password/i);
  assert.doesNotMatch(dashboard, /id="loginForm"/);
  assert.doesNotMatch(dashboard, /signInWithPassword/);
});

test('add content opens the same modal form flow as edit content', () => {
  assert.match(dashboard, /querySelectorAll\('\[onclick="openContentForm\(\)"\]'\)/);
  assert.match(dashboard, /addEventListener\('click', \(\) => Hub\.openForm\(null\)\)/);
  assert.match(dashboard, /Hub\.openForm\s*=\s*id\s*=>/);
  assert.match(dashboard, /openModal\(`<button class="modalclose"/);
});

test('content detail navigation uses stable deep-link URLs', () => {
  assert.match(dashboard, /function contentUrl\(id\)/);
  assert.match(dashboard, /history\.pushState\(\{\}, '', contentUrl\(id\)\)/);
  assert.match(dashboard, /window\.addEventListener\('popstate'/);
});

test('content detail includes a copy-link action', () => {
  assert.match(dashboard, /data-copy-content-link/);
  assert.match(dashboard, /navigator\.clipboard\.writeText\(window\.location\.href\)/);
});
