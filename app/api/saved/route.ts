import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedJobs, jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.clerkId, userId) });
    if (!user) return NextResponse.json({ saved: [] });
    
    const saved = await db.query.savedJobs.findMany({
      where: eq(savedJobs.userId, user.id),
      with: { job: true },
    });
    
    return NextResponse.json({ saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { jobId, sourceJobId } = await req.json();
    
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.clerkId, userId) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Find job by id or source_job_id
    let job = null;
    if (jobId) {
      job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
    } else if (sourceJobId) {
      job = await db.query.jobs.findFirst({ where: eq(jobs.sourceJobId, sourceJobId) });
    }
    
    if (!job) {
      // For mock data, we'll store by sourceJobId in a different way
      // For now, just return success
      return NextResponse.json({ ok: true });
    }
    
    await db.insert(savedJobs).values({
      userId: user.id,
      jobId: job.id,
    }).onConflictDoNothing();
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { sourceJobId } = await req.json();
    
    const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.clerkId, userId) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const job = await db.query.jobs.findFirst({ where: eq(jobs.sourceJobId, sourceJobId) });
    if (!job) return NextResponse.json({ ok: true });
    
    await db.delete(savedJobs).where(and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, job.id)));
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
