# Jobs API Contract

**Last updated:** 2026-11-05
**Routes:** `GET /api/jobs`, `GET /api/jobs/[id]`

Both routes require an authenticated Clerk session and return `401` without one.

## `GET /api/jobs`

Returns one page of the signed-in user's ranked job feed.

### Query parameters

| Name | Type | Default | Bounds | Notes |
|---|---|---|---|---|
| `page` | integer | `1` | `>= 1` | 1-based page number. |
| `limit` | integer | `20` | `1–50` | Page size. |
| `q` | string | empty | 120 chars | Case-insensitive match against job title, company, and the feed description preview. |
| `jobType` | string | empty | — | Exact match, case-insensitive (e.g. `Full-time`). |
| `workMode` | string | empty | — | Exact match, case-insensitive (`Remote`, `Hybrid`, `On-site`). |

Invalid or missing numeric values fall back to the defaults; they are not rejected.

### Response

```jsonc
{
  "jobs": [ /* page of jobs, description truncated to a feed preview */ ],
  "count": 20,
  "page": 2,
  "pageSize": 20,
  "hasMore": true,
  "totalCount": 140,
  "matchedCount": 140,
  "totalPages": 7,
  "pagination": {
    "page": 2,
    "limit": 20,
    "returned": 20,
    "total": 140,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "nextPage": 3,
    "previousPage": 1
  },
  "sources": [{ "name": "Remotive", "success": true, "count": 9 }],
  "errors": ["optional provider error strings"]
}
```

The flat fields (`count`, `page`, `pageSize`, `hasMore`, `totalCount`, `matchedCount`,
`totalPages`) are kept for existing callers. New callers should use `pagination`.

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
| `200` | `{ "job": { ...full job, match } }` | Job is in the user's ranked feed. |
| `400` | `{ "error": "Invalid job id" }` | Token could not be decoded. |
| `401` | `{ "error": "Unauthorized" }` | No Clerk session. |
| `404` | `{ "error": "Job not found" }` | Job is not in the current feed. |
| `500` | `{ "error": "Unable to load job" }` | Detail lookup failed. |

The detail response contains the untruncated `description` and `requirements`.

## Caching and pagination design

Two Redis layers keep page requests small and repeatable:

1. **Shared provider pool** (`jobs:v3:pool:*`, 30 min) — provider responses are
   fetched once for all users with a bounded request budget per provider
   (`JOB_FETCH_MAX_PER_PROVIDER`, default `200`), deduplicated, and cached.
2. **Per-user ranked feed** (`jobs:v3:user:{userId}:feed:*`, 45 min) — pool jobs
   are scored against the user's profile once, sorted by match score then posting
   date, and cached with 360-character description previews.

A page request reads only the compact feed (~150 KB for 140 jobs in the current
data set), filters/slices it in memory, and returns the requested page. The
untruncated job text lives in the shared pool and is read only by the detail
route. Concurrent builds of the same key are collapsed into one in-flight
promise.

Scoring depends on the profile, so `/api/onboarding` invalidates the user's feed
key on profile updates.

### Known trade-offs

- Search covers the feed's truncated description, not the full posting text.
- The per-provider cap can drop older listings when a provider returns more than
  the budget. Raise `JOB_FETCH_MAX_PER_PROVIDER` to widen the pool at the cost of
  slower cold builds.
- Page numbers are stable within one cache window. A rebuild can reorder jobs, so
  a client holding a page across a cache refresh may see a shifted page.
