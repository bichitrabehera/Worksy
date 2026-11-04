import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { getAuthenticatedUser } from "@/lib/current-user";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: user.profile,
    });
  } catch (error) {
    console.error("Profile GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = user.clerkId;

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        currentLocation: body.currentLocation,
        college: body.college,
        university: body.university,
        qualification: body.qualification,
        degree: body.degree,
        fieldOfStudy: body.fieldOfStudy,
        major: body.major,

        graduationYear: body.graduationYear
          ? Number(body.graduationYear)
          : null,

        experienceLevel: body.experienceLevel,
        skills: body.skills || [],
        resumeUrl: body.resumeUrl,

        desiredJobRoles: body.desiredJobRoles || body.preferredRoles || [],

        preferredRoles: body.preferredRoles || body.desiredJobRoles || [],

        jobTypes: body.jobTypes || body.jobTypePreference || [],

        jobTypePreference: body.jobTypePreference ||
          body.jobTypes || ["Full-time"],

        preferredLocations: body.preferredLocations || [],
        locationPreference: body.locationPreference,
        workMode: body.workMode || [],

        expectedSalaryMin: body.expectedSalaryMin
          ? Number(body.expectedSalaryMin)
          : null,

        expectedSalaryMax: body.expectedSalaryMax
          ? Number(body.expectedSalaryMax)
          : null,

        salaryMin: body.salaryMin ? Number(body.salaryMin) : null,

        salaryMax: body.salaryMax ? Number(body.salaryMax) : null,

        preferredExperienceLevel: body.preferredExperienceLevel,

        onboardingCompleted: body.onboardingCompleted ?? false,
        onboardingStep: body.onboardingStep ?? 0,

        updatedAt: new Date(),
      },
    });

    // Invalidate ONLY this user's personalized jobs cache.
    try {
      await redis.del(`jobs:user:${userId}:feed:India:all`);

      console.log(`Invalidated jobs cache for ${userId}`);
    } catch (redisError) {
      console.error("Redis cache invalidation failed:", redisError);
    }

    return NextResponse.json({
      success: true,
      profile,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile POST error:", error);

    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
