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

test('calendar summary omits green helper text and the total content card', () => {
  const calendar = dashboard.match(/<section class="view active" id="calendar">[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(calendar, /class="delta"/);
  assert.doesNotMatch(calendar, /Total content/);
});

test('calendar summary includes an auto-updating next-to-post card', () => {
  const calendar = dashboard.match(/<section class="view active" id="calendar">[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(calendar, /class="stat upcoming-stat"/);
  assert.match(calendar, /Next to post/);
  assert.match(dashboard, /publish_date && item\.publish_date >= todayKey\(\) && item\.status !== 'posted'/);
});

test('calendar guest setting is represented in the Supabase migration', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/20260929_calendar_guests.sql'), 'utf8');
  assert.match(migration, /calendar_guest boolean not null default false/);
});

test('calendar retry keeps a button reference across the async request', () => {
  assert.match(dashboard, /const retryButton = event\.currentTarget;[\s\S]*?await syncCalendar\('upsert', id\)[\s\S]*?retryButton\.disabled/);
});

test('content detail card exposes a lower-right trash button wired to removal', () => {
  assert.match(dashboard, /data-remove-content/);
  assert.match(dashboard, /setAttribute\('aria-label', 'Remove content'\)/);
  assert.match(dashboard, /data-remove-content[\s\S]*?Hub\.remove\(id\)/);
});

test('calendar API checks for a missing Google event response before reading its id', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api/calendar.js'), 'utf8');
  assert.match(api, /if \(!created\|\| !created\.id\)/);
});

test('calendar service preserves Google 404 details for create requests', () => {
  const service = fs.readFileSync(path.join(__dirname, '..', 'lib/calendar-service.js'), 'utf8');
  assert.match(service, /allowNotFound = false/);
  assert.match(service, /Google Calendar request failed \(404\)/);
});

test('calendar service uses the production dashboard base URL for content links', () => {
  const service = fs.readFileSync(path.join(__dirname, '..', 'lib/calendar-service.js'), 'utf8');
  assert.match(service, /lifeat99group-hub-dashboard\.vercel\.app/);
  assert.match(service, /<a href=/);
});

test('Vercel rewrites content deep links to the dashboard shell', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  assert.deepEqual(vercel.rewrites, [{ source: '/content/:id*', destination: '/' }]);
});
