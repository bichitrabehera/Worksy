import redis from "./redis";
import { isIndiaEligible } from "./fetchers";
import { scoreJob } from "./matching";
import type { JobPreferences } from "./matching";
import { prisma } from "./prisma";

import type { Job, JobQuery, JobSource } from "./types";

// The jobs table (written by the scheduled ingestion script) is the source of
// truth. The only cache left is a short-lived per-user copy of the ranked feed
// so paging stays stable and repeat requests stay fast. Feed entries carry the
// preview-sized descriptions the ingestion script wrote (360/300 chars, see
// scripts/ingest-jobs.ts), so a page request only moves the data it renders.
const FEED_TTL_SECONDS = 15 * 60;

// Bump whenever the cached payload shape changes. v4: DB-backed feed.
const CACHE_VERSION = "v4";

// The providers the ingestion script fetches, in the same order. Used for the
// `sources` array so its shape stays stable even before the first ingest run.
// Keep in sync with PROVIDERS in scripts/ingest-jobs.ts.
const CANONICAL_PROVIDERS = ["Remotive", "Remote OK", "Himalayas", "Jobicy"];

// The query used by the app today. Exported so the detail route and cache
// invalidation always agree with the feed route.
export const DEFAULT_JOB_QUERY: JobQuery = {
  q: "",
  where: "India",
  remoteOnly: true,
  limit: 200,
};

export type ProviderInfo = {
  name: string;
  success: boolean;
  /** True when the provider was never asked because the pool was already full. */
  skipped: boolean;
  count: number;
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

export function getFeedCacheKey(
  userId: string,
  query: JobQuery = DEFAULT_JOB_QUERY,
) {
  return `jobs:${CACHE_VERSION}:user:${userId}:feed:${encodeURIComponent(
    query.where,
  )}:${encodeURIComponent(query.remoteOnly ? "remote" : "all")}:${encodeURIComponent(
    query.q || "all",
  )}`;
}

// --------------------------------------------------
// Cache helpers
// --------------------------------------------------

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key);

    if (!cached) return null;

    // Upstash returns parsed JSON when it can, but older values may still
    // be strings depending on how they were written.
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

// Collapse concurrent builds of the same cache entry into one database read.
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
// Feed build (database read + scoring)
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

// Latest run per provider. The ingestion script writes one row per provider
// per run, so this doubles as source health.
async function getProviderHealth(
  feedSources: string[],
): Promise<{ sources: ProviderInfo[]; errors: string[] }> {
  const latestRuns = await prisma.providerRun.findMany({
    orderBy: { runAt: "desc" },
    distinct: ["provider"],
  });

  const runsByProvider = new Map(latestRuns.map((run) => [run.provider, run]));

  const sources = CANONICAL_PROVIDERS.map((name) => ({
    name,
    success: runsByProvider.get(name)?.success ?? false,
    // Every provider is now always fetched by the ingestion script.
    skipped: false,
    count: feedSources.filter((source) => source === name).length,
  }));

  const errors: string[] = [];

  for (const run of latestRuns) {
    if (!run.success) {
      errors.push(`${run.provider}: ${run.error ?? "last run failed"}`);
    } else if (run.keptCount === 0) {
      errors.push(`${run.provider}: returned no jobs`);
    }
  }

  return { sources, errors };
}

async function buildFeed(
  query: JobQuery,
  profile: JobPreferences | null,
): Promise<CachedFeed> {
  const rows = await prisma.job.findMany({
    where: { isActive: true },
    select: {
      publicId: true,
      title: true,
      company: true,
      companyUrl: true,
      location: true,
      descriptionPreview: true,
      requirementsPreview: true,
      matchText: true,
      jobType: true,
      workMode: true,
      experienceRequired: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryPeriod: true,
      applyUrl: true,
      source: true,
      postedDate: true,
    },
  });

  // Same query semantics the request-time pool used: India-eligible remote
  // jobs. Location/work-mode filtering still happens here (rather than at
  // ingest) so the database keeps the full tech corpus for future filters.
  const eligible = rows.filter((row) => {
    const location = Array.isArray(row.location)
      ? (row.location as string[]).join(" ")
      : "";

    return (
      (query.where !== "India" || isIndiaEligible(location)) &&
      (!query.remoteOnly || row.workMode === "Remote")
    );
  });

  const jobs = eligible.map((row): FeedJob => {
    const job: Job = {
      id: row.publicId,
      title: row.title,
      company: row.company,
      companyUrl: row.companyUrl ?? undefined,
      location: Array.isArray(row.location) ? (row.location as string[]) : [],
      description: row.descriptionPreview,
      requirements: row.requirementsPreview ?? undefined,
      jobType: row.jobType ?? undefined,
      workMode: (row.workMode as Job["workMode"]) ?? "Unknown",
      salaryMin: row.salaryMin ?? undefined,
      salaryMax: row.salaryMax ?? undefined,
      salaryCurrency: row.salaryCurrency ?? undefined,
      salaryPeriod: row.salaryPeriod ?? undefined,
      url: row.applyUrl,
      source: row.source as JobSource,
      postedAt: row.postedDate?.toISOString() ?? "",
      experienceRequired: row.experienceRequired ?? undefined,
    };

    // Score against the stored match text (title + requirements + full
    // description) so skill matches behave like they did when feeds were
    // scored over full postings, while the feed only carries previews.
    return {
      ...job,
      match: scoreJob(
        { ...job, description: row.matchText, requirements: undefined },
        profile,
      ),
    };
  });

  jobs.sort(compareFeedJobs);

  const { sources, errors } = await getProviderHealth(
    eligible.map((row) => row.source),
  );

  return { jobs, sources, errors };
}

// Return the compact, ranked feed for one user. Feed entries are
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

    const profile = await getProfilePreferences(userId);
    const feed = await buildFeed(query, profile);

    if (feed.jobs.length > 0) {
      await writeCache(cacheKey, feed, FEED_TTL_SECONDS);
    }

    return feed;
  });
}

// Apply search/filters and return a single page. This is pure in-memory work
// over the compact feed; the full job corpus never leaves the database here.
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

// Look up one job for the detail route by its public id (e.g. "remotive-123"
// — the same string encodeJobId/decodeJobId wrap and saved jobs store). Any
// active job in the database is openable, so jobs found through search or a
// saved list resolve even when they fall outside the user's default feed.
export async function getUserJob(
  userId: string,
  jobId: string,
): Promise<FeedJob | null> {
  const row = await prisma.job.findUnique({
    where: { publicId: jobId },
  });

  if (!row || !row.isActive) return null;

  const profile = await getProfilePreferences(userId);

  const job: Job = {
    id: row.publicId,
    title: row.title,
    company: row.company,
    companyUrl: row.companyUrl ?? undefined,
    location: Array.isArray(row.location) ? (row.location as string[]) : [],
    description: row.description,
    requirements: row.requirements ?? undefined,
    jobType: row.jobType ?? undefined,
    workMode: (row.workMode as Job["workMode"]) ?? "Unknown",
    salaryMin: row.salaryMin ?? undefined,
    salaryMax: row.salaryMax ?? undefined,
    salaryCurrency: row.salaryCurrency ?? undefined,
    salaryPeriod: row.salaryPeriod ?? undefined,
    url: row.applyUrl,
    source: row.source as JobSource,
    postedAt: row.postedDate?.toISOString() ?? "",
    experienceRequired: row.experienceRequired ?? undefined,
  };

  return {
    ...job,
    match: scoreJob(
      { ...job, description: row.matchText, requirements: undefined },
      profile,
    ),
  };
}
