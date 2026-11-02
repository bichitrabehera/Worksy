"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const SKILLS = ["Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "C++", "HTML", "CSS"];
const ROLES = ["Software Engineer", "Frontend Developer", "Backend Developer", "Data Analyst", "QA Engineer", "Product Support"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    degree: "",
    major: "",
    graduationYear: new Date().getFullYear(),
    college: "",
    skills: [] as string[],
    preferredRoles: [] as string[],
    locationPreference: "Bengaluru",
    jobTypePreference: ["Full-time"],
  });

  const toggleSkill = (s: string) => {
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));
  };

  const toggleRole = (r: string) => {
    setForm((f) => ({ ...f, preferredRoles: f.preferredRoles.includes(r) ? f.preferredRoles.filter((x) => x !== r) : [...f.preferredRoles, r] }));
  };

  const save = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("profile", JSON.stringify({ ...form, onboardingCompleted: true }));
    }
    router.push("/jobs");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold">Complete your profile</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Takes less than 2 minutes</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Degree (e.g., B.Tech, B.E.)" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
              <Input placeholder="Major/Branch (e.g., Computer Science)" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} />
              <Input type="number" placeholder="Graduation Year" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) })} />
              <Input placeholder="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              <Button onClick={() => setStep(2)} className="w-full">
                Next
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <Button key={s} variant={form.skills.includes(s) ? "default" : "outline"} size="sm" onClick={() => toggleSkill(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm mb-2 font-medium">Preferred Roles</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <Button key={r} variant={form.preferredRoles.includes(r) ? "default" : "outline"} size="sm" onClick={() => toggleRole(r)}>
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={save} className="flex-1">
                  Find Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
