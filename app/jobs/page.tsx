"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Bookmark, Search } from "lucide-react";
import type { Job } from "@/lib/types";
import Loader from "@/components/ui/loader";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
} from "@/components/ui/select";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const JOBS_CACHE_TTL = 45 * 60 * 1000;

function getJobsCacheKey(
  userId: string,
  profile: any,
  page: number,
  pageSize: number,
  searchQuery: string,
  filters: { jobType: string; workMode: string },
) {
  const preferences = {
    desiredJobRoles: profile?.desiredJobRoles ?? [],
    skills: profile?.skills ?? [],
    preferredLocations: profile?.preferredLocations ?? [],
    workMode: profile?.workMode ?? [],
    jobTypes: profile?.jobTypes ?? [],
    preferredExperienceLevel: profile?.preferredExperienceLevel ?? "",
  };

  return `jobs-feed:${userId}:${page}:${pageSize}:${searchQuery}:${filters.jobType}:${filters.workMode}:${JSON.stringify(preferences)}`;
}

export default function JobsPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceJobs, setSourceJobs] = useState<Job[]>([]);

  const [profileChecked, setProfileChecked] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [filters, setFilters] = useState({
    jobType: "",
    workMode: "",
  });

  // Load user profile and saved jobs.
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const res = await fetch("/api/user/sync", {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();
        const userProfile = data.user?.profile ?? null;

        if (userProfile) {
          setProfile(userProfile);

          if (userProfile.onboardingCompleted === false) {
            setRedirecting(true);
            window.location.replace("/onboarding");
            return;
          }
        }

        // Load saved jobs from localStorage.
        const localSaved: string[] = JSON.parse(
          localStorage.getItem("savedJobs") || "[]",
        );

        setSaved(localSaved);

        // Sync saved jobs in the background so it does not delay the feed.
        void fetch("/api/saved")
          .then(async (savedRes) => {
            if (!savedRes.ok) return;

            const savedData = await savedRes.json();
            const databaseJobs = savedData.jobs ?? savedData.savedJobs ?? [];
            const databaseSaved: string[] = databaseJobs
              .map((item: any) =>
                typeof item === "string"
                  ? item
                  : (item.sourceJobId ?? item.source_job_id),
              )
              .filter(Boolean);
            const mergedSaved = [...new Set([...localSaved, ...databaseSaved])];

            setSaved(mergedSaved);
            localStorage.setItem("savedJobs", JSON.stringify(mergedSaved));
          })
          .catch((error) => {
            console.error("Saved jobs loading failed:", error);
          });
      } catch (error) {
        console.error("User data loading failed:", error);
      } finally {
        setProfileChecked(true);
      }
    };

    loadUserData();
  }, []);

  // Matching is performed by the authenticated server route.
  useEffect(() => {
    if (!profileChecked || redirecting || !isUserLoaded || !user?.id) return;

    let cancelled = false;

    const loadJobs = async () => {
      setJobsLoading(true);
      setJobsError("");

      try {
        const cacheKey = getJobsCacheKey(
          user.id,
          profile,
          page,
          pageSize,
          searchQuery,
          filters,
        );
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          const parsed = JSON.parse(cached) as {
            cachedAt: number;
            jobs: Job[];
            hasMore: boolean;
            totalCount: number;
          };

          if (Date.now() - parsed.cachedAt < JOBS_CACHE_TTL) {
            setSourceJobs(parsed.jobs);
            setHasMore(parsed.hasMore);
            setTotalCount(parsed.totalCount ?? 0);
            setJobsLoading(false);
            return;
          }

          sessionStorage.removeItem(cacheKey);
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (filters.jobType) params.set("jobType", filters.jobType);
        if (filters.workMode) params.set("workMode", filters.workMode);

        const res = await fetch(`/api/jobs?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const result = await res.json();
        setTotalCount(result.totalCount ?? 0);

        if (cancelled) return;

        setSourceJobs(result.jobs ?? []);
        setHasMore(Boolean(result.hasMore));
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            cachedAt: Date.now(),
            jobs: result.jobs ?? [],
            hasMore: Boolean(result.hasMore),
            totalCount: result.totalCount ?? 0,
          }),
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Job fetching failed:", error);
        setJobsError("Unable to load jobs. Please try again.");
        setSourceJobs([]);
      } finally {
        if (!cancelled) {
          setJobsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [
    profileChecked,
    profile,
    retryCount,
    redirecting,
    page,
    isUserLoaded,
    user?.id,
    searchQuery,
    filters,
  ]);

  const jobs = sourceJobs;

  // Save or unsave a job.
  const toggleSave = async (id: string) => {
    const isSaved = saved.includes(id);

    const newSaved = isSaved
      ? saved.filter((item) => item !== id)
      : [...saved, id];

    setSaved(newSaved);

    localStorage.setItem("savedJobs", JSON.stringify(newSaved));

    try {
      const res = await fetch("/api/saved", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceJobId: id,
          job: sourceJobs.find((job) => job.id === id),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update saved job");
      }
    } catch (error) {
      console.error("Saving job failed:", error);

      // Restore previous state if the API request fails.
      setSaved(saved);
      localStorage.setItem("savedJobs", JSON.stringify(saved));
    }
  };

  const handleApply = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-[copper] font-semibold tracking-tight mb-2">
            Jobs
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400">
            Discover opportunities matched to your profile
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <InputGroup>
            <InputGroupAddon>
              <Search className="h-4 w-4 text-zinc-400" />
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Search jobs or companies..."
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
            />
          </InputGroup>

          <div className="flex gap-2">
            <Select
              value={filters.jobType}
              onValueChange={(value) => {
                setFilters((prev) => ({
                  ...prev,
                  jobType: value ?? "",
                }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 min-w-[130px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-sm">
                <SelectValue placeholder="Job type" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Job type</SelectLabel>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filters.workMode}
              onValueChange={(value) => {
                setFilters((prev) => ({
                  ...prev,
                  workMode: value ?? "",
                }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 min-w-[130px] border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-sm">
                <SelectValue placeholder="Work mode" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Work mode</SelectLabel>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!jobsLoading && !jobsError && (
          <p className="text-xs text-zinc-500 mb-4">
            {totalCount} opportunities available
            {totalCount > 0 && (
              <>
                {" "}
                · Page {page} of {Math.ceil(totalCount / pageSize)}
              </>
            )}
          </p>
        )}

        {/* Job listings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {jobsLoading && (
            <Card className="col-span-full border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-12 text-center">
                <Loader className="mx-auto" />
                <p className="mt-3 text-sm text-zinc-500">
                  Finding jobs matching your preferences...
                </p>
              </CardContent>
            </Card>
          )}

          {!jobsLoading && jobsError && (
            <Card className="col-span-full border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-12 text-center">
                <p className="text-sm text-zinc-500">{jobsError}</p>

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setPage(1);
                    setRetryCount((count) => count + 1);
                  }}
                >
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {!jobsLoading && !jobsError && jobs.length === 0 && (
            <Card className="col-span-full border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">
                  No jobs found matching your preferences.
                </p>

                <p className="text-xs text-zinc-500 mt-2">
                  Try changing your search or filters.
                </p>
              </CardContent>
            </Card>
          )}

          {!jobsLoading &&
            !jobsError &&
            jobs.map((job) => (
              <Card
                key={job.id}
                className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <CardContent className="px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-base mb-1">
                            {job.title}
                          </h3>

                          {job.companyUrl ? (
                            <a
                              href={job.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                            >
                              {job.company}
                            </a>
                          ) : (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {job.company}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSave(job.id)}
                          className="h-8 w-8 p-0 shrink-0"
                          aria-label={
                            saved.includes(job.id) ? "Unsave job" : "Save job"
                          }
                        >
                          <Bookmark
                            className={`h-4 w-4 ${
                              saved.includes(job.id) ? "fill-current" : ""
                            }`}
                          />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-3">
                        <span>{job.location.join(", ")}</span>
                        <span>·</span>
                        <span>{job.jobType || "Not specified"}</span>
                        <span>·</span>
                        <span>{job.workMode}</span>
                        {job.experienceRequired && (
                          <>
                            <span>·</span>
                            <span>{job.experienceRequired}</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(job.match?.reasons ?? [])
                          .slice(0, 2)
                          .map((reason: string, index: number) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded"
                            >
                              {reason}
                            </span>
                          ))}

                        <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded">
                          {job.match?.score ?? 0}%{" "}
                          {job.match?.category ?? "Lower Match"}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
                        {job.description}
                      </p>

                      {(job.salaryMin || job.salaryMax) && (
                        <p className="mb-4 text-xs text-zinc-500">
                          Salary:{" "}
                          {[job.salaryMin, job.salaryMax]
                            .filter(
                              (value): value is number => value !== undefined,
                            )
                            .join(" - ")}{" "}
                          {job.salaryCurrency ?? ""}
                          {job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          via {job.source}
                          {job.postedAt &&
                            ` · ${new Date(job.postedAt).toLocaleDateString()}`}
                        </span>

                        <Button size="sm" onClick={() => handleApply(job.url)}>
                          Apply
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {!jobsLoading && !jobsError && sourceJobs.length > 0 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#jobs"
                  aria-disabled={page === 1}
                  className={
                    page === 1 ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) {
                      setPage((current) => current - 1);
                    }
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#jobs" isActive aria-current="page">
                  {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#jobs"
                  aria-disabled={!hasMore}
                  className={
                    !hasMore ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (hasMore) {
                      setPage((current) => current + 1);
                    }
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </main>
    </div>
  );
}
