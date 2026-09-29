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
