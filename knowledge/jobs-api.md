# Jobs API Contract

**Last updated:** 2026-11-10
**Routes:** `GET /api/jobs`, `GET /api/jobs/[id]`

Both routes require an authenticated Clerk session and return `401` without one.

## `GET /api/jobs`

Returns one page of the signed-in user's ranked job feed.

### Query parameters

| Name | Type | Default | Bounds | Notes |
|---|---|---|---|---|
| `page` | integer | `1` | `>= 1` | 1-based page number. |
| `limit` | integer | `12` | `1–24` | Page size. |
| `q` | string | empty | 120 chars | Case-insensitive match against job title, company, and the feed description preview. |
| `jobType` | string | empty | — | Exact match, case-insensitive (e.g. `Full-time`). |
| `workMode` | string | empty | — | Exact match, case-insensitive (`Remote`, `Hybrid`, `On-site`). |

Invalid or missing numeric values fall back to the defaults; they are not rejected.

### Response

```jsonc
{
  "jobs": [ /* page of jobs, description truncated to a feed preview */ ],
  "count": 12,
  "page": 2,
  "pageSize": 12,
  "hasMore": true,
  "totalCount": 140,
  "matchedCount": 140,
  "totalPages": 12,
  "pagination": {
    "page": 2,
    "limit": 12,
    "returned": 12,
    "total": 140,
    "totalPages": 12,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "nextPage": 3,
    "previousPage": 1
  },
  "sources": [
    { "name": "Remotive", "success": true, "skipped": false, "count": 82 },
    { "name": "Remote OK", "success": true, "skipped": false, "count": 31 },
    { "name": "Himalayas", "success": true, "skipped": false, "count": 18 },
    { "name": "Jobicy", "success": true, "skipped": false, "count": 9 }
  ],
  "errors": ["optional provider error strings"]
}
```

The flat fields (`count`, `page`, `pageSize`, `hasMore`, `totalCount`, `matchedCount`,
`totalPages`) are kept for existing callers. New callers should use `pagination`.

`sources[].count` is the number of that provider's listings in the user's feed
(after cross-board dedup, the tech-only filter, and the India/remote
eligibility filters). `success` reflects the provider's most recent ingestion
run (see `knowledge/ingestion.md`). `skipped` is always `false` now — every
provider is fetched on every ingest run; the field remains for response-shape
compatibility. `errors` carries the failed runs' messages from the latest
ingest (`"Provider: reason"`).

### Errors

| Status | Body | Cause |
|---|---|---|
| `401` | `{ "error": "Unauthorized" }` | No Clerk session. |
| `500` | `{ "error": "Unable to load jobs" }` | Feed build failed. |

Responses send `Cache-Control: private, no-store`; caching is handled in Redis
server-side, not by HTTP caches.

## `GET /api/jobs/[id]`

`id` is the URL-safe base64 token produced by `encodeJobId`, not the raw job id.

| Status | Body | Cause |
|---|---|---|
| `200` | `{ "job": { ...full job, match } }` | Job is an active row in the database. |
| `400` | `{ "error": "Invalid job id" }` | Token could not be decoded. |
| `401` | `{ "error": "Unauthorized" }` | No Clerk session. |
| `404` | `{ "error": "Job not found" }` | No active database row has that public id. |
| `500` | `{ "error": "Unable to load job" }` | Detail lookup failed. |

The detail response contains the untruncated `description` and `requirements`,
and a `match` scored on the fly against the caller's profile. Any active job in
the database is openable by id — including jobs found through search or a
saved list that fall outside the user's default feed. Jobs that vanished from
every provider feed are deactivated by the ingestion script and return `404`.

Job ids are stable strings like `remotive-123` (`public_id` in the schema).
Saved jobs and shared links store them, so they must never change once written.

## Feed design

The `jobs` table in Postgres is the source of truth. A GitHub Actions workflow
(`ingest-jobs`) fetches all four providers daily, filters to tech
roles, dedupes across boards, and upserts the results — see
`knowledge/ingestion.md`. Request-time fetching is gone: a page request runs
one indexed database query and scores the result set in memory.

1. **Feed build** (`buildFeed` in `lib/jobs-service.ts`) — reads active rows,
   keeps India-eligible remote jobs (the same semantics the request-time pool
   had), scores each job against the user's profile with `scoreJob` (using the
   stored `match_text`, so skill matching sees full posting text while the feed
   only carries 360/300-char previews), and sorts by match score, then posting
   date, then id.
2. **Per-user feed cache** (`jobs:v4:user:{userId}:feed:*`, 15 min TTL in
   Upstash Redis) — keeps paging stable and repeat requests fast. Search and
   filters are applied per request over the cached feed, so they see the whole
   corpus without extra database reads. `/api/onboarding` deletes the key on
   profile updates.

Scoring depends on the profile, so `/api/onboarding` invalidates the user's feed
key on profile changes.

### Known trade-offs

- Search covers the feed's truncated description, not the full posting text.
- Providers cap how far back the corpus reaches (Himalayas/Jobicy at 200
  listings per run; Remotive's free API currently returns only 12 listings
  per request regardless of filters). Remotive/Remote OK are single-request
  and cheap; caps are constants in `scripts/ingest-jobs.ts`.
- The feed reflects the last successful ingest (at most a day old) plus up to
  the 15-minute feed cache. Brand-new postings surface on the next ingest.
- Cross-board duplicates are merged by normalized `title|company|location`,
  so the same listing appearing on two boards shows once (with both boards
  recorded in `seen_on`). Listings that differ meaningfully stay separate.
