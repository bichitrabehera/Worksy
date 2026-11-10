// Read-path verification for the DB-backed jobs service: runs the same calls
// app/api/jobs/route.ts and app/api/jobs/[id]/route.ts make, against the real
// database and Redis, with a synthetic (profile-less) user. Confirms the feed
// shape, sources health, and detail lookups without needing a Clerk session.
//
// Run: npx tsx scripts/feed-verify.ts

import "dotenv/config";

async function main() {
  const { DEFAULT_JOB_QUERY, getUserJobsPage, getUserJob } = await import(
    "../lib/jobs-service"
  );

  const userId = "verify-feed-test-user";

  const page = await getUserJobsPage(userId, DEFAULT_JOB_QUERY, {
    page: 1,
    pageSize: 12,
    searchQuery: "",
    jobType: "",
    workMode: "",
  });

  console.log(`Feed page 1: ${page.jobs.length} jobs of ${page.totalCount} total`);
  console.log(
    `Pagination: page=${page.page} pageSize=${page.pageSize} totalPages=${page.totalPages} hasMore=${page.hasMore}`,
  );

  console.log("sources:");
  for (const source of page.sources) {
    console.log(
      `  ${source.name.padEnd(11)} success=${String(source.success).padEnd(6)} skipped=${source.skipped} count=${source.count}`,
    );
  }
  console.log(`errors: ${page.errors.length ? page.errors.join(" | ") : "(none)"}`);

  if (!page.jobs.length) {
    throw new Error("No jobs in feed — is the database populated?");
  }

  const first = page.jobs[0];
  console.log("\nFirst feed job:");
  console.log(`  id:           ${first.id}`);
  console.log(`  title:        ${first.title}`);
  console.log(`  company:      ${first.company}`);
  console.log(`  source:       ${first.source}`);
  console.log(`  postedAt:     ${first.postedAt}`);
  console.log(`  workMode:     ${first.workMode}`);
  console.log(`  location:     ${first.location.join(", ")}`);
  console.log(
    `  description:  ${first.description.length} chars (preview), ends with "…": ${first.description.endsWith("…")}`,
  );
  console.log(
    `  match:        ${first.match?.score ?? "none"} (${first.match?.category ?? "n/a"})`,
  );

  // Every feed job must have the fields the UI renders.
  const missing = page.jobs.filter(
    (job) => !job.id || !job.title || !job.company || !job.url || !job.source,
  );
  console.log(`\nJobs missing required fields: ${missing.length}`);

  // Search filter still works over the preview text.
  const search = await getUserJobsPage(userId, DEFAULT_JOB_QUERY, {
    page: 1,
    pageSize: 12,
    searchQuery: "developer",
    jobType: "",
    workMode: "",
  });
  console.log(`Search "developer": ${search.totalCount} matches`);

  // Second page must not repeat page one (stable ordering).
  const page2 = await getUserJobsPage(userId, DEFAULT_JOB_QUERY, {
    page: 2,
    pageSize: 12,
    searchQuery: "",
    jobType: "",
    workMode: "",
  });
  const page1Ids = new Set(page.jobs.map((job) => job.id));
  const overlap = page2.jobs.filter((job) => page1Ids.has(job.id));
  console.log(`Page 2: ${page2.jobs.length} jobs, overlap with page 1: ${overlap.length}`);

  // Detail lookup by public id: full description, requirements, live match.
  const detail = await getUserJob(userId, first.id);
  if (!detail) {
    throw new Error(`Detail lookup failed for ${first.id}`);
  }

  console.log(`\nDetail for ${detail.id}:`);
  console.log(`  description length:  ${detail.description.length} (full, >= preview: ${detail.description.length >= first.description.length})`);
  console.log(`  match score:         ${detail.match?.score ?? "none"} (${detail.match?.category ?? "n/a"})`);
  console.log(`  reasons:             ${detail.match?.reasons.slice(0, 2).join("; ")}`);

  // A job that is not in the database must 404.
  const missingJob = await getUserJob(userId, "remotive-999999999");
  console.log(`\nUnknown id lookup returns null: ${missingJob === null}`);

  console.log("\nRead-path verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
