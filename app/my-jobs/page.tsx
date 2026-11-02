"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jobsData from "@/data/jobs.json";
import Link from "next/link";

export default function MyJobsPage() {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("savedJobs");
      if (s) setSaved(JSON.parse(s));
    }
  }, []);

  const savedJobs = (jobsData as any[]).filter((j) => saved.includes(j.source_job_id));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">My Jobs</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Saved jobs</p>
          </div>
          <Link href="/jobs"><Button variant="outline">Back to Jobs</Button></Link>
        </div>

        {savedJobs.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-zinc-600">No saved jobs yet. Save jobs from the feed.</CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {savedJobs.map((job) => (
            <Card key={job.source_job_id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <p className="text-zinc-600 dark:text-zinc-400">{job.company} • {job.location.join(", ")}</p>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => window.open(job.apply_url, '_blank')}>View & Apply</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
