# Onboarding Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Steps 4–7 video configuration editable by Superadmins while preserving employee onboarding behavior.

**Architecture:** Reuse `requireSuperadmin()`, the existing admin layout, server actions, and Supabase anon client. Store one active Google Drive configuration row per video step with RLS permitting authenticated employee reads of only the rendering fields and Superadmin-only writes. Replace the employee renderer’s stale hardcoded storage URLs with the database value.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Supabase, Tailwind.

**Spec:** Product requirements approved in chat on 2026-09-22.

## Global Constraints

- Superadmin-only management; regular admins cannot see or directly access the route.
- No service-role credentials in browser code.
- Seed the verified IDs from `config/steps.ts` without changing the initial employee experience.
- Preserve video completion locking, progress tracking, translations, and existing admin features.
- Do not deploy, commit, or push.

## Review Focus

- Regular admin route access returns the existing unauthorized redirect behavior.
- Empty, malformed, or unsupported video input cannot be saved.
- Employee reads expose only step/title/video URL fields required to render onboarding.
- A saved Google Drive ID is converted to the existing embeddable URL and is used instead of the stale hardcoded map.
- Existing video completion handlers remain unchanged.

### Task 1: Database configuration and shared video helpers

**Files:** Create a Supabase migration; modify `types/index.ts`; add a small validation/URL helper module.

- Add `onboarding_videos` with unique `step_number`, title, `video_id`, `video_url`, `is_active`, timestamps, and `updated_by`.
- Seed Steps 4–7 from the verified values in `config/steps.ts`.
- Enable RLS; permit authenticated reads of only active step/title/video fields and permit insert/update/delete only when `admin_users.role = 'superadmin'`.
- Add validation supporting Google Drive IDs, Drive file URLs, and embeddable URLs; reject empty/invalid values.
- Add tests for all accepted/rejected formats and URL normalization.

### Task 2: Superadmin management actions and page

**Files:** Create `/app/admin/onboarding-videos/page.tsx`, a client management component, and server actions; modify the sidebar.

- Load rows server-side after `requireSuperadmin()`.
- Save through a server action that rechecks `requireSuperadmin()`, validates/normalizes input, records `updated_by`, and returns a typed success/error result.
- Render actual step titles, current metadata, input, Preview, Save, and clear status messages responsively.
- Preview only the normalized authenticated-page embed, with no public preview endpoint.
- Add the sidebar item only for `superadmin`; redirect unauthorized page access using the existing pattern.

### Task 3: Employee database source of truth

**Files:** Modify `components/onboarding.tsx` and related types/helpers.

- Keep the existing database query and minimum field selection.
- Remove the stale hardcoded `VIDEO_URLS` map from the renderer.
- Use the active database row’s normalized video URL/ID for the `VideoEmbed` source, preserving all existing completion and progress callbacks.
- Leave missing-configuration behavior as the existing localized unavailable state.

### Task 4: Verification

- Run typecheck and production build.
- Inspect the diff for client-side service-role or sensitive data exposure.
- Verify route/sidebar role conditions, migration seed values, RLS predicates, and unchanged completion handlers with targeted searches.
- Report any environment-dependent checks that cannot run locally.
