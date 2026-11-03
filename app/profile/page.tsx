"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Loader from "@/components/ui/loader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

type ArrayField =
  | "skills"
  | "desiredJobRoles"
  | "jobTypes"
  | "preferredLocations"
  | "workMode";

type Profile = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  currentLocation?: string;
  college?: string;
  university?: string;
  degree?: string;
  qualification?: string;
  fieldOfStudy?: string;
  major?: string;
  graduationYear?: number | string;
  experienceLevel?: string;
  skills: string[];
  desiredJobRoles: string[];
  jobTypes: string[];
  preferredLocations: string[];
  workMode: string[];
  [key: string]: unknown;
};

const EMPTY_PROFILE: Profile = {
  skills: [],
  desiredJobRoles: [],
  jobTypes: ["Full-time"],
  preferredLocations: [],
  workMode: [],
};

export default function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [initialProfile, setInitialProfile] = useState<Profile>(EMPTY_PROFILE);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/user/sync");

        if (!response.ok) {
          throw new Error("Failed to load profile.");
        }

        const data = await response.json();

        if (!active) return;

        const savedProfile = data.user?.profile;

        if (savedProfile) {
          const normalized: Profile = {
            ...EMPTY_PROFILE,
            ...savedProfile,
            skills: Array.isArray(savedProfile.skills)
              ? savedProfile.skills
              : [],
            desiredJobRoles: Array.isArray(savedProfile.desiredJobRoles)
              ? savedProfile.desiredJobRoles
              : [],
            jobTypes: Array.isArray(savedProfile.jobTypes)
              ? savedProfile.jobTypes
              : ["Full-time"],
            preferredLocations: Array.isArray(savedProfile.preferredLocations)
              ? savedProfile.preferredLocations
              : [],
            workMode: Array.isArray(savedProfile.workMode)
              ? savedProfile.workMode
              : [],
          };

          setProfile(normalized);
          setInitialProfile(normalized);
        }
      } catch (err) {
        console.error(err);
        if (active) setError("Unable to load your profile.");
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleOption = (field: ArrayField, value: string) => {
    setProfile((prev) => {
      const current = prev[field];

      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const cancelEditing = () => {
    setProfile(initialProfile);
    setEditing(false);
    setError("");
  };

  const save = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          fieldOfStudy: profile.major || profile.fieldOfStudy,
          qualification: profile.qualification,
          onboardingCompleted: true,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile.");
      }

      setInitialProfile(profile);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    setError("");

    try {
      const response = await fetch("/api/user/delete", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete your account.");
      }

      localStorage.removeItem("savedJobs");
      await signOut({ redirectUrl: "/" });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to delete your account.",
      );
      setDeletingAccount(false);
    }
  };

  const renderOptions = (field: ArrayField, options: string[]) => {
    const selected = profile[field];

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              disabled={!editing}
              aria-pressed={isSelected}
              onClick={() => toggleOption(field, option)}
              className="h-8 rounded-md text-xs"
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderField = (
    label: string,
    value: string | number | undefined,
    field: string,
  ) => (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value ?? ""}
        disabled={!editing}
        className="h-9"
        onChange={(event) => updateField(field, event.target.value)}
      />
    </div>
  );

  const renderSelect = (
    label: string,
    value: string | number | undefined,
    options: string[],
    field: string,
  ) => (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value === undefined ? "" : String(value)}
        onValueChange={(nextValue) => updateField(field, nextValue ?? "")}
        disabled={!editing}
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );

  if (loadingProfile) {
    return <Loader fullScreen />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight font-[copper]">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal information and job preferences.
          </p>
        </div>

        {!editing ? (
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setEditing(true);
            }}
          >
            Edit profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button size="sm" onClick={save} disabled={loading}>
              {loading ? <Loader className="size-4" /> : "Save changes"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Personal information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Full name</Label>
              <Input
                value={profile.fullName || user?.fullName || ""}
                disabled
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Email address
              </Label>
              <Input
                value={
                  profile.email || user?.primaryEmailAddress?.emailAddress || ""
                }
                disabled
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label
                className="text-xs text-muted-foreground"
                htmlFor="phoneNumber"
              >
                Phone number
              </Label>
              <Input
                id="phoneNumber"
                value={profile.phoneNumber || ""}
                disabled={!editing}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="Enter phone number"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="currentLocation"
                className="text-xs text-muted-foreground"
              >
                Current location
              </Label>
              <Input
                id="currentLocation"
                value={profile.currentLocation || ""}
                disabled={!editing}
                onChange={(e) => updateField("currentLocation", e.target.value)}
                placeholder="City, State"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderSelect(
              "Qualification",
              profile.qualification,
              QUALIFICATIONS,
              "qualification",
            )}
            {renderField("College", profile.college, "college")}
            {renderField("University", profile.university, "university")}
            {renderSelect("Degree", profile.degree, DEGREES, "degree")}
            {renderSelect(
              "Branch / specialization",
              profile.major || profile.fieldOfStudy,
              BRANCHES,
              "major",
            )}
            {renderSelect(
              "Graduation year",
              profile.graduationYear,
              GRADUATION_YEARS,
              "graduationYear",
            )}
            {renderSelect(
              "Experience level",
              profile.experienceLevel,
              EXPERIENCE_LEVELS,
              "experienceLevel",
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job preferences</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Desired roles</h3>
              <p className="text-xs text-muted-foreground">
                Select the roles you want to work in.
              </p>
            </div>

            {renderOptions("desiredJobRoles", ROLES)}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Job type</h3>
              <p className="text-xs text-muted-foreground">
                Select your preferred employment types.
              </p>
            </div>

            {renderOptions("jobTypes", JOB_TYPES)}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Work mode</h3>
              <p className="text-xs text-muted-foreground">
                Where would you prefer to work?
              </p>
            </div>

            {renderOptions("workMode", WORK_MODES)}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Preferred locations</h3>
              <p className="text-xs text-muted-foreground">
                Select the cities where you are open to working.
              </p>
            </div>

            {renderOptions("preferredLocations", LOCATIONS)}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Skills</h3>
              <p className="text-xs text-muted-foreground">
                Select your technical and professional skills.
              </p>
            </div>

            {renderOptions("skills", SKILLS)}
          </div>
        </CardContent>
      </Card>

      {/* Bottom save actions */}
      {editing && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cancelEditing} disabled={loading}>
            Cancel
          </Button>

          <Button onClick={save} disabled={loading}>
            {loading ? <Loader className="size-4" /> : "Save changes"}
          </Button>
        </div>
      )}

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account, profile, saved jobs, and
              application data.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" disabled={deletingAccount} />
              }
            >
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your profile, saved jobs, and
                application data. This action cannot be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel
                  render={<Button variant="outline" />}
                  disabled={deletingAccount}
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Delete account"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
