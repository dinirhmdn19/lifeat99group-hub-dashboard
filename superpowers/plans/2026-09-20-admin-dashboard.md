# Onboarding@99 Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, theme-consistent `/admin` dashboard with reports, employee details, Superadmin-only resets, audit logging, and admin management.

**Architecture:** App Router pages share a protected admin layout. Server-only authorization helpers and route handlers/RPCs enforce identity and role; report queries read the existing onboarding tables. Reset semantics live in reviewed database functions so scoped deletes, preservation rules, locks, and audit writes commit atomically.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase Auth/Postgres/RLS, existing project components.

**Spec:** `docs/superpowers/specs/2026-09-20-admin-dashboard-design.md`

## Global Constraints

- Keep all work inside the existing app at `/admin`; do not modify the employee onboarding experience.
- Use real Supabase data; no mock totals or fabricated employee fields.
- Never trust browser-supplied roles; authorize with `auth.uid()` and `admin_users` on every server operation.
- Reset Progress preserves answers, Systems Check responses/issues, reflections, and declaration history.
- Full Reset clears only verified employee-specific onboarding responses and reflections, preserves profile/auth/audit/declaration history, and never deletes shared `onboarding_questions` definitions.
- Do not expose service-role credentials to client code or disable RLS.

## Review Focus

- Unauthenticated/non-admin direct requests must be denied — test protected page and every mutation endpoint.
- Admin role must be read-only — test reset and settings mutations return forbidden.
- Reset Progress must preserve submitted data — test all preservation tables.
- Full Reset must not delete shared questions or declarations — test scoped row counts and history.
- Failed reset must roll back and create no partial audit/data state — test transaction failure path.

### Task 1: Verify schema and add security migration

**Files:** Create `supabase/admin_dashboard.sql`, `supabase/bootstrap-superadmin.sql`; inspect existing Supabase migrations/schema and document verified columns in the migration comments.

- [ ] Inspect actual definitions/RLS for `onboarding_employees`, `onboarding_progress`, `onboarding_step_progress`, `onboarding_systems_check_responses`, `onboarding_reflections`, `onboarding_questions`, `declaration_submissions`, and `onboarding_feedback`.
- [ ] Create `admin_users` and `admin_audit_log` with constraints, indexes, RLS, and narrowly-scoped policies.
- [ ] Add `reset_progress(target_employee_id uuid)` and `full_reset(target_employee_id uuid)` database functions. Each checks `auth.uid()` and the Superadmin row, locks the employee/progress record, applies the exact spec matrix, writes an audit row, and raises on invalid target/schema assumptions.
- [ ] Add a reviewed bootstrap SQL statement that requires a manually substituted existing `auth.users.id` and inserts only `superadmin`.
- [ ] Validate migration syntax and policy behavior in a disposable/local Supabase environment or SQL review workflow available to the repo.

### Task 2: Add server auth and data-access boundaries

**Files:** Create `lib/admin-auth.ts`, `lib/admin-data.ts`, `lib/admin-actions.ts`; modify `lib/supabase.ts` only if a server/client split is required.

- [ ] Add `requireAdmin()` returning `{ user, role }` or a typed forbidden response, using the server Supabase session and a database-backed role lookup.
- [ ] Add `requireSuperadmin()` for mutations.
- [ ] Add typed report/detail query functions that derive status from verified progress/step rows and return only fields needed by admin pages.
- [ ] Add server actions or route handlers for `resetProgress`, `fullReset`, and admin-user CRUD; each calls the matching DB function after server authorization and normalizes errors.
- [ ] Add tests for unauthenticated, Admin, and Superadmin paths, including direct invocation without UI state.

### Task 3: Build protected admin shell and Reports page

**Files:** Create `app/admin/layout.tsx`, `app/admin/page.tsx`, `components/admin/admin-sidebar.tsx`, `components/admin/admin-ui.tsx`, and focused admin styles only where existing tokens cannot express the design.

- [ ] Build the two-item sidebar and role-aware Settings visibility using the authorized server role.
- [ ] Build responsive summary cards and the employee table using the report query.
- [ ] Add search/status/placement/department/manager/date filters only for verified fields.
- [ ] Add loading, empty, error, and mobile states; ensure summary counts use the same filtered/unfiltered dataset definition as the listing.
- [ ] Add page-level authorization tests and component tests for filters and navigation.

### Task 4: Build employee detail and reset controls

**Files:** Create `app/admin/employees/[id]/page.tsx`, `components/admin/employee-detail.tsx`, `components/admin/reset-dialog.tsx`.

- [ ] Render verified profile fields, progress, steps, Systems Check rows, declaration history/status, reflections, feedback, and manager questions without exposing unrelated records.
- [ ] Add separate Reset Progress and Full Reset dialogs with exact preservation/clearing copy from the spec.
- [ ] Show controls only to Superadmins, but rely on server/database authorization for enforcement.
- [ ] Add success/error/toast or inline feedback and refresh the detail view after a committed mutation.
- [ ] Test that each dialog invokes only its own mutation and that Admin users cannot invoke either action.

### Task 5: Build Superadmin Settings

**Files:** Create `app/admin/settings/page.tsx`, `components/admin/admin-settings.tsx`.

- [ ] List current admin users with role and created metadata, using authorized data access.
- [ ] Add existing-user assignment, role change, and removal flows with validation and separate confirmation where destructive.
- [ ] Prevent removal/demotion of the last Superadmin in the database transaction.
- [ ] Audit every settings mutation and test self-promotion/last-superadmin protections.

### Task 6: Verification and security review

**Files:** Modify tests and `README.md` with setup/bootstrap instructions; add no secrets.

- [ ] Run `pnpm typecheck`, `pnpm lint` if supported by the existing Next setup, and `pnpm build`.
- [ ] Run auth/RLS/reset/report tests against a configured test database or documented SQL verification environment.
- [ ] Manually review client bundles/env usage for service-role secrets and inspect direct URL access to `/admin`, detail, settings, and mutation routes.
- [ ] Verify responsive UI, theme consistency, and separate reset confirmations at desktop/mobile widths.
- [ ] Document required public Supabase variables and the one-time bootstrap command without printing secret values.
