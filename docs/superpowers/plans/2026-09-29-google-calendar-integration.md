# Google Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add secure, idempotent Google Calendar synchronization for Content Hub items.

**Architecture:** Add a Vercel serverless Calendar API boundary. The browser keeps using Supabase for content writes, then invokes the API with the current Supabase session; the API verifies the user, performs Google Calendar operations, and writes the event ID back to Supabase.

**Tech Stack:** Static HTML/JavaScript, Supabase Auth/Postgres, Vercel serverless functions, Google Calendar API v3, Node built-ins plus the official Google API client.

**Spec:** `docs/superpowers/specs/2026-09-29-google-calendar-integration-design.md`

## Global Constraints

- Google credentials and refresh tokens must remain server-side.
- Calendar operations happen only after successful Supabase content creation.
- One content item maps to at most one Calendar event through `google_calendar_event_id`.
- Guest selection changes affect future events only.
- Calendar failures do not roll back or delete content.
- Use `Asia/Jakarta` and a one-hour event duration.

## Review Focus

- A repeated create request with an existing event ID must not create a duplicate.
- A Calendar API failure after content creation must preserve the content and expose retryable state.
- A content date/title edit must update the existing event, not create another one.
- A deleted content item must remove its linked event when possible.
- Only active users marked `calendar_guest` are invited to newly-created events.

### Task 1: Server-side Calendar service

**Files:**
- Create: `api/calendar.js`
- Create: `lib/calendar-service.js`
- Test: `tests/calendar-service.test.js`

**Interfaces:**
- `buildEvent(content, attendees)` returns the Google Calendar event resource.
- `syncContentEvent({ contentId, operation, accessToken })` performs create/update/delete with idempotent Supabase persistence.

- [ ] Write failing tests for event shape, Jakarta timestamps, attendee filtering, and duplicate prevention.
- [ ] Run the focused test and confirm failure because the service is absent.
- [ ] Implement the service and Vercel handler with server-only Google OAuth credentials.
- [ ] Run focused tests and confirm they pass.

### Task 2: Database and dashboard integration

**Files:**
- Create: `supabase/migrations/20260929_calendar_guests.sql`
- Modify: `index.html`
- Test: `tests/calendar-dashboard.test.js`

**Interfaces:**
- Dashboard calls `/api/calendar` after successful insert/update/delete.
- Retry calls the same endpoint for a content ID whose Calendar ID is missing.

- [ ] Write failing source-level tests for the migration, post-insert call, update/delete hooks, and stable content URL.
- [ ] Run them and confirm failure.
- [ ] Add `calendar_guest`, Calendar status/retry UI, and API calls without exposing secrets.
- [ ] Run focused tests and confirm they pass.

### Task 3: Setup documentation and verification

**Files:**
- Create: `docs/google-calendar-setup.md`
- Modify: `README.md` if present

- [ ] Document Google Cloud project/API/OAuth setup, redirect URI, scope, refresh-token generation, Calendar sharing, Supabase migration/table editing, Vercel variables, redeployment, and local testing.
- [ ] Run the complete test suite and static checks.
- [ ] Inspect the final diff for secrets, duplicate event paths, and incomplete setup steps.
