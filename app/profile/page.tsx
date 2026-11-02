"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";

const SKILLS = ["Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "C++", "HTML", "CSS", "MongoDB", "Git"];
const ROLES = ["Software Engineer", "Frontend Developer", "Backend Developer", "Data Analyst", "QA Engineer", "Product Support", "Full Stack Developer"];
const JOB_TYPES = ["Internship", "Full-time", "Part-time", "Contract", "Freelance"];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const LOCATIONS = ["Bengaluru", "Hyderabad", "Pune", "Delhi NCR", "Mumbai", "Chennai", "Remote"];

export default function ProfilePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>({
    skills: [],
    desiredJobRoles: [],
    jobTypes: ["Full-time"],
    preferredLocations: [],
    workMode: [],
  });

  useEffect(() => {
    fetch("/api/user/sync").then(async (res) => {
      const data = await res.json();
      if (data.user?.profile) {
        setProfile(data.user.profile);
      }
    }).catch(() => {});
  }, []);

  const toggleSkill = (s: string) => {
    setProfile((p: any) => ({ ...p, skills: p.skills?.includes(s) ? p.skills.filter((x: string) => x !== s) : [...(p.skills || []), s] }));
  };

  const toggleRole = (r: string) => {
    setProfile((p: any) => ({ ...p, desiredJobRoles: p.desiredJobRoles?.includes(r) ? p.desiredJobRoles.filter((x: string) => x !== r) : [...(p.desiredJobRoles || []), r] }));
  };

  const toggleJobType = (t: string) => {
    setProfile((p: any) => ({ ...p, jobTypes: p.jobTypes?.includes(t) ? p.jobTypes.filter((x: string) => x !== t) : [...(p.jobTypes || []), t] }));
  };

  const toggleLocation = (l: string) => {
    setProfile((p: any) => ({ ...p, preferredLocations: p.preferredLocations?.includes(l) ? p.preferredLocations.filter((x: string) => x !== l) : [...(p.preferredLocations || []), l] }));
  };

  const toggleWorkMode = (w: string) => {
    setProfile((p: any) => ({ ...p, workMode: p.workMode?.includes(w) ? p.workMode.filter((x: string) => x !== w) : [...(p.workMode || []), w] }));
  };

  const save = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, onboardingCompleted: true }),
      });
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Profile</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Your information and job preferences</p>
          </div>
          {!editing ? (
            <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={loading}>{loading ? "Saving" : "Save"}</Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Full name</label>
                  <Input value={profile.fullName || user?.fullName || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Email</label>
                  <Input value={profile.email || user?.primaryEmailAddress?.emailAddress || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Phone number</label>
                  <Input value={profile.phoneNumber || ""} disabled={!editing} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} className="h-9" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Location</label>
                  <Input value={profile.currentLocation || ""} disabled={!editing} onChange={(e) => setProfile({ ...profile, currentLocation: e.target.value })} className="h-9" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">College</label>
                  <Input value={profile.college || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Degree</label>
                  <Input value={profile.degree || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Field of study</label>
                  <Input value={profile.fieldOfStudy || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Graduation year</label>
                  <Input value={profile.graduationYear || ""} disabled className="h-9 bg-zinc-50 dark:bg-zinc-950" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm mb-2">Desired roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleRole(r)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        profile.desiredJobRoles?.includes(r)
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      } ${!editing ? "opacity-60" : ""}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2">Job type</p>
                <div className="flex flex-wrap gap-1.5">
                  {JOB_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleJobType(t)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        profile.jobTypes?.includes(t)
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      } ${!editing ? "opacity-60" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2">Work mode</p>
                <div className="flex flex-wrap gap-1.5">
                  {WORK_MODES.map((w) => (
                    <button
                      key={w}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleWorkMode(w)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        profile.workMode?.includes(w)
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      } ${!editing ? "opacity-60" : ""}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2">Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATIONS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleLocation(l)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        profile.preferredLocations?.includes(l)
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      } ${!editing ? "opacity-60" : ""}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!editing}
                      onClick={() => editing && toggleSkill(s)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        profile.skills?.includes(s)
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      } ${!editing ? "opacity-60" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
