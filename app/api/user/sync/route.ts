import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type SyncError = {
  error: string;
  status: 400 | 401 | 409;
};

type SyncedUser = {
  id: string;
  name: string | null;
  email: string;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

// Create the profile if it is missing, without overwriting existing data.
async function ensureProfile(user: SyncedUser) {
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
}

async function loadSyncedUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("Unable to load the synced user.");
  }

  return user;
}

async function syncUser(): Promise<SyncedUser | SyncError> {
  const { userId } = await auth();

  if (!userId) {
    return { error: "Unauthorized", status: 401 };
  }

  // Fast path: the user was already synced. Avoid an extra Clerk API request
  // so a Clerk hiccup cannot block the profile page for existing users.
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true },
  });

  if (existingUser) {
    if (!existingUser.profile) {
      await ensureProfile(existingUser);
    }

    return existingUser;
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    return { error: "Unauthorized", status: 401 };
  }

  // Use the primary email, not whichever address happens to be first.
  const email =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return { error: "No email", status: 400 };
  }

  const name =
    clerkUser.fullName ||
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

  const userData = {
    clerkId: userId,
    email,
    name,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  };

  // Link an existing account that was created before this Clerk identity.
  const userByEmail = await prisma.user.findUnique({ where: { email } });

  if (userByEmail) {
    // Do not take over an account that already belongs to another Clerk user.
    if (userByEmail.clerkId && userByEmail.clerkId !== userId) {
      return {
        error: "This email is already linked to another account.",
        status: 409,
      };
    }

    const user = await prisma.user.update({
      where: { id: userByEmail.id },
      data: userData,
    });

    await ensureProfile(user);

    return loadSyncedUser(user.id);
  }

  try {
    const user = await prisma.user.create({
      data: {
        ...userData,
        authProvider: "google",
      },
    });

    await ensureProfile(user);

    return loadSyncedUser(user.id);
  } catch (error) {
    // A concurrent request (for example, React Strict Mode or two open tabs)
    // may have created the same user between our read and write.
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      throw error;
    }

    await ensureProfile(user);

    return loadSyncedUser(user.id);
  }
}

async function handleSync() {
  try {
    const result = await syncUser();

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ user: result });
  } catch (error) {
    console.error("User sync error:", error);

    return NextResponse.json(
      { error: "Unable to sync your account. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return handleSync();
}

export async function GET() {
  return handleSync();
}
