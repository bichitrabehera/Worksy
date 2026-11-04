import redis from "./redis";
import {
  fetchHimalayas,
  fetchJobicy,
  fetchRemoteOK,
  fetchRemotive,
} from "./fetchers";
import { dedupeJobs } from "./filters";
import { scoreJob } from "./matching";
import type { JobPreferences } from "./matching";
import { prisma } from "./prisma";

import type { Job, JobQuery } from "./types";

// Each user's personalized jobs are cached for 45 minutes.
const CACHE_TTL = 45 * 60;

export type ProviderInfo = {
  name: string;
  success: boolean;
  count: number;
};

export type CachedJobs = {
  jobs: Job[];
  sources: ProviderInfo[];
  errors: string[];
};

// Create a unique Redis key for each user and query. The version prefix lets us
// invalidate older cached payloads when the job shape changes.
export function getCacheKey(userId: string, query: JobQuery) {
  return `jobs:v2:user:${userId}:feed:${encodeURIComponent(
    query.where,
  )}:${encodeURIComponent(query.q || "all")}`;
}

// Read a user's personalized jobs from Redis.
export async function getCachedJobs(key: string): Promise<CachedJobs | null> {
  try {
    const cached = await redis.get(key);

    if (!cached) return null;

    if (typeof cached === "string") {
      return JSON.parse(cached) as CachedJobs;
    }

    return cached as CachedJobs;
  } catch (error) {
    console.error("Redis GET error:", error);
    return null;
  }
}

// Store personalized jobs under the user's unique key.
export async function cacheJobs(key: string, data: CachedJobs) {
  try {
    await redis.set(key, JSON.stringify(data), {
      ex: CACHE_TTL,
    });
  } catch (error) {
    console.error("Redis SET error:", error);
  }
}

// Fetch and personalize jobs for one user.
export async function fetchUserJobs(
  userId: string,
  query: JobQuery,
  profile: JobPreferences | null,
): Promise<CachedJobs> {
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

  // Remove duplicate listings.
  const uniqueJobs = dedupeJobs(jobs);

  // Calculate personalized match scores. Low-scoring jobs are retained.
  const rankedJobs = uniqueJobs.map((job) => ({
    ...job,
    match: scoreJob(job, profile),
  }));

  // Highest match first, newest job first when scores are equal.
  rankedJobs.sort((a, b) => {
    const scoreDifference = (b.match?.score ?? 0) - (a.match?.score ?? 0);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const dateA = new Date(a.postedAt).getTime() || 0;
    const dateB = new Date(b.postedAt).getTime() || 0;

    return dateB - dateA;
  });

  const response: CachedJobs = {
    jobs: rankedJobs,
    sources: providers.map((provider, index) => ({
      name: provider.name,
      success: results[index].status === "fulfilled",
      count:
        results[index].status === "fulfilled" ? results[index].value.length : 0,
    })),
    errors,
  };

  // Cache only non-empty results.
  if (rankedJobs.length > 0) {
    const cacheKey = getCacheKey(userId, query);

    await cacheJobs(cacheKey, response);
  }

  return response;
}

// Return the user's cached feed, falling back to a fresh fetch on a cache miss.
export async function getUserJobs(
  userId: string,
  query: JobQuery,
): Promise<CachedJobs> {
  const cacheKey = getCacheKey(userId, query);
  const cached = await getCachedJobs(cacheKey);

  if (cached) {
    console.log(`Redis cache HIT: ${userId}`);
    return cached;
  }

  console.log(`Redis cache MISS: ${userId}`);

  const profileRecord = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    select: {
      profile: true,
    },
  });

  return fetchUserJobs(
    userId,
    query,
    (profileRecord?.profile ?? null) as JobPreferences | null,
  );
}
