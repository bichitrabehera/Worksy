// scripts/ingest-jobs.ts
//
// Scheduled job ingestion: fetch every provider, keep tech roles only, dedupe
// across boards, and upsert into the `jobs` table in Neon. The API routes
// read only from the database — this script is its single writer.
//
// Run locally:       npx tsx scripts/ingest-jobs.ts
// Run on a schedule: .github/workflows/ingest-jobs.yml (every 6 hours)
//
// Idempotent: re-running against the same provider data changes nothing.
// Remotive's API terms advise at most 4 requests per day; a 6-hour schedule
// with one request per provider is exactly that. Remotive listings must link
// back to their board (we store their `url` as apply_url) and be credited
// (the `source` field names the board).

import "dotenv/config";
import { Prisma } from "../prisma/generated/client";
import { prisma } from "../lib/prisma";
import {
  fetchHimalayas,
  fetchJobicy,
  fetchRemoteOK,
  fetchRemotive,
} from "../lib/fetchers";
import { isTechJob } from "../lib/tech-classifier";
import { truncateDescription } from "../lib/job-display";

import type { Job, JobQuery } from "../lib/types";

// Single-request providers (Remotive, Remote OK) return their whole board in
// one call, so a higher cap costs nothing. Paginating providers (Himalayas,
// Jobicy) cost one request per page, so they stay bounded.
const SINGLE_REQUEST_LIMIT = 500;
const PAGINATED_LIMIT = 200;

// Preview lengths must match the read path in lib/jobs-service.ts — the feed
// serves exactly these stored previews.
const DESCRIPTION_PREVIEW_LENGTH = 360;
const REQUIREMENTS_PREVIEW_LENGTH = 300;

// Match scoring text: title + requirements + description. The feed query
// scores every row without downloading full postings.
const MATCH_TEXT_LENGTH = 20_000;

// Jobs missing from every feed for this long are deleted. Keeps the table far
// below Neon's 1 GB free-tier storage.
const PRUNE_AFTER_DAYS = 45;

// Upserts run in small parallel batches: one round-trip latency per batch
// instead of per job, without stressing the free-tier connection limits.
const UPSERT_BATCH_SIZE = 20;

// How many dropped titles to log per provider, for classifier tuning.
const DROPPED_SAMPLE_SIZE = 8;

const baseQuery = (limit: number): JobQuery => ({
  q: "",
  where: "",
  remoteOnly: false,
  limit,
});

// --------------------------------------------------
// Normalization helpers
// --------------------------------------------------

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Location canonicalization for dedup keys. Pure remote markers collapse to
// "remote" (boards describe the same worldwide listing differently), while
// geo-specific text survives so a US-only posting never merges with an Indian
// one from the same company.
const canonicalLocation = (location: string) => {
  const stripped = normalizeText(location)
    .replace(/\bremote\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped || /^(worldwide|anywhere|global|earth|work from anywhere)$/.test(stripped)) {
    return "remote";
  }

  return stripped;
};

const dedupKeyFor = (job: Job) =>
  [
    normalizeText(job.title),
    normalizeText(job.company),
    canonicalLocation(job.location.join(" ")),
  ]
    .join("|")
    .slice(0, 512);

const normalizeApplyUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.toLowerCase().replace(/\/+$/, "");
  } catch {
    return normalizeText(url);
  }
};

// FNV-1a. Used to shorten ids that overflow the VarChar(255) columns
// (Himalayas uses full URLs as ids) while staying deterministic.
const hashHex = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const fitVarChar = (value: string, max = 255) =>
  value.length <= max ? value : `${value.slice(0, max - 9)}-${hashHex(value)}`;

// Stable compound of the normalized apply URL. Jobs whose ids are URL-shaped
// (Himalayas) keep a deterministic source_job_id after the prefix is
// stripped below.
export const sourceJobIdFor = (provider: string, id: string) => {
  const prefix = SOURCE_ID_PREFIXES[provider];
  const stripped = prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;
  return fitVarChar(stripped);
};

const SOURCE_ID_PREFIXES: Record<string, string> = {
  Remotive: "remotive-",
  "Remote OK": "remoteok-",
  Himalayas: "himalayas-",
  Jobicy: "jobicy-",
};

// --------------------------------------------------
// Provider collection
// --------------------------------------------------

export type ProviderOutcome = {
  provider: string;
  success: boolean;
  fetchedCount: number;
  keptCount: number;
  droppedTitles: string[];
  jobs: Job[];
  error?: string;
  durationMs: number;
};

// Fetch order matters: it decides which provider is a merged job's primary
// source (the one that owns the row's publicId and apply URL).
const PROVIDERS: { name: string; fetch: () => Promise<Job[]> }[] = [
  {
    name: "Remotive",
    fetch: () =>
      fetchRemotive(baseQuery(SINGLE_REQUEST_LIMIT), {
        category: "software-dev",
      }),
  },
  {
    name: "Remote OK",
    fetch: () => fetchRemoteOK(baseQuery(SINGLE_REQUEST_LIMIT)),
  },
  {
    name: "Himalayas",
    fetch: () => fetchHimalayas(baseQuery(PAGINATED_LIMIT)),
  },
  {
    name: "Jobicy",
    fetch: () =>
      fetchJobicy(baseQuery(PAGINATED_LIMIT), {
        industry: "engineering",
      }),
  },
];

export async function collectProviders(): Promise<ProviderOutcome[]> {
  const outcomes = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const startedAt = Date.now();

      try {
        const fetched = await provider.fetch();
        const jobs: Job[] = [];
        const droppedTitles: string[] = [];

        for (const job of fetched) {
          if (isTechJob(job)) {
            jobs.push(job);
          } else if (droppedTitles.length < DROPPED_SAMPLE_SIZE) {
            droppedTitles.push(job.title);
          }
        }

        return {
          provider: provider.name,
          success: true,
          fetchedCount: fetched.length,
          keptCount: jobs.length,
          droppedTitles,
          jobs,
          durationMs: Date.now() - startedAt,
        } satisfies ProviderOutcome;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown error";

        return {
          provider: provider.name,
          success: false,
          fetchedCount: 0,
          keptCount: 0,
          droppedTitles: [],
          jobs: [],
          error: reason,
          durationMs: Date.now() - startedAt,
        } satisfies ProviderOutcome;
      }
    }),
  );

  return outcomes;
}

// --------------------------------------------------
// Cross-source merge
// --------------------------------------------------

export type MergedJob = {
  /** Primary provider's copy (first in fetch order) with gaps filled. */
  job: Job;
  /** Every board currently listing this job, in fetch order. */
  providers: string[];
  dedupKey: string;
};

// Fields later providers can fill when the primary copy is missing them.
const FILLABLE_FIELDS = [
  "companyUrl",
  "requirements",
  "jobType",
  "workMode",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryPeriod",
  "experienceRequired",
] as const;

export function mergeProviderJobs(outcomes: ProviderOutcome[]): MergedJob[] {
  const merged = new Map<string, MergedJob>();

  for (const outcome of outcomes) {
    if (!outcome.success) continue;

    for (const job of outcome.jobs) {
      const dedupKey = dedupKeyFor(job);
      const existing = merged.get(dedupKey);

      if (existing) {
        existing.providers.push(outcome.provider);

        for (const field of FILLABLE_FIELDS) {
          if (existing.job[field] == null && job[field] != null) {
            existing.job[field] = job[field] as never;
          }
        }

        // Prefer a real description over a teaser the primary board returned.
        if (
          existing.job.description.length < 200 &&
          job.description.length > existing.job.description.length
        ) {
          existing.job.description = job.description;
        }

        continue;
      }

      merged.set(dedupKey, {
        job,
        providers: [outcome.provider],
        dedupKey,
      });
    }
  }

  return [...merged.values()];
}

// --------------------------------------------------
// Upserts
// --------------------------------------------------

function buildRowData(job: Job, providers: string[], now: Date) {
  const postedDate = new Date(job.postedAt);

  return {
    title: job.title,
    company: job.company,
    companyNormalized: normalizeText(job.company).slice(0, 255),
    companyUrl: job.companyUrl ?? null,
    location: job.location as unknown as Prisma.InputJsonValue,
    locationNormalized: canonicalLocation(job.location.join(" ")),
    description: job.description,
    descriptionPreview: truncateDescription(
      job.description,
      DESCRIPTION_PREVIEW_LENGTH,
    ),
    requirements: job.requirements ?? null,
    requirementsPreview: job.requirements
      ? truncateDescription(job.requirements, REQUIREMENTS_PREVIEW_LENGTH)
      : null,
    matchText: `${job.title}\n${job.requirements ?? ""}\n${job.description}`.slice(
      0,
      MATCH_TEXT_LENGTH,
    ),
    jobType: job.jobType?.slice(0, 50) ?? null,
    workMode: job.workMode,
    experienceRequired: job.experienceRequired?.slice(0, 100) ?? null,
    salaryRange: null,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency?.slice(0, 50) ?? null,
    salaryPeriod: job.salaryPeriod?.slice(0, 50) ?? null,
    applyUrl: job.url,
    applyUrlNormalized: normalizeApplyUrl(job.url),
    postedDate: Number.isNaN(postedDate.getTime()) ? null : postedDate,
    lastSeenAt: now,
    isActive: true,
    seenOn: providers,
  };
}

export type UpsertStats = {
  inserted: number;
  updated: number;
  failed: number;
  /** Per-provider attribution of inserts/updates, by the job's primary source. */
  byProvider: Map<string, { inserted: number; updated: number }>;
};

export async function upsertJobs(
  mergedJobs: MergedJob[],
): Promise<UpsertStats> {
  const now = new Date();
  const stats: UpsertStats = {
    inserted: 0,
    updated: 0,
    failed: 0,
    byProvider: new Map(),
  };

  const bump = (provider: string, field: "inserted" | "updated") => {
    const entry = stats.byProvider.get(provider) ?? { inserted: 0, updated: 0 };
    entry[field]++;
    stats.byProvider.set(provider, entry);
  };

  const existingRows = await prisma.job.findMany({
    where: { dedupKey: { in: mergedJobs.map((job) => job.dedupKey) } },
    select: { dedupKey: true },
  });
  const existingKeys = new Set(existingRows.map((row) => row.dedupKey));

  for (let offset = 0; offset < mergedJobs.length; offset += UPSERT_BATCH_SIZE) {
    const batch = mergedJobs.slice(offset, offset + UPSERT_BATCH_SIZE);

    await Promise.all(
      batch.map(async (merged) => {
        const base = buildRowData(merged.job, merged.providers, now);

        try {
          if (existingKeys.has(merged.dedupKey)) {
            // Update content and freshness; publicId, source and sourceJobId
            // stay untouched so saved jobs and detail links never break.
            await prisma.job.update({
              where: { dedupKey: merged.dedupKey },
              data: base,
            });
            stats.updated++;
            bump(merged.job.source, "updated");
          } else {
            try {
              await prisma.job.create({
                data: {
                  ...base,
                  dedupKey: merged.dedupKey,
                  source: merged.job.source,
                  sourceJobId: sourceJobIdFor(
                    merged.job.source,
                    merged.job.id,
                  ),
                  publicId: fitVarChar(merged.job.id),
                },
              });
              stats.inserted++;
              bump(merged.job.source, "inserted");
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
              ) {
                // A provider re-listed a posting under a new title: the
                // (source, sourceJobId) row exists with an old dedup key.
                // Refresh that row instead of creating a duplicate.
                await prisma.job.update({
                  where: {
                    source_sourceJobId: {
                      source: merged.job.source,
                      sourceJobId: sourceJobIdFor(
                        merged.job.source,
                        merged.job.id,
                      ),
                    },
                  },
                  data: { ...base, dedupKey: merged.dedupKey },
                });
                stats.updated++;
                bump(merged.job.source, "updated");
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          stats.failed++;
          const reason =
            error instanceof Error ? error.message : "Unknown error";
          console.error(
            `  ! upsert failed for ${merged.job.id} (${merged.job.source}): ${reason}`,
          );
        }
      }),
    );
  }

  return stats;
}

// --------------------------------------------------
// Main
// --------------------------------------------------

async function main() {
  // Captured before any fetch: rows whose lastSeenAt is older than this were
  // absent from every provider's feed this run.
  const runStart = new Date();

  console.log("Ingesting jobs from all providers…\n");

  const outcomes = await collectProviders();

  for (const outcome of outcomes) {
    if (outcome.success) {
      console.log(
        `${outcome.provider.padEnd(11)} ${outcome.fetchedCount} fetched, ${outcome.keptCount} tech-kept (${outcome.durationMs} ms)`,
      );
      if (outcome.droppedTitles.length) {
        console.log(
          `  dropped sample: ${outcome.droppedTitles.join(" | ")}`,
        );
      }
    } else {
      console.log(
        `${outcome.provider.padEnd(11)} FAILED (${outcome.durationMs} ms): ${outcome.error}`,
      );
    }
  }

  const mergedJobs = mergeProviderJobs(outcomes);
  console.log(`\n${mergedJobs.length} unique jobs after cross-board dedup.`);

  const stats = await upsertJobs(mergedJobs);
  console.log(
    `Upserted: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.failed} failed.`,
  );
  let deactivated = 0;

  // Only deactivate when every provider answered: a failed provider would
  // otherwise mark its jobs dead even though the board was merely unreachable.
  if (outcomes.every((outcome) => outcome.success)) {
    deactivated = await prisma.job
      .updateMany({
        where: { isActive: true, lastSeenAt: { lt: runStart } },
        data: { isActive: false },
      })
      .then((result) => result.count);

    console.log(`Deactivated ${deactivated} vanished jobs.`);
  } else {
    console.log("Skipping deactivation: at least one provider failed.");
  }

  const pruneBefore = new Date(
    Date.now() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );
  const pruned = await prisma.job
    .deleteMany({
      where: { isActive: false, lastSeenAt: { lt: pruneBefore } },
    })
    .then((result) => result.count);

  console.log(`Pruned ${pruned} jobs inactive for over ${PRUNE_AFTER_DAYS} days.`);

  await prisma.providerRun.createMany({
    data: outcomes.map((outcome) => ({
      provider: outcome.provider,
      success: outcome.success,
      fetchedCount: outcome.fetchedCount,
      keptCount: outcome.keptCount,
      insertedCount: stats.byProvider.get(outcome.provider)?.inserted ?? 0,
      updatedCount: stats.byProvider.get(outcome.provider)?.updated ?? 0,
      error: outcome.error ?? null,
      durationMs: outcome.durationMs,
    })),
  });

  const activeTotal = await prisma.job.count({ where: { isActive: true } });
  console.log(`\nActive jobs in database: ${activeTotal}`);

  await prisma.$disconnect();

  if (outcomes.some((outcome) => !outcome.success)) {
    console.error("\nSome providers failed — see ProviderRun rows for details.");
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
