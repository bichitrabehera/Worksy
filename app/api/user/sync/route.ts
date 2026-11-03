import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function syncUser() {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { error: "No email", status: 400 as const };
  }

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      email,
      name:
        clerkUser.fullName ||
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
    create: {
        clerkId: userId,
        email,
        name:
          clerkUser.fullName ||
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        authProvider: "google",
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: user.name,
      email: user.email,
      onboardingCompleted: false,
      onboardingStep: 0,
    },
  });

  const syncedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!syncedUser) {
    throw new Error("Unable to load the synced user.");
  }

  return syncedUser;
}

export async function POST() {
  try {
    const result = await syncUser();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ user: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncUser();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ user: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
