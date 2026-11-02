"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import jobsData from "@/data/jobs.json";
import { Bookmark, ExternalLink } from "lucide-react";

export default function MyJobsPage() {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/user/sync", { method: "GET" }).catch(() => {});
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("savedJobs");
      if (s) setSaved(JSON.parse(s));
    }
  }, []);

  const removeSaved = async (id: string) => {
    const newSaved = saved.filter((x) => x !== id);
    setSaved(newSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem("savedJobs", JSON.stringify(newSaved));
    }
    try {
      await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceJobId: id }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const savedJobs = (jobsData as any[]).filter((j) => saved.includes(j.source_job_id));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Saved</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Jobs you've saved for later</p>
        </div>

        {savedJobs.length === 0 && (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-12 text-center">
              <Bookmark className="h-8 w-8 mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">No saved jobs yet</p>
              <Button size="sm" onClick={() => window.location.href = "/jobs"}>Browse jobs</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {savedJobs.map((job) => (
            <Card key={job.source_job_id} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base mb-1">{job.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{job.company}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-4">
                      <span>{job.location.join(", ")}</span>
                      <span>·</span>
                      <span>{job.jobType}</span>
                      <span>·</span>
                      <span>{job.workMode}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => window.open(job.apply_url, '_blank', 'noopener,noreferrer')}>
                        Apply
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeSaved(job.source_job_id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
