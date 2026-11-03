"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  BriefcaseBusiness,
  Code2,
  MapPin,
  UserRound,
  IndianRupee,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BRANCHES,
  DEGREES,
  EXPERIENCE_LEVELS,
  GRADUATION_YEARS,
  JOB_TYPES,
  LOCATIONS,
  QUALIFICATIONS,
  ROLES,
  SKILLS,
  WORK_MODES,
} from "@/lib/profile-options";

// --------------------------------------------------
// OPTIONS
// --------------------------------------------------

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
        <Icon className="size-4" />
      </div>

      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onValueChange,
  placeholder,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  items: string[];
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    currentLocation: "",

    college: "",
    university: "",
    qualification: "",
    degree: "",
    fieldOfStudy: "",
    major: "",
    graduationYear: new Date().getFullYear(),

    experienceLevel: "",

    skills: [] as string[],
    desiredJobRoles: [] as string[],
    jobTypes: ["Full-time"] as string[],
    preferredLocations: [] as string[],
    workMode: [] as string[],

    expectedSalaryMin: "",
    expectedSalaryMax: "",
    preferredExperienceLevel: "",
  });

  // --------------------------------------------------
  // CLERK USER SYNC
  // --------------------------------------------------

  useEffect(() => {
    if (!isLoaded || !user) return;

    let active = true;

    const syncAndCheckProfile = async () => {
      setForm((f) => ({
        ...f,
        fullName:
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
      }));

      try {
        const response = await fetch("/api/user/sync");
        const data = await response.json();

        if (!active) return;

        if (data.user?.profile?.onboardingCompleted) {
          router.replace("/jobs");
          return;
        }

        await fetch("/api/user/sync", { method: "POST" });
      } catch (error) {
        console.error(error);
      }
    };

    syncAndCheckProfile();

    return () => {
      active = false;
    };
  }, [isLoaded, user]);

  // --------------------------------------------------
  // TOGGLE HELPERS
  // --------------------------------------------------

  const toggleArrayValue = (
    key:
      | "skills"
      | "desiredJobRoles"
      | "jobTypes"
      | "preferredLocations"
      | "workMode",
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((item) => item !== value)
        : [...f[key], value],
    }));
  };

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const isSchoolLevel =
    form.qualification === "Class 10" || form.qualification === "Class 12";

  const canProceedStep1 = Boolean(
    form.fullName.trim() &&
    /^\d{10}$/.test(form.phoneNumber) &&
    form.currentLocation.trim() &&
    form.qualification &&
    (isSchoolLevel ||
      (form.college.trim() &&
        form.degree &&
        form.major &&
        form.graduationYear)),
  );

  const canProceedStep2 =
    form.desiredJobRoles.length > 0 && form.jobTypes.length > 0;

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const save = async () => {
    setLoading(true);
    setError("");

    try {
      const syncResponse = await fetch("/api/user/sync", { method: "POST" });
      if (!syncResponse.ok) {
        const result = await syncResponse.json().catch(() => null);
        throw new Error(result?.error || "Unable to sync your account.");
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,

          // Keep the legacy field populated for existing API consumers.
          fieldOfStudy: form.major,

          onboardingCompleted: true,
          onboardingStep: 3,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Unable to save your profile.");
      }

      router.push("/jobs");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader fullScreen />
      </div>
    );
  }

  // --------------------------------------------------
  // SELECTION BUTTON
  // --------------------------------------------------

  const SelectionButton = ({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "outline"}
      className="h-9 gap-1.5"
      onClick={onClick}
    >
      {selected && <Check className="size-3.5" />}
      {label}
    </Button>
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-7">
        {/* HEADER */}

        <div className="space-y-3 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border bg-background">
            <UserRound className="size-5" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Complete your profile
          </h1>

          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Tell us about yourself to get relevant job and internship
            recommendations.
          </p>

          <div className="mx-auto max-w-sm pt-3">
            <Progress value={(step / 3) * 100}>
              <ProgressLabel>Profile completion</ProgressLabel>
              <ProgressValue />
            </Progress>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Step {step} of 3</span>
              <span>{Math.round((step / 3) * 100)}% completed</span>
            </div>
          </div>
        </div>

        {/* STEP 1 */}

        {step === 1 && (
          <Card>
            <CardHeader>
              <SectionHeading
                icon={UserRound}
                title="Personal & Education"
                description="Your basic details and educational background."
              />
            </CardHeader>

            <CardContent className="space-y-6">
              {/* PERSONAL DETAILS */}

              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Personal information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" required>
                    <Input
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                    />
                  </FormField>

                  <FormField label="Email address">
                    <Input type="email" value={form.email} disabled />
                  </FormField>

                  <FormField label="Phone number" required>
                    <div className="flex">
                      <div className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                        +91
                      </div>

                      <Input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        className="rounded-l-none"
                        value={form.phoneNumber}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phoneNumber: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          })
                        }
                      />
                    </div>
                  </FormField>

                  <FormField label="Current city" required>
                    <Input
                      placeholder="e.g. Bengaluru, Mysuru"
                      value={form.currentLocation}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currentLocation: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
              </section>

              <div className="border-t" />

              {/* EDUCATION */}

              <section className="space-y-4">
                <SectionHeading
                  icon={GraduationCap}
                  title="Education"
                  description="Tell us about your current or highest qualification."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Qualification" required>
                    <SelectField
                      value={form.qualification}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          qualification: value,
                          college: "",
                          university: "",
                          degree: "",
                          major: "",
                          fieldOfStudy: "",
                        })
                      }
                      placeholder="Select qualification"
                      items={QUALIFICATIONS}
                    />
                  </FormField>

                  {!isSchoolLevel && (
                    <FormField label="Degree" required>
                      <SelectField
                        value={form.degree}
                        onValueChange={(value) =>
                          setForm({ ...form, degree: value })
                        }
                        placeholder="Select degree"
                        items={
                          form.qualification === "Diploma"
                            ? ["Diploma", "Other"]
                            : form.qualification === "Postgraduate"
                              ? DEGREES.filter((d) =>
                                  [
                                    "M.E.",
                                    "M.Tech",
                                    "MCA",
                                    "M.Sc",
                                    "M.Com",
                                    "MBA",
                                    "MA",
                                    "PhD",
                                    "Other",
                                  ].includes(d),
                                )
                              : form.qualification === "Doctorate"
                                ? ["PhD", "Other"]
                                : form.qualification === "Undergraduate"
                                  ? DEGREES.filter((d) =>
                                      [
                                        "B.E.",
                                        "B.Tech",
                                        "BCA",
                                        "B.Sc",
                                        "B.Com",
                                        "BBA",
                                        "BA",
                                        "B.Des",
                                        "B.Arch",
                                        "MBBS",
                                        "LLB",
                                        "Other",
                                      ].includes(d),
                                    )
                                  : DEGREES
                        }
                      />
                    </FormField>
                  )}

                  {!isSchoolLevel && (
                    <>
                      <FormField label="College / Institution" required>
                        <Input
                          placeholder="Enter institution name"
                          value={form.college}
                          onChange={(e) =>
                            setForm({ ...form, college: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label="Affiliated university">
                        <Input
                          placeholder="e.g. VTU, Bangalore University"
                          value={form.university}
                          onChange={(e) =>
                            setForm({ ...form, university: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label="Branch / Specialization" required>
                        <SelectField
                          value={form.major}
                          onValueChange={(value) =>
                            setForm({
                              ...form,
                              major: value,
                              fieldOfStudy: value,
                            })
                          }
                          placeholder="Select branch"
                          items={BRANCHES}
                        />
                      </FormField>
                    </>
                  )}

                  <FormField label="Graduation / Passing year" required>
                    <SelectField
                      value={String(form.graduationYear)}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          graduationYear: Number(value),
                        })
                      }
                      placeholder="Select year"
                      items={GRADUATION_YEARS}
                    />
                  </FormField>
                </div>
              </section>

              <div className="border-t" />

              {/* EXPERIENCE */}

              <section className="space-y-3">
                <SectionHeading
                  icon={BriefcaseBusiness}
                  title="Experience level"
                  description="Select the option that best describes your current status."
                />

                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectionButton
                      key={level}
                      label={level}
                      selected={form.experienceLevel === level}
                      onClick={() =>
                        setForm({ ...form, experienceLevel: level })
                      }
                    />
                  ))}
                </div>
              </section>

              <Button
                className="w-full"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Continue
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <Card>
            <CardHeader>
              <SectionHeading
                icon={BriefcaseBusiness}
                title="Job preferences"
                description="Choose the roles and opportunities you're interested in."
              />
            </CardHeader>

            <CardContent className="space-y-6">
              {/* JOB ROLES */}

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    Desired job roles{" "}
                    <span className="text-destructive">*</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select all roles that match your interests.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <SelectionButton
                      key={role}
                      label={role}
                      selected={form.desiredJobRoles.includes(role)}
                      onClick={() => toggleArrayValue("desiredJobRoles", role)}
                    />
                  ))}
                </div>
              </section>

              <div className="border-t" />

              {/* JOB TYPES */}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Employment type <span className="text-destructive">*</span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <SelectionButton
                      key={type}
                      label={type}
                      selected={form.jobTypes.includes(type)}
                      onClick={() => toggleArrayValue("jobTypes", type)}
                    />
                  ))}
                </div>
              </section>

              <div className="border-t" />

              {/* LOCATIONS */}

              <section className="space-y-3">
                <SectionHeading
                  icon={MapPin}
                  title="Preferred locations"
                  description="Select the cities where you would like to work."
                />

                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((location) => (
                    <SelectionButton
                      key={location}
                      label={location}
                      selected={form.preferredLocations.includes(location)}
                      onClick={() =>
                        toggleArrayValue("preferredLocations", location)
                      }
                    />
                  ))}
                </div>
              </section>

              <div className="border-t" />

              {/* WORK MODE */}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Work mode</h3>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((mode) => (
                    <SelectionButton
                      key={mode}
                      label={mode}
                      selected={form.workMode.includes(mode)}
                      onClick={() => toggleArrayValue("workMode", mode)}
                    />
                  ))}
                </div>
              </section>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>

                <Button
                  className="flex-1"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                >
                  Continue
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 */}

        {step === 3 && (
          <Card>
            <CardHeader>
              <SectionHeading
                icon={Code2}
                title="Skills & compensation"
                description="Highlight your skills and optionally share your salary expectations."
              />
            </CardHeader>

            <CardContent className="space-y-6">
              {/* SKILLS */}

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Technical skills</h3>
                  <p className="text-xs text-muted-foreground">
                    Select the technologies and tools you know.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <SelectionButton
                      key={skill}
                      label={skill}
                      selected={form.skills.includes(skill)}
                      onClick={() => toggleArrayValue("skills", skill)}
                    />
                  ))}
                </div>
              </section>

              <div className="border-t" />

              {/* PREFERRED EXPERIENCE */}

              <section className="space-y-3">
                <FormField label="Preferred experience level">
                  <SelectField
                    value={form.preferredExperienceLevel}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        preferredExperienceLevel: value,
                      })
                    }
                    placeholder="Any experience level"
                    items={EXPERIENCE_LEVELS}
                  />
                </FormField>
                <p className="text-xs text-muted-foreground">
                  Leave this empty if you're open to opportunities at any level.
                </p>
              </section>

              <div className="border-t" />

              {/* SALARY */}

              <section className="space-y-3">
                <SectionHeading
                  icon={IndianRupee}
                  title="Expected CTC"
                  description="Annual compensation expectation in lakhs per annum (LPA)."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Minimum CTC (LPA)">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 3.5"
                      value={form.expectedSalaryMin}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          expectedSalaryMin: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Maximum CTC (LPA)">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 6"
                      value={form.expectedSalaryMax}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          expectedSalaryMax: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <p className="text-xs text-muted-foreground">
                  Optional. Freshers and students can leave this blank.
                </p>
              </section>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>

                <Button className="flex-1" disabled={loading} onClick={save}>
                  {loading ? (
                    <>
                      <Loader className="mr-2 size-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete profile
                      <Check className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Your information helps us find relevant opportunities for you.
        </p>
      </div>
    </div>
  );
}
