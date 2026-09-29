const { buildEvent, selectCalendarGuests, calendarRequest } = require('../lib/calendar-service');

const json = (res, status, value) => res.status(status).json(value);

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error_description || `Supabase request failed: ${response.status}`);
  return data;
}

async function requireHubUser(req) {
  const accessToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!accessToken) throw new Error('Missing Supabase access token');
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${accessToken}` } });
  const user = await response.json();
  if (!response.ok || !user.id) throw new Error('Invalid Supabase session');
  const admins = await supabaseRequest(`/rest/v1/app_users?auth_user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=auth_user_id`);
  if (!admins?.length) throw new Error('User is not authorised for Content Hub');
  return user;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
  try {
    await requireHubUser(req);
    const { operation = 'upsert', contentId } = req.body || {};
    if (!contentId) return json(res, 400, { error: 'contentId is required' });
    const rows = await supabaseRequest(`/rest/v1/content?id=eq.${encodeURIComponent(contentId)}&select=*`);
    const content = rows?.[0];
    if (!content) return json(res, 404, { error: 'Content not found' });

    if (operation === 'delete') {
      if (content.google_calendar_event_id) await calendarRequest('DELETE', content.google_calendar_event_id);
      return json(res, 200, { deleted: true });
    }

    const users = await supabaseRequest('/rest/v1/app_users?is_active=eq.true&select=email,is_active,calendar_guest');
    const event = buildEvent(content, selectCalendarGuests(users));
    if (content.google_calendar_event_id) {
      // Guest membership is intentionally frozen after creation. Title/date/link
      // changes update the event, while calendar_guest changes affect future events only.
      const updateEvent = { ...event };
      delete updateEvent.attendees;
      const updated = await calendarRequest('PATCH', content.google_calendar_event_id, updateEvent, true);
      if (!updated) {
        const created = await calendarRequest('POST', null, event);
        if (!created || !created.id) throw new Error('Google Calendar did not return a created event. Verify GOOGLE_CALENDAR_ID and that the organizer account has access to this calendar.');
        await supabaseRequest(`/rest/v1/content?id=eq.${encodeURIComponent(contentId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ google_calendar_event_id: created.id, updated_at: new Date().toISOString() }) });
        return json(res, 200, { eventId: created.id, recreated: true });
      }
      return json(res, 200, { eventId: updated.id, updated: true });
    }
    const created = await calendarRequest('POST', null, event);
    if (!created || !created.id) throw new Error('Google Calendar did not return a created event. Verify GOOGLE_CALENDAR_ID and that the organizer account has access to this calendar.');
    await supabaseRequest(`/rest/v1/content?id=eq.${encodeURIComponent(contentId)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ google_calendar_event_id: created.id, updated_at: new Date().toISOString() }) });
    return json(res, 200, { eventId: created.id, created: true });
  } catch (error) {
    console.error('calendar integration error', error);
    return json(res, 502, { error: error.message });
  }
};
