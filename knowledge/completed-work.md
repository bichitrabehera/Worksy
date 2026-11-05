# Completed Work

**Last updated:** 2026-11-04  
**Project:** Job Search

This document records the functionality currently implemented in the repository. The older
[`implementation-summary.md`](./implementation-summary.md) describes an earlier MVP state and
should be treated as historical context.

## Product and UI

- Added a public landing page with product messaging, calls to action, and job-source highlights.
- Added Clerk-powered sign-in and sign-up pages.
- Added protected job discovery at `/jobs`.
- Added onboarding at `/onboarding` for education, skills, roles, locations, work mode,
  job type, and experience preferences.
- Added profile management at `/profile`.
- Added saved jobs at `/saved` and job tracking at `/my-jobs`.
- Added a job detail page at `/jobs/[id]` with the complete description, requirements,
  match breakdown, salary, source, and save/apply actions.
- Refined the job cards with company avatars, icon-based metadata, match badges, and a
  clearer action footer.
- Added `/about` and `/privacy` pages.
- Added a shared navigation bar, footer, company avatars, bookmark controls, pagination,
  loading states, and reusable UI components.
- Added responsive styling, custom fonts, dark visual styling, and Tailwind CSS utilities.

## Authentication and account management

- Integrated Clerk authentication and Google sign-in.
- Protected `/jobs`, `/profile`, `/preferences`, and `/settings` with Clerk middleware.
- Added user synchronization from Clerk into the application database.
- Added account deletion that removes the Clerk user and corresponding database user.
- Added authentication-aware navigation and sign-out controls.

## Job discovery

- Added live adapters for:
  - Remotive
  - Himalayas
  - Remote OK
  - Jobicy
- Normalized provider responses into the shared `Job` type.
- Added provider-specific handling for remote and India-eligible listings.
- Fetches providers concurrently with `Promise.allSettled`, so one provider failure does
  not prevent other sources from returning results.
- Added URL/title/company/location-based deduplication.
- Added text search, job-type filtering, work-mode filtering, pagination, source counts,
  and provider error reporting.
- Ranks jobs by personalized match score, then by posting date.
- Keeps lower-scoring jobs in the feed instead of silently discarding them.
- Shows the original source and application URL for each listing.
- Pagination is applied server-side before the response is serialized; the full
  contract is documented in [`jobs-api.md`](./jobs-api.md).

## Matching

- Added rule-based matching in [`lib/matching.ts`](../lib/matching.ts).
- Scores skills, desired roles, location, work mode, job type, and experience preference.
- Recognizes fresher-friendly experience levels and generates human-readable match reasons.
- Supports both current and legacy profile preference field names.

## Persistence and APIs

- Added Prisma models for users, profiles, jobs, job matches, user job statuses, and saved
  jobs in [`prisma/schema.prisma`](../prisma/schema.prisma).
- Added Prisma client setup for PostgreSQL.
- Added Upstash Redis integration for:
  - A shared provider job pool with a 30-minute TTL and a bounded per-provider
    fetch budget.
  - A compact per-user ranked feed with a 45-minute TTL. Feed entries store
    360-character description previews, so page requests do not move the full
    job corpus.
  - Per-user saved-job storage with a 30-day TTL.
  - Cache invalidation after profile updates, using the same key helper as the
    jobs service.
- Added API routes:
  - `GET /api/jobs`
  - `GET|POST /api/onboarding`
  - `GET|POST|DELETE /api/saved`
  - `DELETE /api/user/delete`
- Added request authentication and explicit unauthorized, validation, not-found, and server
  error responses.
- Added per-user cache keys so personalized job data is not shared between users.
- Saved-job state is synchronized through [`lib/saved-jobs.ts`](../lib/saved-jobs.ts): the
  server list is authoritative, and the `localStorage` cache is updated on save and removal
  from `/jobs`, `/jobs/[id]`, and `/my-jobs` so bookmarks cannot go stale.
- User sync is race-safe: it reuses an existing user by Clerk id without calling the Clerk
  API, recovers from unique-constraint conflicts caused by concurrent requests, and creates
  a missing profile without overwriting existing data.
- The profile page surfaces real API errors, retries once on transient server failures, and
  offers a manual retry button instead of failing silently.

## Current implementation notes

- Job listings are fetched from live external providers; the old mock-data description is no
  longer current.
- Clerk is the active authentication integration; the old NextAuth description is no longer
  current.
- Profile and job data are persisted through the application APIs, Prisma, and Redis rather
  than relying only on browser `localStorage`.
- Resume upload/parsing, scheduled ingestion, and production job-status workflows are not
  complete yet.
- Database and Redis credentials are supplied through environment variables; secrets are not
  stored in the repository.
- Routine profile reads use the database through `/api/onboarding`; Clerk-to-database user
  provisioning occurs only when a first-time user submits onboarding.

## Recent worktree changes

The current uncommitted changes also include Clerk error fixes in the sign-in and sign-up
pages and a simplified Clerk middleware matcher. These changes are visible in:

- [`app/sign-in/[[...sign-in]]/page.tsx`](../app/sign-in/[[...sign-in]]/page.tsx)
- [`app/sign-up/[[...sign-up]]/page.tsx`](../app/sign-up/[[...sign-up]]/page.tsx)
- [`proxy.ts`](../proxy.ts)
