# Job Ingestion Pipeline

**Last updated:** 2026-11-10

The `jobs` table in Postgres (Neon) is the single source of truth for job
listings. It is written only by the scheduled ingestion script; the API routes
only read. User requests never touch the job board APIs.

```
GitHub Actions (cron, every 6 h)
  └─ scripts/ingest-jobs.ts
       Remotive        ──┐
       Remote OK       ──┤   parallel, one provider failing never skips the others
       Himalayas       ──┤
       Jobicy          ──┘
                       ▼
       tech-only filter (lib/tech-classifier.ts)
       cross-board dedup (normalized title|company|location)
                       ▼
       upsert into Neon `jobs` (idempotent)
       deactivate vanished · prune old · record `provider_runs`

app (Vercel) ── /api/jobs, /api/jobs/[id] ──► SELECT active rows from Neon
```

## Why this architecture

- **No provider is ever left out.** Every provider is fetched on every run,
  in parallel; a slow or failing provider cannot starve the others (the old
  request-time pool skipped providers once it had enough jobs).
- **Adding a provider** is one entry in `PROVIDERS` (scripts/ingest-jobs.ts),
  one fetcher in `lib/fetchers.ts`, and one name in `CANONICAL_PROVIDERS`
  (lib/jobs-service.ts). Nothing else changes.
- **The cache-bug class dies.** There is no pool cache, no feed-cache TTL
  drift, no early-exit accounting, no hidden Next.js Data Cache under a Redis
  layer. Postgres *is* the cache.
- **Provider outages are visible.** Every run writes a `provider_runs` row
  per provider (success, counts, error, duration), surfaced in `/api/jobs`
  `sources` — and a failed provider makes the GitHub Action run red.

## Cost ($0)

- **GitHub Actions**: the repo is public, so standard runners are free with
  unlimited minutes.
- **Neon free tier**: 1 GB storage. Steady state is ~250–2,000 active jobs
  (well under 100 MB); jobs are pruned 45 days after leaving the feeds.
- **No new services**: no QStash, no Redis for scheduling. Upstash Redis
  remains for saved jobs and the per-user feed cache only.

## Schedule and compliance

- `.github/workflows/ingest-jobs.yml` runs `17 */6 * * *` — every 6 hours at
  :17 (offset off the top of the hour; GitHub delays/drops top-of-hour
  schedules at peak load). Also runnable manually via `workflow_dispatch`.
- Exactly 4 runs/day, matching Remotive's API guidance ("max 4 times a day"),
  with one Remotive request per run.
- Remotive terms require linking back to their board and crediting them:
  `apply_url` stores their listing URL and `source` names the board. Jobicy
  requires crediting and linking the original job URL similarly.
- `concurrency: ingest-jobs` prevents overlapping runs; `timeout-minutes: 15`
  bounds a stuck run.
- **GitHub caveat**: scheduled workflows in public repos are auto-disabled
  after 60 days with no repository activity. Any commit re-enables the
  schedule. If the feed goes stale, check the workflow page and re-enable.

## Pipeline stages (`scripts/ingest-jobs.ts`)

1. **Fetch** (parallel): Remotive (`?category=software-dev`), Remote OK,
   Himalayas, Jobicy (`?industry=engineering`). Providers that return mixed
   verticals get provider-side filters; everything passes the classifier
   next. Caps: 500 for single-request providers (Remotive, Remote OK), 200
   for paginating ones (Himalayas, Jobicy) to bound request counts.
2. **Tech filter** (`lib/tech-classifier.ts`): keep jobs whose title matches
   a tech pattern or whose provider tags contain a known tech tag. This is
   what keeps nurse/sales/legal listings out of the database. The script
   logs a sample of dropped titles per provider for tuning.
3. **Cross-board dedup**: one entry per normalized
   `title|company|canonicalLocation`. Location canonicalization collapses
   remote markers ("Worldwide", "Anywhere") to `remote` while keeping
   geo-specific text. The first provider in fetch order owns the row
   (`source`, `sourceJobId`, `publicId`); later providers fill missing fields
   (salary, company URL) and richer descriptions, and are all recorded in
   `seen_on`.
4. **Upsert** (idempotent): keyed by `dedupKey`. Updates refresh content and
   `lastSeenAt` but never `publicId`/`source`/`sourceJobId` (saved jobs and
   detail links must stay stable). A provider re-listing a posting under a
   new title is handled via the `(source, sourceJobId)` unique constraint.
5. **Deactivate**: rows not seen this run (`lastSeenAt < runStart`) flip to
   `isActive: false` — but only when *every* provider succeeded, so a failed
   provider never marks its jobs dead.
6. **Prune**: rows inactive for 45+ days are deleted (their `job_matches`
   and `user_job_status` rows cascade; saved jobs live in Redis and are
   unaffected).
7. **Record**: one `provider_runs` row per provider per run (success,
   fetched/kept/inserted/updated counts, error, duration).

## Job id stability

`public_id` (e.g. `remotive-123`) is the API-facing id forever. Saved jobs
(Redis) and detail-page links (base64 `encodeJobId`) store it, so the ingest
never rewrites it. Himalayas ids are full URLs; if one overflows the
VarChar(255) column it is deterministically shortened (`prefix + FNV-1a
hash`), never truncated ambiguously.

## Verification

- `npx tsx scripts/ingest-verify.ts` — hermetic: stubs provider HTTP,
  asserts classify/merge/id behavior (no network, no database writes).
- `npx tsx scripts/feed-verify.ts` — exercises the read path
  (`/api/jobs` shape, sources, detail lookups) against the real database
  and Redis with a synthetic user.
- `npx tsx scripts/db-inspect.ts` — table/column sanity check.

## Current provider notes (2026-11-10)

- **Remotive**: the free API returns only 12 listings per request regardless
  of category filters (full access moved to their paid private API). The
  category parameter is still sent — harmless and correct if filtering is
  restored. 4 kept / 12 fetched in the last run.
- **Remote OK**: tech-heavy board; the classifier mainly removes sales and
  marketing roles. 69 kept / 99 fetched.
- **Himalayas**: general remote board — the heaviest classifier filtering.
  44 kept / 200 fetched.
- **Jobicy**: `?industry=engineering` + classifier (their "engineering"
  industry includes non-software engineering and data-labeling gigs).
  140 kept / 200 fetched.

## Adding a provider (checklist)

1. Add a `fetchX` normalizer to `lib/fetchers.ts` producing `Job` objects
   with the `"<provider-slug>-<id>"` id format.
2. Add the entry (name + fetch call + any vertical filter) to `PROVIDERS`
   in `scripts/ingest-jobs.ts`, and the id prefix to `SOURCE_ID_PREFIXES`.
3. Add the provider name to `CANONICAL_PROVIDERS` in `lib/jobs-service.ts`
   so `sources[]` reports it from the first run.
4. If the provider has vertical query params, prefer them (cheaper than
   client-side classification); the classifier is the safety net either way.
5. Run `npx tsx scripts/ingest-verify.ts`, then a manual ingest. Tune the
   classifier from the "dropped sample" log line.
