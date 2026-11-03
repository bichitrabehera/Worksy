import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import redis from "@/lib/redis";

const SAVED_JOB_TTL = 30 * 24 * 60 * 60;

type SavedJobData = {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string[];
  description: string;
  requirements?: string;
  jobType?: string;
  workMode: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  url: string;
  source: string;
  postedAt: string;
  experienceRequired?: string;
};

const indexKey = (userId: string) => `saved-jobs:user:${userId}:index`;
const jobKey = (userId: string, jobId: string) =>
  `saved-jobs:user:${userId}:job:${encodeURIComponent(jobId)}`;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ids = await redis.smembers<string[]>(indexKey(userId));
    const entries = await Promise.all(
      ids.map(async (id) => ({
        id,
        job: await redis.get<SavedJobData>(jobKey(userId, id)),
      })),
    );
    const expiredIds = entries.filter(({ job }) => !job).map(({ id }) => id);
    if (expiredIds.length) {
      await redis.srem(indexKey(userId), ...expiredIds);
    }

    return NextResponse.json({
      saved: entries
        .filter((entry): entry is { id: string; job: SavedJobData } =>
          Boolean(entry.job),
        )
        .map((entry) => entry.job),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const job = body.job as SavedJobData | undefined;
    if (!job?.id || !job.title || !job.company || !job.url) {
      return NextResponse.json(
        { error: "A valid job is required." },
        { status: 400 },
      );
    }

    await redis.set(jobKey(userId, job.id), JSON.stringify(job), {
      ex: SAVED_JOB_TTL,
    });
    await redis.sadd(indexKey(userId), job.id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sourceJobId } = await req.json();
    if (!sourceJobId || typeof sourceJobId !== "string") {
      return NextResponse.json(
        { error: "A job id is required." },
        { status: 400 },
      );
    }

    await redis.del(jobKey(userId, sourceJobId));
    await redis.srem(indexKey(userId), sourceJobId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
