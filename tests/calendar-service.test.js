const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEvent, selectCalendarGuests } = require('../lib/calendar-service');

test('buildEvent creates a one-hour Jakarta event with a stable dashboard link', () => {
  const event = buildEvent({ id: 'abc', content_name: 'Employee Spotlight: Nia', publish_date: '2026-10-05' }, ['admin@example.com']);
  assert.deepEqual(event, {
    summary: 'Employee Spotlight: Nia',
    description: 'Life@99 Group Hub content: /content/abc',
    start: { dateTime: '2026-10-05T19:00:00+07:00', timeZone: 'Asia/Jakarta' },
    end: { dateTime: '2026-10-05T20:00:00+07:00', timeZone: 'Asia/Jakarta' },
    attendees: [{ email: 'admin@example.com' }]
  });
});

test('selectCalendarGuests includes only active users marked as calendar guests', () => {
  assert.deepEqual(selectCalendarGuests([
    { email: 'yes@example.com', is_active: true, calendar_guest: true },
    { email: 'inactive@example.com', is_active: false, calendar_guest: true },
    { email: 'no@example.com', is_active: true, calendar_guest: false },
    { email: null, is_active: true, calendar_guest: true }
  ]), ['yes@example.com']);
});
