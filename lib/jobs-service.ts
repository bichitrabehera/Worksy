import redis from "./redis";
import {
  fetchHimalayas,
  fetchJobicy,
  fetchRemoteOK,
  fetchRemotive,
} from "./fetchers";
import { dedupeJobs } from "./filters";
import { truncateDescription } from "./job-display";
import { scoreJob } from "./matching";
import type { JobPreferences } from "./matching";
import { prisma } from "./prisma";

import type { Job, JobQuery } from "./types";

// Bump the version whenever the cached payload shape changes. Old keys expire on
// their own, so a bump never requires a manual flush.
const CACHE_VERSION = "v3";

// The provider pool is shared by every user, so its TTL only controls how often
// the upstream APIs are hit.
const POOL_TTL_SECONDS = 30 * 60;

// A user's ranked feed is much smaller than the pool and is rebuilt whenever it
// expires or the profile changes.
const FEED_TTL_SECONDS = 45 * 60;

// Upper bound on how many listings one provider may contribute to the pool.
// Without this, cold requests walk the entire Himalayas/Jobicy pagination chains.
const MAX_JOBS_PER_PROVIDER =
  Number(process.env.JOB_FETCH_MAX_PER_PROVIDER) || 200;

// Feed entries carry previews instead of full descriptions so a page request
// never downloads the whole job corpus from Redis.
const DESCRIPTION_PREVIEW_LENGTH = 360;
const REQUIREMENTS_PREVIEW_LENGTH = 300;

// The query used by the app today. Exported so the detail route and cache
// invalidation always agree with the feed route.
export const DEFAULT_JOB_QUERY: JobQuery = {
  q: "",
  where: "India",
  remoteOnly: true,
  limit: MAX_JOBS_PER_PROVIDER,
};

export type ProviderInfo = {
  name: string;
  success: boolean;
  count: number;
};

type CachedPool = {
  jobs: Job[];
  sources: ProviderInfo[];
  errors: string[];
  fetchedAt: number;
};

type FeedJob = Job & {
  match?: Job["match"];
};

type CachedFeed = {
  jobs: FeedJob[];
  sources: ProviderInfo[];
  errors: string[];
};

export type JobsPage = {
  jobs: FeedJob[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  sources: ProviderInfo[];
  errors: string[];
};

export type JobsPageOptions = {
  page: number;
  pageSize: number;
  searchQuery?: string;
  jobType?: string;
  workMode?: string;
};

// --------------------------------------------------
// Cache keys
// --------------------------------------------------

export function getPoolCacheKey(query: JobQuery = DEFAULT_JOB_QUERY) {
  return `jobs:${CACHE_VERSION}:pool:${encodeURIComponent(
    query.where,
  )}:${encodeURIComponent(query.q || "all")}`;
}

export function getFeedCacheKey(
  userId: string,
  query: JobQuery = DEFAULT_JOB_QUERY,
) {
  return `jobs:${CACHE_VERSION}:user:${userId}:feed:${encodeURIComponent(
    query.where,
  )}:${encodeURIComponent(query.q || "all")}`;
}

// --------------------------------------------------
// Cache helpers
// --------------------------------------------------

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key);

    if (!cached) return null;

    // Upstash returns parsed JSON when it can, but older values may still be
    // strings depending on how they were written.
    if (typeof cached === "string") {
      return JSON.parse(cached) as T;
    }

    return cached;
  } catch (error) {
    console.error("Redis GET error:", error);
    return null;
  }
}

async function writeCache(key: string, data: unknown, ttlSeconds: number) {
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis SET error:", error);
  }
}

// Collapse concurrent builds of the same cache entry into one provider fetch.
// Two requests for page 1 and page 2 used to trigger two full rebuilds.
const inFlight = new Map<string, Promise<unknown>>();

function withInFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);

  if (existing) return existing as Promise<T>;

  const promise = work().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);

  return promise;
}

// --------------------------------------------------
// Shared provider pool
// --------------------------------------------------

async function fetchJobPool(query: JobQuery): Promise<CachedPool> {
  const providers = [
    { name: "Remotive", fetch: () => fetchRemotive(query) },
    { name: "Himalayas", fetch: () => fetchHimalayas(query) },
    { name: "Remote OK", fetch: () => fetchRemoteOK(query) },
    { name: "Jobicy", fetch: () => fetchJobicy(query) },
  ];

  const results = await Promise.allSettled(
    providers.map((provider) => provider.fetch()),
  );

  const errors: string[] = [];

  const jobs = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      if (result.value.length === 0) {
        errors.push(`${providers[index].name}: returned no jobs`);
      }

      return result.value;
    }

    const reason =
      result.reason instanceof Error ? result.reason.message : "Unknown error";

    errors.push(`${providers[index].name}: ${reason}`);

    return [];
  });

  return {
    jobs: dedupeJobs(jobs),
    sources: providers.map((provider, index) => ({
      name: provider.name,
      success: results[index].status === "fulfilled",
      count:
        results[index].status === "fulfilled" ? results[index].value.length : 0,
    })),
    errors,
    fetchedAt: Date.now(),
  };
}

// Return the shared, unpersonalized job pool. This is the expensive step, so it
// is cached once for all users instead of once per user.
export async function getJobPool(
  query: JobQuery = DEFAULT_JOB_QUERY,
): Promise<CachedPool> {
  const cacheKey = getPoolCacheKey(query);
  const cached = await readCache<CachedPool>(cacheKey);

  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    console.log(`Job pool cache MISS: ${query.where}`);

    const pool = await fetchJobPool(query);

    if (pool.jobs.length > 0) {
      await writeCache(cacheKey, pool, POOL_TTL_SECONDS);
    }

    return pool;
  });
}

// --------------------------------------------------
// Personalized ranked feed
// --------------------------------------------------

async function getProfilePreferences(
  userId: string,
): Promise<JobPreferences | null> {
  const profileRecord = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      profile: true,
    },
  });

  return (profileRecord?.profile ?? null) as JobPreferences | null;
}

function compareFeedJobs(a: FeedJob, b: FeedJob) {
  // Highest match first.
  const scoreDifference = (b.match?.score ?? 0) - (a.match?.score ?? 0);

  if (scoreDifference !== 0) return scoreDifference;

  // Newest posting first when scores are equal.
  const dateA = new Date(a.postedAt).getTime() || 0;
  const dateB = new Date(b.postedAt).getTime() || 0;

  if (dateA !== dateB) return dateB - dateA;

  // Stable tiebreak so pagination cannot skip or duplicate jobs between pages.
  return a.id.localeCompare(b.id);
}

function buildFeed(
  pool: CachedPool,
  profile: JobPreferences | null,
): CachedFeed {
  const jobs = pool.jobs
    .map((job): FeedJob => ({
      ...job,
      description: truncateDescription(
        job.description,
        DESCRIPTION_PREVIEW_LENGTH,
      ),
      requirements: job.requirements
        ? truncateDescription(job.requirements, REQUIREMENTS_PREVIEW_LENGTH)
        : job.requirements,
      match: scoreJob(job, profile),
    }))
    .sort(compareFeedJobs);

  return {
    jobs,
    sources: pool.sources,
    errors: pool.errors,
  };
}

// Return the compact, ranked feed for one user. Feed entries are already
// preview-sized, so a page request only moves the data it renders.
export async function getUserFeed(
  userId: string,
  query: JobQuery = DEFAULT_JOB_QUERY,
): Promise<CachedFeed> {
  const cacheKey = getFeedCacheKey(userId, query);
  const cached = await readCache<CachedFeed>(cacheKey);

  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    console.log(`User feed cache MISS: ${userId}`);

    const [pool, profile] = await Promise.all([
      getJobPool(query),
      getProfilePreferences(userId),
    ]);

    const feed = buildFeed(pool, profile);

    if (feed.jobs.length > 0) {
      await writeCache(cacheKey, feed, FEED_TTL_SECONDS);
    }

    return feed;
  });
}

// Apply search/filters and return a single page. This is pure in-memory work
// over the compact feed; the full job corpus never leaves Redis here.
export function paginateFeed(
  feed: CachedFeed,
  options: JobsPageOptions,
): JobsPage {
  const searchQuery = options.searchQuery?.trim().toLowerCase() ?? "";
  const jobType = options.jobType?.trim().toLowerCase() ?? "";
  const workMode = options.workMode?.trim().toLowerCase() ?? "";
  const pageSize = Math.max(1, options.pageSize);
  const page = Math.max(1, options.page);

  const matchedJobs = feed.jobs.filter((job) => {
    const searchableText = [job.title, job.company, job.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!searchQuery || searchableText.includes(searchQuery)) &&
      (!jobType || job.jobType?.trim().toLowerCase() === jobType) &&
      (!workMode || job.workMode?.trim().toLowerCase() === workMode)
    );
  });

  const totalCount = matchedJobs.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;

  return {
    jobs: matchedJobs.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore: start + pageSize < totalCount,
    hasPrevious: page > 1 && start < totalCount,
    sources: feed.sources,
    errors: feed.errors,
  };
}

export async function getUserJobsPage(
  userId: string,
  query: JobQuery = DEFAULT_JOB_QUERY,
  options: JobsPageOptions,
): Promise<JobsPage> {
  const feed = await getUserFeed(userId, query);

  return paginateFeed(feed, options);
}

// Look up one job for the detail route. The ranked feed proves the job belongs
// to this user's matches; the pool supplies the untruncated description.
export async function getUserJob(
  userId: string,
  jobId: string,
  query: JobQuery = DEFAULT_JOB_QUERY,
): Promise<FeedJob | null> {
  const feed = await getUserFeed(userId, query);
  const rankedJob = feed.jobs.find((job) => job.id === jobId);

  if (!rankedJob) return null;

  const pool = await getJobPool(query);
  const fullJob = pool.jobs.find((job) => job.id === jobId);

  if (!fullJob) return rankedJob;

  return { ...fullJob, match: rankedJob.match };
}
