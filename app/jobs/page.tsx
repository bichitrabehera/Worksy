"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import jobsData from "@/data/jobs.json";
import { scoreJob, isFresherFriendly } from "@/lib/matching";
import { ExternalLink, Bookmark, Search } from "lucide-react";

export default function JobsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    jobType: "",
    workMode: "",
  });

  useEffect(() => {
    fetch("/api/user/sync", { method: "GET" })
      .then(async (res) => {
        const data = await res.json();
        if (data.user?.profile) {
          setProfile(data.user.profile);
          if (data.user.profile.onboardingCompleted === false) {
            window.location.href = "/onboarding";
            return;
          }
        }
      })
      .catch(() => {});
    
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("savedJobs");
      if (s) setSaved(JSON.parse(s));
    }
    
    fetch("/api/saved").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        // Also merge with localStorage
      }
    }).catch(() => {});
  }, []);

  let jobs = (jobsData as any[])
    .filter((j) => isFresherFriendly(j))
    .filter((j) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
      }
      return true;
    })
    .filter((j) => {
      if (filters.jobType && j.jobType !== filters.jobType) return false;
      if (filters.workMode && j.workMode !== filters.workMode) return false;
      return true;
    })
    .map((j) => ({ ...j, match: scoreJob(j, profile) }))
    .sort((a, b) => b.match.score - a.match.score);

  const toggleSave = async (id: string) => {
    const isSaved = saved.includes(id);
    const newSaved = isSaved ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(newSaved);
    if (typeof window !== "undefined") {
      localStorage.setItem("savedJobs", JSON.stringify(newSaved));
    }
    
    try {
      if (isSaved) {
        await fetch("/api/saved", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceJobId: id }),
        });
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceJobId: id }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Jobs</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Discover opportunities matched to your profile</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by title or company"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="h-10 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm bg-white dark:bg-black"
              value={filters.jobType}
              onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
            >
              <option value="">Job type</option>
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
            <select
              className="h-10 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm bg-white dark:bg-black"
              value={filters.workMode}
              onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}
            >
              <option value="">Work mode</option>
              <option value="Onsite">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {jobs.length === 0 && (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-12 text-center">
                <p className="text-zinc-600 dark:text-zinc-400">No jobs found</p>
              </CardContent>
            </Card>
          )}

          {jobs.map((job) => (
            <Card key={job.source_job_id} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-base mb-1">{job.title}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{job.company}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toggleSave(job.source_job_id)} className="h-8 w-8 p-0">
                        <Bookmark className={`h-4 w-4 ${saved.includes(job.source_job_id) ? "fill-current" : ""}`} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500 mb-3">
                      <span>{job.location.join(", ")}</span>
                      <span>·</span>
                      <span>{job.jobType}</span>
                      <span>·</span>
                      <span>{job.workMode}</span>
                      {job.salary_range && (
                        <>
                          <span>·</span>
                          <span>{job.salary_range}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.match.reasons.slice(0, 2).map((r: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-md">
                          {r}
                        </span>
                      ))}
                      <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-md">
                        {job.match.score}% match
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">{job.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">via {job.source}</span>
                      <Button size="sm" onClick={() => handleApply(job.apply_url)}>
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
      </main>
    </div>
  );
}
