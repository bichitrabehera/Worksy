"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const SKILLS = ["Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "C++", "HTML", "CSS", "MongoDB", "Git"];
const ROLES = ["Software Engineer", "Frontend Developer", "Backend Developer", "Data Analyst", "QA Engineer", "Product Support", "Full Stack Developer"];
const JOB_TYPES = ["Internship", "Full-time", "Part-time", "Contract", "Freelance"];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EXPERIENCE_LEVELS = ["Fresher", "Internship Experience", "Experienced"];
const LOCATIONS = ["Bengaluru", "Hyderabad", "Pune", "Delhi NCR", "Mumbai", "Chennai", "Remote"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    currentLocation: "",
    college: "",
    university: "",
    degree: "",
    fieldOfStudy: "",
    major: "",
    graduationYear: new Date().getFullYear(),
    experienceLevel: "",
    skills: [] as string[],
    desiredJobRoles: [] as string[],
    jobTypes: ["Full-time"],
    preferredLocations: [] as string[],
    workMode: [] as string[],
    expectedSalaryMin: "",
    expectedSalaryMax: "",
    preferredExperienceLevel: "",
  });

  useEffect(() => {
    if (isLoaded && user) {
      setForm((f) => ({
        ...f,
        fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
      }));
      // Sync user
      fetch("/api/user/sync", { method: "POST" });
    }
  }, [isLoaded, user]);

  const toggleSkill = (s: string) => {
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));
  };

  const toggleRole = (r: string) => {
    setForm((f) => ({ ...f, desiredJobRoles: f.desiredJobRoles.includes(r) ? f.desiredJobRoles.filter((x) => x !== r) : [...f.desiredJobRoles, r] }));
  };

  const toggleJobType = (t: string) => {
    setForm((f) => ({ ...f, jobTypes: f.jobTypes.includes(t) ? f.jobTypes.filter((x) => x !== t) : [...f.jobTypes, t] }));
  };

  const toggleLocation = (l: string) => {
    setForm((f) => ({ ...f, preferredLocations: f.preferredLocations.includes(l) ? f.preferredLocations.filter((x) => x !== l) : [...f.preferredLocations, l] }));
  };

  const toggleWorkMode = (w: string) => {
    setForm((f) => ({ ...f, workMode: f.workMode.includes(w) ? f.workMode.filter((x) => x !== w) : [...f.workMode, w] }));
  };

  const save = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingCompleted: true, onboardingStep: 3 }),
      });
      router.push("/jobs");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = form.fullName && form.email && form.phoneNumber && form.currentLocation && form.college && form.degree && form.fieldOfStudy && form.graduationYear && form.experienceLevel;
  const canProceedStep2 = form.desiredJobRoles.length > 0 && form.jobTypes.length > 0;

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Complete Your Profile</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Tell us about yourself to get personalized job recommendations</p>
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className={`h-2 w-16 rounded ${step >= 1 ? "bg-black dark:bg-white" : "bg-zinc-300"}`} />
            <div className={`h-2 w-16 rounded ${step >= 2 ? "bg-black dark:bg-white" : "bg-zinc-300"}`} />
            <div className={`h-2 w-16 rounded ${step >= 3 ? "bg-black dark:bg-white" : "bg-zinc-300"}`} />
          </div>
          <p className="text-sm text-zinc-500">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Full Name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                <Input placeholder="Email *" value={form.email} disabled />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Phone Number *" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                <Input placeholder="Current Location *" value={form.currentLocation} onChange={(e) => setForm({ ...form, currentLocation: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="College/University *" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
                <Input placeholder="University (if different)" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Degree * (e.g., B.Tech, B.E.)" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
                <Input placeholder="Field of Study *" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Major/Branch" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} />
                <Input type="number" placeholder="Graduation Year *" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) })} />
              </div>
              <div>
                <p className="text-sm mb-2 font-medium">Experience Level *</p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((e) => (
                    <Button key={e} type="button" variant={form.experienceLevel === e ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, experienceLevel: e })}>
                      {e}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">
                Next
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm mb-2 font-medium">Desired Job Roles *</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <Button key={r} type="button" variant={form.desiredJobRoles.includes(r) ? "default" : "outline"} size="sm" onClick={() => toggleRole(r)}>
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium">Job Types *</p>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((t) => (
                    <Button key={t} type="button" variant={form.jobTypes.includes(t) ? "default" : "outline"} size="sm" onClick={() => toggleJobType(t)}>
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium">Preferred Locations</p>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((l) => (
                    <Button key={l} type="button" variant={form.preferredLocations.includes(l) ? "default" : "outline"} size="sm" onClick={() => toggleLocation(l)}>
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium">Work Mode</p>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((w) => (
                    <Button key={w} type="button" variant={form.workMode.includes(w) ? "default" : "outline"} size="sm" onClick={() => toggleWorkMode(w)}>
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1">
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills & Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm mb-2 font-medium">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((s) => (
                    <Button key={s} type="button" variant={form.skills.includes(s) ? "default" : "outline"} size="sm" onClick={() => toggleSkill(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Expected Salary Min (optional)" value={form.expectedSalaryMin} onChange={(e) => setForm({ ...form, expectedSalaryMin: e.target.value })} />
                <Input placeholder="Expected Salary Max (optional)" value={form.expectedSalaryMax} onChange={(e) => setForm({ ...form, expectedSalaryMax: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={save} disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Complete & Find Jobs"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
