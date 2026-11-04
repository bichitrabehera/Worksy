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
    await client.users.deleteUser(userId);

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: "Unable to delete your account." },
      { status: 500 },
    );
  }
}
