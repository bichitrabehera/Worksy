"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Bookmark,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Laptop,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CompanyAvatar } from "@/components/company-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import { formatJobDate, formatSalary, matchTone } from "@/lib/job-display";
import {
  fetchSavedJobIds,
  readSavedJobIds,
  removeJobFromServer,
  removeSavedJobId,
  saveJobToServer,
  writeSavedJobIds,
} from "@/lib/saved-jobs";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceLogos: Record<string, string> = {
  Remotive: "https://www.google.com/s2/favicons?domain=remotive.com&sz=128",
  Himalayas: "https://www.google.com/s2/favicons?domain=himalayas.app&sz=128",
  "Remote OK": "https://www.google.com/s2/favicons?domain=remoteok.com&sz=128",
  Jobicy: "https://www.google.com/s2/favicons?domain=jobicy.com&sz=128",
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium">{label}</p>
        <p className="text-foreground text-sm">{value}</p>
      </div>
    </div>
  );
}

function JobDetailContent() {
  const params = useParams<{ id: string }>();
  const jobToken = typeof params.id === "string" ? params.id : "";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load the full job details.
  useEffect(() => {
    if (!jobToken) return;

    let cancelled = false;

    const loadJob = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/jobs/${jobToken}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          throw new Error("This job is no longer available.");
        }

        if (!response.ok) {
          throw new Error("Unable to load this job. Please try again.");
        }

        const data = await response.json();

        if (cancelled) return;

        setJob(data.job ?? null);

        if (data.job?.title) {
          document.title = `${data.job.title} · ${data.job.company}`;
        }
      } catch (loadError) {
        if (cancelled) return;

        console.error("Job detail loading failed:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this job.",
        );
        setJob(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [jobToken, retryCount]);

  const savedChangedRef = useRef(false);

  // Sync the saved state from localStorage and the API.
  useEffect(() => {
    if (!job?.id) return;

    let cancelled = false;

    savedChangedRef.current = false;
    setSaved(readSavedJobIds().includes(job.id));

    void fetchSavedJobIds()
      .then((databaseSaved) => {
        if (cancelled || savedChangedRef.current) return;

        setSaved(databaseSaved.includes(job.id));
        writeSavedJobIds(databaseSaved);
      })
      .catch((syncError) => {
        console.error("Saved jobs loading failed:", syncError);
      });

    return () => {
      cancelled = true;
    };
  }, [job?.id]);

  const toggleSave = async () => {
    if (!job) return;

    const nextSaved = !saved;
    const previous = saved;

    savedChangedRef.current = true;
    setSaved(nextSaved);

    if (nextSaved) {
      writeSavedJobIds([...readSavedJobIds(), job.id]);
    } else {
      removeSavedJobId(job.id);
    }

    try {
      if (nextSaved) {
        await saveJobToServer(job);
      } else {
        await removeJobFromServer(job.id);
      }
    } catch (saveError) {
      console.error("Saving job failed:", saveError);
      setSaved(previous);

      if (previous) {
        writeSavedJobIds([...readSavedJobIds(), job.id]);
      } else {
        removeSavedJobId(job.id);
      }
    }
  };

  const apply = () => {
    if (!job) return;

    window.open(job.url, "_blank", "noopener,noreferrer");
  };

  const salary = job ? formatSalary(job) : null;
  const postedAt = job ? formatJobDate(job.postedAt) : null;
  const reasons = job?.match?.reasons ?? [];

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/jobs"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to jobs
        </Link>

        {loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader />
              <p className="text-muted-foreground text-sm">
                Loading job details...
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <p className="text-muted-foreground text-sm">{error}</p>

              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Try again
                </Button>

                <Button onClick={() => (window.location.href = "/jobs")}>
                  Browse jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && job && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {/* Job header */}
              <Card>
                <CardContent className="space-y-5 px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="min-w-0">
                        <h1 className="text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
                          {job.title}
                        </h1>

                        <p className="text-muted-foreground mt-1 text-sm">
                          {job.companyUrl ? (
                            <a
                              href={job.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground font-medium underline-offset-4 hover:underline"
                            >
                              {job.company}
                            </a>
                          ) : (
                            <span className="text-foreground font-medium">
                              {job.company}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant={saved ? "secondary" : "outline"}
                        onClick={toggleSave}
                        className="gap-1.5"
                      >
                        <Bookmark
                          className={cn("size-4", saved && "fill-current")}
                        />
                        {saved ? "Saved" : "Save"}
                      </Button>

                      <Button onClick={apply} className="gap-1.5">
                        Apply now
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <MapPin className="size-3" />
                      {job.location.join(", ") || "Location not specified"}
                    </Badge>

                    {job.jobType && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Briefcase className="size-3" />
                        {job.jobType}
                      </Badge>
                    )}

                    <Badge variant="outline" className="gap-1 font-normal">
                      <Laptop className="size-3" />
                      {job.workMode}
                    </Badge>

                    {job.experienceRequired && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Sparkles className="size-3" />
                        {job.experienceRequired}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Full description */}
              <Card>
                <CardContent className="px-6">
                  <h2 className="text-muted-foreground text-xs font-semibold">
                    About the role
                  </h2>

                  <div className="text-foreground/90 mt-3 text-sm leading-7">
                    {job.description ||
                      "No description provided for this role."}
                  </div>
                </CardContent>
              </Card>

              {job.requirements && (
                <Card>
                  <CardContent className="px-6">
                    <h2 className="text-muted-foreground text-xs font-semibold">
                      Requirements
                    </h2>

                    <div className="text-foreground/90 mt-3 text-sm leading-7 whitespace-pre-line">
                      {job.requirements}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardContent className="space-y-5 px-5">
                  <div
                    className={cn(
                      "rounded-xl p-4 ring-1",
                      matchTone(job.match?.category),
                    )}
                  >
                    <p className="text-[11px] font-semibold">
                      {job.match?.category ?? "Match"}
                    </p>
                    <p className="mt-1 text-3xl leading-none font-semibold">
                      {job.match?.score ?? 0}%
                    </p>
                    <p className="mt-2 text-xs opacity-80">
                      match with your profile
                    </p>
                  </div>

                  {reasons.length > 0 && (
                    <div>
                      <h2 className="text-muted-foreground text-xs font-semibold">
                        Why this matches
                      </h2>

                      <ul className="mt-2 space-y-2">
                        {reasons.map((reason) => (
                          <li
                            key={reason}
                            className="text-foreground/90 flex items-start gap-2 text-sm"
                          >
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    <DetailRow
                      icon={MapPin}
                      label="Location"
                      value={job.location.join(", ")}
                    />
                    <DetailRow
                      icon={Briefcase}
                      label="Job type"
                      value={job.jobType}
                    />
                    <DetailRow
                      icon={Laptop}
                      label="Work mode"
                      value={job.workMode}
                    />
                    <DetailRow
                      icon={Sparkles}
                      label="Experience"
                      value={job.experienceRequired}
                    />
                    <DetailRow icon={Banknote} label="Salary" value={salary} />
                    <DetailRow
                      icon={CalendarDays}
                      label="Posted"
                      value={postedAt}
                    />
                  </div>

                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    {sourceLogos[job.source] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sourceLogos[job.source]}
                        alt=""
                        className="size-4 object-contain"
                        loading="lazy"
                      />
                    )}
                    <span>via {job.source}</span>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background min-h-[calc(100vh-4rem)]">
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader />
                <p className="text-muted-foreground text-sm">
                  Loading job details...
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      }
    >
      <JobDetailContent />
    </Suspense>
  );
}
