import type { Job } from "./types";

export const SAVED_JOBS_STORAGE_KEY = "savedJobs";

// Read saved job ids from localStorage. This is only a cache: the API is the
// source of truth so a removal on another page cannot leave a stale bookmark.
export function readSavedJobIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(SAVED_JOBS_STORAGE_KEY) || "[]",
    );

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeSavedJobIds(ids: string[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    SAVED_JOBS_STORAGE_KEY,
    JSON.stringify([...new Set(ids)]),
  );
}

export function addSavedJobId(id: string) {
  writeSavedJobIds([...readSavedJobIds(), id]);
}

export function removeSavedJobId(id: string) {
  writeSavedJobIds(readSavedJobIds().filter((savedId) => savedId !== id));
}

// The saved API has returned a few shapes over time. Accept all of them so a
// response change cannot silently hide saved jobs.
export function getSavedJobIdsFromResponse(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];

  const payload = data as {
    saved?: unknown;
    jobs?: unknown;
    savedJobs?: unknown;
  };

  const entries = Array.isArray(payload.saved)
    ? payload.saved
    : Array.isArray(payload.jobs)
      ? payload.jobs
      : Array.isArray(payload.savedJobs)
        ? payload.savedJobs
        : [];

  return entries
    .map((entry) => {
      if (typeof entry === "string") return entry;

      if (entry && typeof entry === "object") {
        const item = entry as {
          id?: string;
          sourceJobId?: string;
          source_job_id?: string;
        };

        return item.id ?? item.sourceJobId ?? item.source_job_id;
      }

      return undefined;
    })
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function fetchSavedJobIds(): Promise<string[]> {
  const response = await fetch("/api/saved", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load saved jobs.");
  }

  return getSavedJobIdsFromResponse(await response.json());
}

export async function saveJobToServer(job: Job) {
  const response = await fetch("/api/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceJobId: job.id, job }),
  });

  if (!response.ok) {
    throw new Error("Failed to save job.");
  }
}

export async function removeJobFromServer(id: string) {
  const response = await fetch("/api/saved", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceJobId: id }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove saved job.");
  }
}
