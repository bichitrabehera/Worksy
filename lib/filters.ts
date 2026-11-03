import type { Job } from "./types";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    if (!job.id || !job.title || !job.company || !job.url) return false;
    const key = normalize(job.url) ||
      `${normalize(job.title)}|${normalize(job.company)}|${normalize(job.location.join(" "))}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}