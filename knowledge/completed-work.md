# Completed Work

**Last updated:** 2026-11-10  
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
- Ingestion moved out of the request path entirely (see
  [Scheduled ingestion](#scheduled-ingestion)): a GitHub Actions workflow
  fetches all four providers in parallel every 6 hours and upserts them into
  the Neon Postgres `jobs` table. Every provider is fetched on every run —
  no provider is skipped because others succeeded, and one failing provider
  cannot starve the rest. Provider health is recorded per run in
  `provider_runs` and surfaced in the `sources` array.
- Added a tech-only classifier ([`lib/tech-classifier.ts`](../lib/tech-classifier.ts))
  so non-tech listings (nursing, sales, legal, …) never reach the database.
  Remotive is requested with `?category=software-dev` and Jobicy with
  `?industry=engineering`; the classifier is the second line of defense.
- Added cross-board deduplication: the same job listed on multiple boards
  becomes one row, with every board recorded in `seen_on` and gaps (salary,
  company URL, richer description) filled from the other boards.
- Jobs that vanish from every feed are deactivated; rows inactive for 45
  days are pruned.
- Added text search, job-type filtering, work-mode filtering, pagination, source counts,
  and provider error reporting.
- Ranks jobs by personalized match score, then by posting date.
- Keeps lower-scoring jobs in the feed instead of silently discarding them.
- Shows the original source and application URL for each listing.
- Job ids (e.g. `remotive-123`) are stable forever: saved jobs and
  detail-page links store them, and the ingestion never rewrites them.
- Pagination is applied server-side before the response is serialized; the full
  contract is documented in [`jobs-api.md`](./jobs-api.md).

## Scheduled ingestion

- [`scripts/ingest-jobs.ts`](../scripts/ingest-jobs.ts) fetches, classifies,
  dedupes, and upserts; it is the only writer of the `jobs` table.
- [`.github/workflows/ingest-jobs.yml`](../.github/workflows/ingest-jobs.yml)
  runs it every 6 hours (`17 */6 * * *`, offset off the top of the hour),
  with `workflow_dispatch` for manual runs, a concurrency guard against
  overlapping runs, and a 15-minute timeout.
- Cost is $0: the repository is public (unlimited free GitHub Actions
  minutes) and the Neon free tier covers the corpus.
- The full pipeline is documented in [`ingestion.md`](./ingestion.md).

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
  - A compact per-user ranked feed with a 15-minute TTL (cache version v4).
    Feed entries store the 360/300-character description/requirements
    previews written at ingest time, so page requests do not move the full
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

- Job listings are read from the Neon Postgres `jobs` table, filled by the
  scheduled ingestion; the request path never calls external job board APIs.
- Clerk is the active authentication integration; the old NextAuth description is no longer
  current.
- Profile and job data are persisted through the application APIs, Prisma, and Redis rather
  than relying only on browser `localStorage`.
- Resume upload/parsing and production job-status workflows are not
  complete yet.
- Database and Redis credentials are supplied through environment variables; secrets are not
  stored in the repository. The GitHub Actions workflow reads `DATABASE_URL`
  from repository secrets.
- Routine profile reads use the database through `/api/onboarding`; Clerk-to-database user
  provisioning occurs only when a first-time user submits onboarding.

## Recent changes

Recent work (on top of `9970b8d`) delivers the ingestion pipeline:

- The full ingestion pipeline described above (schema, `scripts/ingest-jobs.ts`,
  the GitHub Actions workflow, the DB-backed `lib/jobs-service.ts` rewrite,
  and the tech classifier), plus the jobs-feed caching fixes that preceded it.
- Verification scripts: [`scripts/ingest-verify.ts`](../scripts/ingest-verify.ts)
  (hermetic pipeline check), [`scripts/feed-verify.ts`](../scripts/feed-verify.ts)
  (read-path check against the live database), and
  [`scripts/db-inspect.ts`](../scripts/db-inspect.ts) (schema sanity check).
- Command-menu and theme-toggle styling polish.
