// Hermetic verification for the ingestion pipeline (scripts/ingest-jobs.ts).
//
// Stubs the four provider HTTP responses — no network access, no database
// writes — and asserts the fetch → classify → merge stages behave as
// documented in knowledge/ingestion.md:
//   - non-tech titles (nursing, sales, …) are dropped
//   - tech roles are kept, including via provider tags
//   - the same job listed on two boards merges into one entry
//   - cross-provider gaps (salary, richer description) are filled
//   - ids stay in the stable "<provider>-<id>" format
//
// Run: npx tsx scripts/ingest-verify.ts

// The module imports lib/prisma at load time, which requires a parseable
// DATABASE_URL. No query runs in this test, so a dummy is safe — and dotenv
// (loaded inside the ingest module) never overrides an existing value.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const REMOTIVE_FIXTURE = {
  "job-count": 3,
  jobs: [
    {
      id: 9001,
      url: "https://remotive.com/remote-jobs/9001-senior-react-developer",
      title: "Senior React Developer",
      company_name: "Acme Corp",
      company_url: "https://acme.com",
      category: "Software Development",
      job_type: "full_time",
      publication_date: "2026-11-09T10:00:00",
      candidate_required_location: "Worldwide",
      salary: "",
      description: "<p>Build React apps.</p>",
      requirements: "<ul><li>3+ years React</li></ul>",
    },
    {
      id: 9002,
      url: "https://remotive.com/remote-jobs/9002-registered-nurse",
      title: "Registered Nurse",
      company_name: "City Hospital",
      company_url: "https://cityhospital.example",
      category: "Software Development",
      publication_date: "2026-11-08T10:00:00",
      candidate_required_location: "US only",
      description: "<p>Care for patients.</p>",
    },
    {
      id: 9003,
      url: "https://remotive.com/remote-jobs/9003-data-entry",
      title: "Data Entry Specialist",
      company_name: "Bureau Inc",
      publication_date: "2026-11-07T10:00:00",
      candidate_required_location: "Worldwide",
      description: "<p>Enter data.</p>",
    },
  ],
};

const REMOTE_OK_FIXTURE = [
  { "legal-notice": "Remote OK API terms" },
  {
    id: "701",
    position: "Backend Developer",
    company: "Globex",
    company_url: "https://globex.com",
    tags: ["node", "backend"],
    location: "Anywhere",
    description: "<p>Node backend work.</p>",
    apply_url: "https://remoteok.com/remote-jobs/701",
    url: "https://remoteok.com/remote-jobs/701",
    date: "2026-11-09T08:00:00",
  },
  {
    id: "702",
    position: "Sales Manager",
    company: "Initech",
    tags: ["sales"],
    location: "USA",
    description: "<p>Close deals.</p>",
    url: "https://remoteok.com/remote-jobs/702",
    date: "2026-11-09T07:00:00",
  },
  {
    id: "703",
    position: "Platform Reliability Specialist",
    company: "Umbrella",
    tags: ["kubernetes", "sre"],
    location: "Worldwide",
    description: "<p>Keep clusters healthy.</p>",
    url: "https://remoteok.com/remote-jobs/703",
    date: "2026-11-09T06:00:00",
  },
];

// Same Acme Corp React job as Remotive's 9001, described differently: the
// cross-board merge has to recognize them as one listing.
const JOBICY_DUP_DESCRIPTION = `<p>${"Own our React frontend. ".repeat(20)}</p>`;

const JOBICY_FIXTURE = {
  success: true,
  jobCount: 2,
  jobs: [
    {
      id: "acme-react-42",
      jobTitle: "Senior React Developer",
      companyName: "Acme Corp",
      companyWebsite: "https://acme.com/about",
      jobGeo: "Worldwide",
      jobDescription: JOBICY_DUP_DESCRIPTION,
      jobRequirements: "<p>React, TypeScript.</p>",
      jobType: "Full-time",
      salaryMin: 60000,
      salaryMax: 90000,
      salaryCurrency: "USD",
      salaryPeriod: "YEARLY",
      url: "https://jobicy.com/job/acme-react-42",
      pubDate: "2026-11-09T09:00:00",
      jobLevel: "Senior",
    },
    {
      id: "devops-77",
      jobTitle: "DevOps Engineer",
      companyName: "Initech",
      jobGeo: "Remote",
      jobDescription: "<p>Automate all things.</p>",
      jobType: "Full-time",
      url: "https://jobicy.com/job/devops-77",
      pubDate: "2026-11-08T09:00:00",
    },
  ],
  nextCursor: null,
};

const HIMALAYAS_FIXTURE = {
  jobs: [
    {
      guid: "https://himalayas.app/jobs/qa-123",
      title: "QA Engineer",
      companyName: "Vandelay Industries",
      companyWebsite: "https://vandelay.com",
      locationRestrictions: ["Worldwide"],
      description: "<p>Break our software on purpose.</p>",
      employmentType: "Full-time",
      applicationLink: "https://vandelay.com/careers/qa-123",
      pubDate: 2091990000,
    },
    {
      guid: "https://himalayas.app/jobs/va-9",
      title: "Virtual Assistant",
      companyName: "Pawn Shop",
      locationRestrictions: ["Worldwide"],
      description: "<p>Answer emails.</p>",
      applicationLink: "https://pawn.example/jobs/va-9",
      pubDate: 2091980000,
    },
  ],
  nextCursor: null,
};

const FIXTURES: [string, unknown][] = [
  ["https://remotive.com/api/remote-jobs?category=software-dev", REMOTIVE_FIXTURE],
  ["https://remoteok.com/api", REMOTE_OK_FIXTURE],
  ["https://jobicy.com/api/jobs?count=200&industry=engineering", JOBICY_FIXTURE],
  ["https://himalayas.app/jobs/api?limit=20", HIMALAYAS_FIXTURE],
];

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

async function main() {
  const realFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const href = typeof input === "string" ? input : input.toString();
    const fixture = FIXTURES.find(([prefix]) => href.startsWith(prefix))?.[1];

    if (!fixture) {
      throw new Error(`Unexpected fetch in verify run: ${href}`);
    }

    return {
      ok: true,
      status: 200,
      json: async () => fixture,
    } as unknown as Response;
  }) as typeof fetch;

  const { collectProviders, mergeProviderJobs, sourceJobIdFor, fitVarChar } =
    await import("./ingest-jobs");

  console.log("collectProviders:");
  const outcomes = await collectProviders();

  const byProvider = new Map(outcomes.map((outcome) => [outcome.provider, outcome]));

  check("all four providers succeeded", outcomes.every((o) => o.success));
  check("Remotive fetched 3", byProvider.get("Remotive")?.fetchedCount === 3);
  check("Remotive kept 1 (nurse + data entry dropped)", byProvider.get("Remotive")?.keptCount === 1);
  check(
    "Remotive dropped sample names the nurse job",
    byProvider.get("Remotive")?.droppedTitles.includes("Registered Nurse") === true,
  );
  check("Remote OK fetched 3 jobs", byProvider.get("Remote OK")?.fetchedCount === 3);
  check("Remote OK kept 2 (sales dropped, tag-based keep works)", byProvider.get("Remote OK")?.keptCount === 2);
  check("Himalayas kept 1 (virtual assistant dropped)", byProvider.get("Himalayas")?.keptCount === 1);
  check("Jobicy kept 2", byProvider.get("Jobicy")?.keptCount === 2);

  console.log("mergeProviderJobs:");
  const merged = mergeProviderJobs(outcomes);

  check("6 kept jobs merge into 5 unique listings", merged.length === 5, merged.map((m) => m.dedupKey));

  const reactJob = merged.find((m) => m.job.title === "Senior React Developer");

  check("cross-board duplicate merged into one entry", reactJob !== undefined);
  check(
    "merged job lists both boards in fetch order",
    reactJob?.providers.join(",") === "Remotive,Jobicy",
    reactJob?.providers,
  );
  check("primary id stays the Remotive publicId", reactJob?.job.id === "remotive-9001", reactJob?.job.id);
  check("primary source stays Remotive", reactJob?.job.source === "Remotive");
  check("salary gap filled from Jobicy", reactJob?.job.salaryMin === 60000, reactJob?.job.salaryMin);
  check(
    "richer Jobicy description replaced the teaser",
    (reactJob?.job.description.length ?? 0) > 200,
  );

  const devops = merged.find((m) => m.job.title === "DevOps Engineer");
  check("Jobicy-only job kept its own entry", devops?.providers.join(",") === "Jobicy");

  console.log("id helpers:");
  check("Remotive id prefix stripped", sourceJobIdFor("Remotive", "remotive-9001") === "9001");
  check(
    "Himalayas URL id keeps its URL after prefix strip",
    sourceJobIdFor("Himalayas", "himalayas-https://himalayas.app/jobs/qa-123") ===
      "https://himalayas.app/jobs/qa-123",
  );
  check(
    "unknown provider id passes through",
    sourceJobIdFor("New Board", "x-1") === "x-1",
  );

  const shortId = "remotive-9001";
  check("short ids are untouched", fitVarChar(shortId) === shortId);

  const longId = `himalayas-${"https://himalayas.app/jobs/".repeat(15)}`;
  const fitted = fitVarChar(longId);
  check("overlong ids fit the VarChar(255) column", fitted.length === 255, fitted.length);
  check("overlong id shortening is deterministic", fitVarChar(longId) === fitted);
  check("shortened id keeps a readable prefix", fitted.startsWith("himalayas-https://"));

  globalThis.fetch = realFetch;

  if (failures === 0) {
    console.log("\nAll ingestion pipeline checks passed.");
    return;
  }

  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
