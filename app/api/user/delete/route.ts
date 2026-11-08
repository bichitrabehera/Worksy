import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();

    // Remove local application data first. Clerk and the application database
    // cannot be deleted atomically, so the database is cleaned up before
    // revoking the Clerk identity: if Clerk deletion fails, the user can still
    // sign in and retry instead of being locked out of an empty account.
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    await client.users.deleteUser(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: "Unable to delete your account." },
      { status: 500 },
    );
  }
}
