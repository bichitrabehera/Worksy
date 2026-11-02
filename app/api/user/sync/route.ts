import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });
    
    // Check if user exists
    let user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    
    if (!user) {
      // Create user
      const [newUser] = await db.insert(users).values({
        clerkId: userId,
        email,
        name: clerkUser.fullName || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        authProvider: "google",
      }).returning();
      user = newUser;
      
      // Create profile
      await db.insert(profiles).values({
        userId: user.id,
        fullName: user.name,
        email: user.email,
        onboardingCompleted: false,
        onboardingStep: 0,
      });
    }
    
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const user = await db.query.users.findFirst({ 
      where: eq(users.clerkId, userId),
      with: { profile: true }
    });
    
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
