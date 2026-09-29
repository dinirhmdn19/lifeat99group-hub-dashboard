# Google Calendar Integration Design

## Goal

Create one Google Calendar event for each new Content Hub item after the Supabase insert succeeds, using the Life@99 shared calendar and Asia/Jakarta time. Keep the content record if Calendar creation fails and allow retrying the Calendar operation.

## Architecture

The static dashboard calls a small Vercel serverless endpoint for Calendar operations. Google OAuth credentials and the refresh token remain server-side in Vercel environment variables. Supabase remains the source of truth for content and stores `google_calendar_event_id` for idempotency.

The designated Google integration account owns the event creation. Dashboard admins are independent from Calendar attendees. A Supabase-controlled `calendar_guest` flag determines which admin/user email addresses are added to newly created events; changing the flag affects future events only.

## Event behavior

- Calendar ID: `c_e4e58d37c0e3d12c795affcbe014a0974fafc5507f64ab2a2879493a0ef05f4f@group.calendar.google.com`
- Title: `content_name`
- Start: publish date at 19:00:00 in `Asia/Jakarta`
- End: one hour later in `Asia/Jakarta`
- Description: stable dashboard URL `/content/{id}`
- Attendees: active users with `calendar_guest = true`
- Create only after a successful Supabase content insert
- Never create a second event when `google_calendar_event_id` is already present
- Update title/date/description for existing events when content changes
- Delete the matching Calendar event when content is deleted
- Calendar failure never deletes successfully-created content

## Data model

The existing deployed migration already contains `content.google_calendar_event_id`. Add `app_users.calendar_guest boolean not null default false` through a separate idempotent migration. The value is editable from the Supabase table editor.

## Security

The browser sends an authenticated Supabase access token to the Vercel endpoint. The endpoint verifies the token with Supabase, checks Hub authorization, queries attendee emails server-side, and uses Google OAuth refresh credentials server-side. Client secrets and refresh tokens are never exposed to browser JavaScript.

## Scope

The first version includes create, update, retry, duplicate prevention, and delete synchronization. It does not retroactively change attendees when `calendar_guest` changes, and it does not add a new dashboard guest-management UI.
