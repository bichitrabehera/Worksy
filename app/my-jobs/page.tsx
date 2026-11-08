"use client";

import { useEffect, useState } from "react";
import { Bookmark, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import {
  removeJobFromServer,
  removeSavedJobId,
  writeSavedJobIds,
} from "@/lib/saved-jobs";
import type { Job } from "@/lib/types";

export default function MyJobsPage() {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSavedJobs = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/saved", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load saved jobs.");

      const data = await response.json();
      const jobs: Job[] = data.saved ?? [];

      setSavedJobs(jobs);
      // Keep the bookmark cache in sync with the server.
      writeSavedJobIds(jobs.map((job) => job.id));
    } catch (loadError) {
      console.error("Saved jobs loading failed:", loadError);
      setError("Unable to load saved jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const removeSaved = async (id: string) => {
    setSavedJobs((jobs) => jobs.filter((job) => job.id !== id));
    // Clear the cached id immediately so bookmarks elsewhere update too.
    removeSavedJobId(id);

    try {
      await removeJobFromServer(id);
    } catch (removeError) {
      console.error("Saved job removal failed:", removeError);
      await loadSavedJobs();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-muted-foreground">
            Jobs you&apos;ve saved for later. Saved jobs expire after 30 days.
          </p>
        </div>

        {loading && <Loader fullScreen />}

        {!loading && error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-destructive text-sm">{error}</p>
              <Button className="mt-4" size="sm" onClick={loadSavedJobs}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && savedJobs.length === 0 && (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                No saved jobs yet
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/jobs")}
              >
                Browse jobs
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && savedJobs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {savedJobs.map((job) => (
              <Card
                key={job.id}
                className="border-border transition-colors hover:border-border dark:border-border dark:hover:border-border"
              >
                <CardContent className="px-5">
                  <h3 className="mb-1 text-base font-medium">{job.title}</h3>
                  {job.companyUrl ? (
                    <a
                      href={job.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 block text-sm text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                    >
                      {job.company}
                    </a>
                  ) : (
                    <p className="mb-2 text-sm text-muted-foreground">
                      {job.company}
                    </p>
                  )}
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{job.location.join(", ")}</span>
                    <span>·</span>
                    <span>{job.jobType || "Not specified"}</span>
                    <span>·</span>
                    <span>{job.workMode}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(job.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      Apply
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSaved(job.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
