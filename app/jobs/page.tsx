"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jobsData from "@/data/jobs.json";
import { scoreJob, isFresherFriendly } from "@/lib/matching";
import Link from "next/link";

export default function JobsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = localStorage.getItem("profile");
      if (p) setProfile(JSON.parse(p));
      const s = localStorage.getItem("savedJobs");
      if (s) setSaved(JSON.parse(s));
    }
  }, []);

  const jobs = (jobsData as any[])
    .filter((j) => isFresherFriendly(j))
    .map((j) => ({ ...j, match: scoreJob(j, profile) }))
    .sort((a, b) => b.match.score - a.match.score);

  const toggleSave = (id: string) => {
    const newSaved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(newSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem("savedJobs", JSON.stringify(newSaved));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Jobs for you</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Bengaluru fresher roles • Ranked by match</p>
          </div>
          <div className="flex gap-2">
            <Link href="/my-jobs"><Button variant="outline">My Jobs</Button></Link>
            <Link href="/onboarding"><Button variant="outline">Edit Profile</Button></Link>
          </div>
        </div>

        {jobs.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-zinc-600">No jobs found. Try updating your profile.</CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.source_job_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <p className="text-zinc-600 dark:text-zinc-400">{job.company} • {job.location.join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">{job.match.score}% match</div>
                    <p className="text-xs text-zinc-500">{job.salary_range}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {job.match.reasons.map((r: string, i: number) => (
                    <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{r}</span>
                  ))}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{job.description}</p>
                <div className="flex gap-2">
                  <Button onClick={() => window.open(job.apply_url, '_blank')}>View & Apply</Button>
                  <Button variant={saved.includes(job.source_job_id) ? "default" : "outline"} onClick={() => toggleSave(job.source_job_id)}>
                    {saved.includes(job.source_job_id) ? "Saved" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
