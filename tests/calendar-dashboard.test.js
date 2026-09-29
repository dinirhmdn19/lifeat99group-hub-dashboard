const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dashboard = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('dashboard contains Calendar integration hooks without browser secrets', () => {
  assert.match(dashboard, /\/api\/calendar/);
  assert.doesNotMatch(dashboard, /GOOGLE_CLIENT_SECRET/);
  assert.doesNotMatch(dashboard, /GOOGLE_REFRESH_TOKEN/);
});

test('calendar guest setting is represented in the Supabase migration', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/20260929_calendar_guests.sql'), 'utf8');
  assert.match(migration, /calendar_guest boolean not null default false/);
});

test('calendar retry keeps a button reference across the async request', () => {
  assert.match(dashboard, /const retryButton = event\.currentTarget;[\s\S]*?await syncCalendar\('upsert', id\)[\s\S]*?retryButton\.disabled/);
});
