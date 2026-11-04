import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function getPrimaryEmail(clerkUser: Awaited<ReturnType<typeof currentUser>>) {
  if (!clerkUser) return null;

  return (
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress
  );
}

export async function getAuthenticatedUser() {
  const { userId } = await auth();

  if (!userId) return null;

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true },
  });

  if (existingUser) {
    if (!existingUser.profile) {
      await prisma.profile.upsert({
        where: { userId: existingUser.id },
        update: {},
        create: {
          userId: existingUser.id,
          fullName: existingUser.name,
          email: existingUser.email,
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });
    }

    return prisma.user.findUnique({
      where: { id: existingUser.id },
      include: { profile: true },
    });
  }

  const clerkUser = await currentUser();
  const email = getPrimaryEmail(clerkUser);

  if (!clerkUser || !email) {
    throw new Error("Authenticated Clerk user has no email address.");
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

  const userByEmail = await prisma.user.findUnique({ where: { email } });
  let user;

  if (userByEmail) {
    user = await prisma.user.update({
      where: { id: userByEmail.id },
      data: userData,
    });
  } else {
    try {
      user = await prisma.user.create({
        data: {
          ...userData,
          authProvider: "google",
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) throw error;
    }
  }

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

  return prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
}
