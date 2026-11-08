"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Banknote,
  Bookmark,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Laptop,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyAvatar } from "@/components/company-avatar";
import type { Job } from "@/lib/types";
import { formatJobDate, formatSalary, matchTone } from "@/lib/job-display";
import { encodeJobId } from "@/lib/job-id";
import {
  fetchSavedJobIds,
  readSavedJobIds,
  removeJobFromServer,
  saveJobToServer,
  writeSavedJobIds,
} from "@/lib/saved-jobs";
import { cn } from "@/lib/utils";
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

const sourceLogos: Record<string, string> = {
  Remotive: "https://www.google.com/s2/favicons?domain=remotive.com&sz=128",
  Himalayas: "https://www.google.com/s2/favicons?domain=himalayas.app&sz=128",
  "Remote OK": "https://www.google.com/s2/favicons?domain=remoteok.com&sz=128",
  Jobicy: "https://www.google.com/s2/favicons?domain=jobicy.com&sz=128",
};

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
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sourceJobs, setSourceJobs] = useState<Job[]>([]);

  const [profileChecked, setProfileChecked] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  const [filters, setFilters] = useState({
    jobType: "",
    workMode: "",
  });

  // Debounce search input so typing doesn't refetch on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Tracks whether the user changed the saved list while the initial API sync
  // was in flight, so a stale response cannot resurrect a removed bookmark.
  const savedChangedRef = useRef(false);

  const openJob = (job: Job) => {
    router.push(`/jobs/${encodeJobId(job.id)}`);
  };

  // Load user profile and saved jobs.
  useEffect(() => {
    // Show the cached saved list immediately, then replace it with the server
    // list so removals from other pages are reflected here.
    setSaved(readSavedJobIds());

    void fetchSavedJobIds()
      .then((databaseSaved) => {
        if (savedChangedRef.current) return;

        setSaved(databaseSaved);
        writeSavedJobIds(databaseSaved);
      })
      .catch((error) => {
        console.error("Saved jobs loading failed:", error);
      });

    const loadUserData = async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "GET",
        });

        if (res.status === 404) {
          setRedirecting(true);
          window.location.replace("/onboarding");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();
        const userProfile = data.profile ?? null;

        if (userProfile) {
          setProfile(userProfile);

          if (userProfile.onboardingCompleted === false) {
            setRedirecting(true);
            window.location.replace("/onboarding");
            return;
          }
        }
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
          debouncedSearchQuery,
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
        if (debouncedSearchQuery.trim()) params.set("q", debouncedSearchQuery.trim());
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
    debouncedSearchQuery,
    filters,
  ]);

  const jobs = sourceJobs;

  // Save or unsave a job.
  const toggleSave = async (id: string) => {
    const isSaved = saved.includes(id);
    const previous = saved;

    const newSaved = isSaved
      ? saved.filter((item) => item !== id)
      : [...saved, id];

    savedChangedRef.current = true;
    setSaved(newSaved);
    writeSavedJobIds(newSaved);

    try {
      if (isSaved) {
        await removeJobFromServer(id);
      } else {
        const job = sourceJobs.find((item) => item.id === id);

        if (!job) throw new Error("Job not found");

        await saveJobToServer(job);
      }
    } catch (error) {
      console.error("Saving job failed:", error);

      // Restore previous state if the API request fails.
      setSaved(previous);
      writeSavedJobIds(previous);
    }
  };

  const handleApply = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <InputGroup>
            <InputGroupAddon>
              <Search className="text-muted-foreground h-4 w-4" />
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

          <div className="flex justify-center gap-2">
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
              <SelectTrigger className="border-border bg-background h-10 min-w-[130px] text-sm">
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
              <SelectTrigger className="border-border bg-background h-10 min-w-[130px] text-sm">
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
          <p className="text-muted-foreground mb-4 text-xs">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {jobsLoading && (
            <Card className="border-border col-span-full">
              <CardContent className="p-12 text-center">
                <Loader className="mx-auto" />
                <p className="text-muted-foreground mt-3 text-sm">
                  Finding jobs matching your preferences...
                </p>
              </CardContent>
            </Card>
          )}

          {!jobsLoading && jobsError && (
            <Card className="border-border col-span-full">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-sm">{jobsError}</p>

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
            <Card className="border-border col-span-full">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  No jobs found matching your preferences.
                </p>

                <p className="text-muted-foreground mt-2 text-xs">
                  Try changing your search or filters.
                </p>
              </CardContent>
            </Card>
          )}

          {!jobsLoading &&
            !jobsError &&
            jobs.map((job) => {
              const isSaved = saved.includes(job.id);
              const salary = formatSalary(job);
              const postedAt = formatJobDate(job.postedAt);
              const reasons = job.match?.reasons ?? [];

              return (
                <Card
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${job.title} at ${job.company}`}
                  onClick={() => openJob(job)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openJob(job);
                    }
                  }}
                  className="group focus-visible:ring-brand/40 border-border dark:border-border dark:hover:border-border relative flex h-full cursor-pointer flex-col focus-visible:ring-2 focus-visible:outline-none"
                >
                  <CardContent className="flex flex-1 flex-col gap-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight">
                          {job.title}
                        </h3>
                        <p className="text-muted-foreground mt-0.5 truncate text-sm">
                          {job.company}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSave(job.id);
                          }}
                          aria-label={isSaved ? "Unsave job" : "Save job"}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Bookmark
                            className={cn(
                              "size-4",
                              isSaved && "text-brand fill-current",
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {job.location.join(", ") || "Not specified"}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Laptop className="size-3.5 shrink-0" />
                        {job.workMode}
                      </span>
                    </div>

                    <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                      <Banknote className="text-muted-foreground size-3.5" />
                      {salary ? salary : "Not specified"}
                    </p>

                    <div className="border-border/70 mt-auto flex items-center justify-between gap-2 pt-3">
                      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
                        {sourceLogos[job.source] && (
                          <img
                            src={sourceLogos[job.source]}
                            alt=""
                            className="size-4 object-contain"
                            loading="lazy"
                          />
                        )}
                        <span className="truncate">{job.source}</span>
                        {postedAt && (
                          <span className="shrink-0">· {postedAt}</span>
                        )}
                      </span>

                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(job.url);
                        }}
                      >
                        Apply
                        <ExternalLink className="ml-1.5 size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
