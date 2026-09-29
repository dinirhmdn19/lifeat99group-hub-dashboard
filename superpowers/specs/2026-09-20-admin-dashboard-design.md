# Onboarding@99 Admin Dashboard Design Specification

## Goal

Add a protected `/admin` dashboard inside the existing Next.js + Supabase application. Authorized staff can inspect real onboarding progress and employee records; only Superadmins can reset onboarding data or manage admins.

## Existing system constraints

- Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase JS.
- Employee OAuth/session flow already exists in `components/onboarding.tsx` and must remain intact.
- Existing employee-facing visual language is navy `#07183A`, cream surfaces, coral progress/action accents, leaf success accents, rounded cards and pill buttons.
- Existing onboarding data is distributed across the tables queried by the employee flow; no mock report data is permitted.

## Data model and authorization

Create a migration for:

### `public.admin_users`

`id uuid primary key default gen_random_uuid()`, `user_id uuid not null unique references auth.users(id) on delete cascade`, `role text not null check (role in ('admin','superadmin'))`, `created_at timestamptz not null default now()`, and nullable `created_by uuid references auth.users(id)`. Add an index on `user_id`, enable RLS, and expose no client-side write path.

### `public.admin_audit_log`

`id uuid primary key default gen_random_uuid()`, `actor_user_id uuid not null references auth.users(id)`, `action text not null`, `employee_id uuid references public.onboarding_employees(id) on delete set null`, `metadata jsonb not null default '{}'::jsonb`, and `created_at timestamptz not null default now()`. Enable RLS so only authorized server-side access can read/write it; audit rows are never deleted by reset operations.

Use the authenticated Supabase session and a trusted database lookup of `admin_users.user_id = auth.uid()` for every server action. Role values from query strings, forms, local storage, or React state are never trusted. Admins can read report data only through authorized server queries; only Superadmins can invoke reset and admin-management mutations. Do not expose service-role credentials to the browser. If the existing RLS policies do not safely support admin reporting, add narrow policies or use a server-only privileged client after the role check, with no blanket public access.

Provide `supabase/bootstrap-superadmin.sql` as a manually reviewed, one-time operation accepting an existing `auth.users.id`; it must not contain an email, password, public signup flow, or self-elevation behavior.

## Reset semantics and transaction matrix

The two operations are separate endpoints/actions, each with its own confirmation dialog, server authorization check, audit event, and database transaction/RPC. Both set the employee's onboarding state to Step 1. A failed transaction returns an error and leaves all targeted rows unchanged.

### Reset progress

| Table / fields | Action | Preserved |
|---|---|---|
| `onboarding_progress.current_step`, `.completed_at` | Set `current_step = 1`, `completed_at = null` | Row identity and employee link |
| `onboarding_step_progress.completed`, `.completed_at` | Delete employee's step-progress rows | All answer/response tables |
| `onboarding_systems_check_responses.*` | No change | All Systems Check answers and issue descriptions |
| `onboarding_reflections.*` | No change | All reflections |
| `declaration_submissions.*` | No change | Declaration history |
| `onboarding_feedback.*`, `onboarding_questions.*` | No change | Feedback and shared/question data |
| `admin_audit_log.*` | Insert reset-progress audit row | Existing audit history |

### Full reset

| Table / fields | Action | Preserved |
|---|---|---|
| `onboarding_progress.current_step`, `.completed_at` | Set `current_step = 1`, `completed_at = null` | Row identity and employee link |
| `onboarding_step_progress.*` | Delete employee's step-progress rows | Employee profile/auth |
| `onboarding_systems_check_responses.*` | Delete only rows for the employee | Shared question/configuration |
| `onboarding_reflections.*` | Delete only rows for the employee | Shared question/configuration |
| `onboarding_questions.*` | No change; never delete shared definitions | All question definitions/configuration |
| `declaration_submissions.*` | Preserve historical declaration records; do not delete | Declaration history |
| `onboarding_feedback.*` | Delete employee-specific feedback rows if present in the verified schema; otherwise preserve and document the verified behavior | Employee profile/auth |
| `onboarding_employees.*` | No change | Employee profile |
| `auth.users.*` | No change | Authentication account |
| `admin_audit_log.*` | Insert full-reset audit row | Existing audit history |

Before implementation, verify the exact primary/foreign keys and employee-specific columns in Supabase. In particular, inspect `onboarding_questions` and `declaration_submissions`; reset code must use employee predicates only where the schema proves they exist. Shared questions, video/configuration rows, and historical declarations are never treated as resettable employee responses.

Implement transaction safety in a reviewed SQL RPC for each reset operation, or an equivalent server-side transaction boundary supported by the project. The RPC must re-check `auth.uid()` and Superadmin role inside the database, lock the target employee/progress row where applicable, perform the scoped deletes/updates, and insert the audit record before commit. The UI must not sequence independent client-side deletes.

## Routes and UI

- `/admin`: protected Reports landing page with summary cards for total, not started, in progress, completed, and accurately-derived Systems Check issues.
- `/admin/employees/[id]`: protected employee detail view with profile, progress, completed steps, Systems Check responses/issues, declaration status/history visibility permitted by schema, reflections, and feedback.
- `/admin/settings`: visible and accessible only to Superadmins; list admins, add an existing authenticated user by user ID, change role, and remove admin access. Every mutation is server-authorized and audited.
- Shared admin layout: left sidebar with exactly `Reports` and `Admin Settings` as primary items; hide Settings from non-Superadmins. Reuse existing theme tokens/components and provide responsive mobile navigation.
- Reports table: real employee data, search by name/email, filters for status and available placement/department/manager/date fields, empty/loading/error states, and links to detail pages.
- Reset progress and Full reset are visually distinct, Superadmin-only controls with separate confirmation dialogs that state exactly what is preserved/cleared.

## Testing and security acceptance

- Typecheck/build pass.
- Authorization tests prove unauthenticated users, non-admin users, and Admin-role users cannot read protected admin data or call either reset/admin-management mutation.
- Superadmin tests prove report access, detail access, reset-progress preservation, full-reset scoping, audit insertion, and rollback on failure.
- RLS/migration review confirms no self-promotion, no browser service-role key, no broad employee-data policy, no shared-question deletion, and no declaration-history deletion.
- UI tests cover separate confirmations, loading/error/empty states, responsive navigation, and report totals matching the listing query.
