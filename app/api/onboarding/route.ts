import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const user = await db.query.users.findFirst({ 
      where: eq(users.clerkId, userId),
      with: { profile: true }
    });
    
    if (!user || !user.profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    return NextResponse.json({ profile: user.profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const body = await req.json();
    
    const user = await db.query.users.findFirst({ 
      where: eq(users.clerkId, userId),
    });
    
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const [profile] = await db.update(profiles)
      .set({
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        currentLocation: body.currentLocation,
        college: body.college,
        university: body.university,
        degree: body.degree,
        fieldOfStudy: body.fieldOfStudy,
        major: body.major,
        graduationYear: body.graduationYear ? parseInt(body.graduationYear) : null,
        experienceLevel: body.experienceLevel,
        skills: body.skills || [],
        resumeUrl: body.resumeUrl,
        desiredJobRoles: body.desiredJobRoles || body.preferredRoles || [],
        preferredRoles: body.preferredRoles || body.desiredJobRoles || [],
        jobTypes: body.jobTypes || body.jobTypePreference || [],
        jobTypePreference: body.jobTypePreference || body.jobTypes || ["Full-time"],
        preferredLocations: body.preferredLocations || [],
        locationPreference: body.locationPreference,
        workMode: body.workMode || [],
        expectedSalaryMin: body.expectedSalaryMin ? parseInt(body.expectedSalaryMin) : null,
        expectedSalaryMax: body.expectedSalaryMax ? parseInt(body.expectedSalaryMax) : null,
        salaryMin: body.salaryMin ? parseInt(body.salaryMin) : null,
        salaryMax: body.salaryMax ? parseInt(body.salaryMax) : null,
        preferredExperienceLevel: body.preferredExperienceLevel,
        onboardingCompleted: body.onboardingCompleted || false,
        onboardingStep: body.onboardingStep || 0,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id))
      .returning();
    
    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
