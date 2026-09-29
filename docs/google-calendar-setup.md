# Google Calendar integration setup

The code creates one-hour events at 7:00–8:00 PM Asia/Jakarta. The designated Google account is the event organizer. Dashboard admins are not automatically guests: only active `app_users` rows with `calendar_guest = true` are invited to future events. Changing that flag does not change existing events.

## A. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project dedicated to Life@99 Group Hub.
2. Open **APIs & Services → Library**, search for **Google Calendar API**, and click **Enable**.
3. Open **Google Auth Platform → Branding** and configure the app name, support email, and developer contact email. If Google asks for audience, use **Internal** when the account is in a Google Workspace organization; otherwise use **External** and add the designated organizer account as a test user.
4. Open **Google Auth Platform → Clients → Create client**, choose **Web application**, and add this authorized redirect URI if you will use OAuth Playground to generate the refresh token:

   `https://developers.google.com/oauthplayground`

5. Copy the generated **Client ID** and **Client secret**. The Client ID is not sufficient by itself; the Client secret must stay private.
6. Use the narrow Calendar scope:

   `https://www.googleapis.com/auth/calendar.events`

   This is the scope used to create, update, and delete events. Google’s Calendar API documents `calendar.events` as an accepted scope for event insertion.
7. Generate the refresh token with [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground): click the settings gear, enable **Use your own OAuth credentials**, enter the Client ID and Client secret, select the Calendar events scope, authorize with the designated organizer account, exchange the authorization code, and copy the refresh token.

Never put the Client secret or refresh token in `index.html`, Git, browser JavaScript, or a public Supabase table.

## B. Google Calendar

1. Sign in to Google Calendar as the designated organizer account.
2. Add the existing Life@99 calendar to that account, or open the calendar’s **Settings and sharing** page and share it with the organizer account.
3. Give the organizer account **Make changes to events** permission. The account must be able to create, update, and delete events.
4. Verify the Calendar ID in **Settings and sharing → Integrate calendar → Calendar ID**. It should be:

   `c_e4e58d37c0e3d12c795affcbe014a0974fafc5507f64ab2a2879493a0ef05f4f@group.calendar.google.com`

   Use the value shown by Google if it differs. The `src` value from the supplied embed URL is the API Calendar ID after URL decoding; the full embed URL is not used as the ID.

5. Add any non-guest admins directly to the shared calendar in Google Calendar. They will have calendar membership but will not receive attendee invitations from newly-created content events.

## C. Supabase

1. Open the Supabase project connected to the dashboard.
2. Open **SQL Editor**, create a new query, paste the complete migration below, and click **Run**:

   ```sql
   alter table public.app_users
     add column if not exists calendar_guest boolean not null default false;
   ```

3. Open **Table Editor → app_users**. Set `calendar_guest` to `true` only for active admins who should receive event invitations. Leave it `false` for admins who only access the shared calendar directly.
4. Confirm `content.google_calendar_event_id` exists. It is already included in the repository’s earlier foundation migration. If it is missing in the live database, run:

   ```sql
   alter table public.content
     add column if not exists google_calendar_event_id text;
   ```

No Supabase Edge Function, database trigger, or webhook is required. The Vercel function performs the Calendar work only after the browser confirms that Supabase saved the content.

## D. Vercel

In the Vercel project, open **Settings → Environment Variables** and add these variables for **Production** and **Preview** as needed:

| Variable | Value | Visibility |
|---|---|---|
| `SUPABASE_URL` | `https://trlkbgghfddjdttmarlp.supabase.co` | Server-only in this function |
| `SUPABASE_ANON_KEY` | The publishable key already used by the dashboard | Server-only in this function |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **Project Settings → API → service_role** key | Secret; never expose publicly |
| `GOOGLE_CLIENT_ID` | Google OAuth Web application Client ID | Secret in this setup; do not place in frontend code |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Web application Client secret | Secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token generated for the designated organizer account | Secret |
| `GOOGLE_CALENDAR_ID` | `c_e4e58d37c0e3d12c795affcbe014a0974fafc5507f64ab2a2879493a0ef05f4f@group.calendar.google.com` | Configuration value |

After adding or changing environment variables, deploy again. Vercel applies environment-variable changes to new deployments, not previous deployments.

## E. Local testing

1. Install Node.js locally if it is not already installed.
2. From the project folder, create a local `.env` file with the same variables. Do not commit it.
3. Run the repository’s static site through the Vercel CLI, for example `npx vercel dev`, so `/api/calendar` is available locally.
4. Sign in through the dashboard with an authorized Supabase account.
5. In Supabase Table Editor, mark one test admin as `calendar_guest = true`.
6. Create a test content item with a publish date. Confirm the content is saved and a 7:00 PM event appears in the target calendar with the `/content/{id}` link.
7. Edit the title or drag the item to another date and confirm the same event moves/renames instead of a duplicate being created.
8. Temporarily remove Calendar write permission or use an invalid token to test the failure path. The content should remain in Supabase and the content detail’s **Sync Calendar** button should allow retrying.
9. Remove the test content and verify its Calendar event is deleted.
