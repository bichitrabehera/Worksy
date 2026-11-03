import type { Job, JobQuery } from "./types";

const stripHtml = (html = "") =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);

const asNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const asUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

const isIndiaEligible = (location = "") => {
  const value = location.toLowerCase();

  return (
    !value ||
    /worldwide|anywhere|global|india|indian|asia|apac|remote/i.test(value)
  );
};

const isHimalayasIndiaEligible = (job: any) => {
  const locations: string[] = job.locationRestrictions ?? [];
  const timezones: string[] = job.timezoneRestrictions ?? [];

  const locationAllowed =
    locations.length === 0 ||
    locations.some((location) => /india/i.test(location));

  const timezoneAllowed =
    timezones.length === 0 ||
    timezones.some((timezone) => /utc\+?05:30|5\.5/i.test(String(timezone)));

  return locationAllowed && timezoneAllowed;
};

const getJobType = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
};

const fetchJson = async (url: URL, cacheSeconds = 3600) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobFinder/1.0",
      },
      next: { revalidate: cacheSeconds },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${url.hostname} responded with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

// --------------------------------------------------
// REMOTIVE
// --------------------------------------------------

export async function fetchRemotive(query: JobQuery): Promise<Job[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");

  if (query.q && query.q.toLowerCase() !== "fresher") {
    url.searchParams.set("search", query.q);
  }

  // No limit parameter: Remotive returns all active listings by default.
  const data = await fetchJson(url, 86400);

  return (data.jobs ?? [])
    .filter((job: any) => isIndiaEligible(job.candidate_required_location))
    .map(
      (job: any): Job => ({
        id: `remotive-${job.id}`,
        title: job.title ?? "Untitled role",
        company: job.company_name ?? "Unknown company",
        companyUrl: asUrl(job.company_url ?? job.company_website),
        location: [job.candidate_required_location || "Remote"],
        description: stripHtml(job.description ?? ""),
        requirements: stripHtml(job.requirements ?? ""),
        jobType: getJobType(job.job_type),
        workMode: "Remote",
        url: job.url,
        source: "Remotive",
        postedAt: job.publication_date ?? "",
        experienceRequired: job.experience_level,
      }),
    );
}

// --------------------------------------------------
// HIMALAYAS
// --------------------------------------------------

export async function fetchHimalayas(query: JobQuery): Promise<Job[]> {
  const allJobs: any[] = [];
  const seenCursors = new Set<string>();

  // Keyword search uses the search endpoint's page pagination.
  if (query.q && query.q.toLowerCase() !== "fresher") {
    let page = 1;

    while (true) {
      const url = new URL("https://himalayas.app/jobs/api/search");

      url.searchParams.set("q", query.q);
      url.searchParams.set("country", "IN");
      url.searchParams.set("sort", "recent");
      url.searchParams.set("page", String(page));

      const data = await fetchJson(url, 86400);
      const jobs = data.jobs ?? [];

      if (!jobs.length) break;

      allJobs.push(...jobs);
      page++;

      // Avoid an accidental endless pagination loop.
      if (page > 1000) {
        console.warn("Himalayas search pagination safety limit reached");
        break;
      }
    }
  } else {
    // Full feed uses cursor pagination.
    let cursor: string | null = null;

    while (true) {
      const url = new URL("https://himalayas.app/jobs/api");

      url.searchParams.set("limit", "20");

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const data = await fetchJson(url, 86400);
      const jobs = data.jobs ?? [];

      allJobs.push(...jobs);

      const nextCursor = data.nextCursor;

      if (!nextCursor || seenCursors.has(nextCursor)) break;

      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }

  return allJobs
    .filter((job: any) => isHimalayasIndiaEligible(job))
    .map(
      (job: any): Job => ({
        id: `himalayas-${job.guid}`,
        title: job.title ?? "Untitled role",
        company: job.companyName ?? "Unknown company",
        companyUrl: asUrl(job.companyWebsite ?? job.companyUrl ?? job.company_url),
        location: [
          job.locationRestrictions?.length
            ? job.locationRestrictions.join(", ")
            : "Worldwide Remote",
        ],
        description: stripHtml(job.description ?? job.excerpt ?? ""),
        requirements: stripHtml(job.requirements ?? ""),
        jobType: job.employmentType,
        workMode: "Remote",
        salaryMin: asNumber(job.minSalary),
        salaryMax: asNumber(job.maxSalary),
        salaryCurrency: job.currency,
        salaryPeriod: job.salaryPeriod,
        url: job.applicationLink,
        source: "Himalayas",
        postedAt: job.pubDate ? new Date(job.pubDate * 1000).toISOString() : "",
        experienceRequired: job.experienceLevel,
      }),
    );
}

// --------------------------------------------------
// REMOTE OK
// --------------------------------------------------

export async function fetchRemoteOK(query: JobQuery): Promise<Job[]> {
  const url = new URL("https://remoteok.com/api");

  // Only apply a tag filter when the user explicitly searches.
  if (query.q && query.q.toLowerCase() !== "fresher") {
    url.searchParams.set("tag", query.q.split(/\s+/)[0].toLowerCase());
  }

  const data = await fetchJson(url, 3600);

  // Remote OK returns a metadata object before the job records.
  const jobs = Array.isArray(data)
    ? data.filter((item: any) => item.id && item.position)
    : [];

  return jobs.map((job: any): Job => {
    const location = job.location || "Remote (check country eligibility)";

    return {
      id: `remoteok-${job.id}`,
      title: job.position ?? "Untitled role",
      company: job.company ?? "Unknown company",
      companyUrl: asUrl(job.company_url ?? job.company_url_or_website),
      description: stripHtml(job.description ?? ""),
      jobType: getJobType(job.tags),
      workMode: "Remote",
      location: [location],
      salaryMin: asNumber(job.salary_min),
      salaryMax: asNumber(job.salary_max),
      url: job.apply_url || job.url,
      source: "Remote OK",
      postedAt: job.date ?? "",
      experienceRequired: job.experience_level,
    };
  });
}

// --------------------------------------------------
// JOBICY
// --------------------------------------------------

export async function fetchJobicy(query: JobQuery): Promise<Job[]> {
  const allJobs: any[] = [];
  const seenCursors = new Set<string>();

  let cursor: string | null = null;

  while (true) {
    const url = new URL("https://jobicy.com/api/jobs");

    url.searchParams.set("count", "200");

    if (
      query.q &&
      query.q.toLowerCase() !== "fresher" &&
      query.q.trim().length >= 3
    ) {
      url.searchParams.set("tag", query.q.trim().slice(0, 50));
    }

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const data = await fetchJson(url, 3600);

    if (data.success === false) {
      throw new Error(data.error || "Jobicy request failed");
    }

    allJobs.push(...(data.jobs ?? []));

    const nextCursor = data.nextCursor;

    if (!nextCursor || seenCursors.has(nextCursor)) break;

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return allJobs
    .filter((job: any) => isIndiaEligible(job.jobGeo))
    .map(
      (job: any): Job => ({
        id: `jobicy-${job.id}`,
        title: job.jobTitle ?? "Untitled role",
        company: job.companyName ?? "Unknown company",
        companyUrl: asUrl(job.companyWebsite ?? job.companyUrl ?? job.company_url),
        location: [job.jobGeo || "Worldwide Remote"],
        description: stripHtml(job.jobDescription ?? job.jobExcerpt ?? ""),
        requirements: stripHtml(job.jobRequirements ?? ""),
        jobType: getJobType(job.jobType),
        workMode: "Remote",
        salaryMin: asNumber(job.salaryMin),
        salaryMax: asNumber(job.salaryMax),
        salaryCurrency: job.salaryCurrency,
        salaryPeriod: job.salaryPeriod,
        url: job.url,
        source: "Jobicy",
        postedAt: job.pubDate ?? "",
        experienceRequired: job.jobLevel,
      }),
    );
}
