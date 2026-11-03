import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import redis from "@/lib/redis";
import {
  fetchRemotive,
  fetchHimalayas,
  fetchRemoteOK,
  fetchJobicy,
} from "@/lib/fetchers";

import { dedupeJobs } from "@/lib/filters";
import { scoreJob } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

import type { JobQuery } from "@/lib/types";

// Each user's personalized jobs are cached for 45 minutes.
const CACHE_TTL = 45 * 60;

type ProviderInfo = {
  name: string;
  success: boolean;
  count: number;
};

type CachedJobs = {
  jobs: any[];
  sources: ProviderInfo[];
  errors: string[];
};

// Create a unique Redis key for each user and query.
function getCacheKey(userId: string, query: JobQuery) {
  return `jobs:user:${userId}:feed:${encodeURIComponent(
    query.where,
  )}:${encodeURIComponent(query.q || "all")}`;
}

// Read a user's personalized jobs from Redis.
async function getCachedJobs(key: string): Promise<CachedJobs | null> {
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
async function cacheJobs(key: string, data: CachedJobs) {
  try {
    await redis.set(key, JSON.stringify(data), {
      ex: CACHE_TTL,
    });
  } catch (error) {
    console.error("Redis SET error:", error);
  }
}

// Fetch and personalize jobs for one user.
async function fetchUserJobs(
  userId: string,
  query: JobQuery,
  profile: any,
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

  // Calculate personalized match scores.
  // Low-scoring jobs are NOT removed.
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

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate using Clerk.
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read pagination parameters.
    const sp = req.nextUrl.searchParams;

    const requestedPage = Number(sp.get("page") ?? 1);

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(sp.get("limit")) || 50));

    // 3. Build job query.
    const searchQuery = sp.get("q")?.trim().toLowerCase() || "";
    const query: JobQuery = {
      q: "",
      where: sp.get("where") ?? "India",
      remoteOnly: true,
      limit: 50,
    };
    const jobType = sp.get("jobType")?.trim().toLowerCase() || "";
    const workMode = sp.get("workMode")?.trim().toLowerCase() || "";

    // 4. Build a Redis key unique to this user.
    const cacheKey = getCacheKey(userId, query);

    // 5. Check this user's Redis cache.
    let result = await getCachedJobs(cacheKey);

    if (result) {
      console.log(`Redis cache HIT: ${userId}`);
    } else {
      console.log(`Redis cache MISS: ${userId}`);

      // 6. Get this user's saved onboarding preferences.
      const profileRecord = await prisma.user.findUnique({
        where: {
          clerkId: userId,
        },
        select: {
          profile: true,
        },
      });

      const profile = profileRecord?.profile ?? null;

      // 7. Fetch, personalize, rank, and cache jobs.
      result = await fetchUserJobs(userId, query, profile);
    }

    // 8. Apply pagination after matching and ranking.
    const allJobs = result.jobs.filter((job) => {
      const searchableText = [
        job.title,
        job.company,
        job.description,
        job.requirements,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchQuery || searchableText.includes(searchQuery);
      const matchesJobType =
        !jobType || job.jobType?.trim().toLowerCase() === jobType;
      const matchesWorkMode =
        !workMode || job.workMode?.trim().toLowerCase() === workMode;

      return matchesSearch && matchesJobType && matchesWorkMode;
    });

    const start = (page - 1) * pageSize;

    const finalJobs = allJobs.slice(start, start + pageSize);

    // 9. Return personalized jobs.

    // 9. Calculate counts for the complete job collection.
    const totalCount = allJobs.length;

    // All jobs are retained; matching scores only determine ranking.
    const matchedCount = allJobs.length;

    const totalPages = Math.ceil(totalCount / pageSize);

    // 10. Return only the requested page.
    return NextResponse.json(
      {
        jobs: finalJobs,

        // Current page information
        count: finalJobs.length,
        page,
        pageSize,
        hasMore: start + pageSize < totalCount,

        // Complete collection information
        totalCount,
        matchedCount,
        totalPages,

        // Provider information
        sources: result.sources,
        errors: result.errors.length ? result.errors : undefined,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Jobs API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load jobs",
      },
      {
        status: 500,
      },
    );
  }
}
