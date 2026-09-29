const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'c_e4e58d37c0e3d12c795affcbe014a0974fafc5507f64ab2a2879493a0ef05f4f@group.calendar.google.com';
const TIME_ZONE = 'Asia/Jakarta';

function buildEvent(content, attendeeEmails = []) {
  const date = content.publish_date;
  return {
    summary: content.content_name,
    description: `Life@99 Group Hub content: /content/${encodeURIComponent(content.id)}`,
    start: { dateTime: `${date}T19:00:00+07:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${date}T20:00:00+07:00`, timeZone: TIME_ZONE },
    attendees: attendeeEmails.map(email => ({ email }))
  };
}

function selectCalendarGuests(users = []) {
  return users
    .filter(user => user.is_active && user.calendar_guest && user.email)
    .map(user => user.email);
}

async function googleAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Google token exchange failed: ${data.error_description || data.error || response.status}`);
  return data.access_token;
}

async function calendarRequest(method, eventId, body) {
  const token = await googleAccessToken();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Google Calendar request failed: ${data.error?.message || response.status}`);
  }
  return response.status === 404 || response.status === 204 ? null : response.json();
}

module.exports = { CALENDAR_ID, TIME_ZONE, buildEvent, selectCalendarGuests, calendarRequest };
