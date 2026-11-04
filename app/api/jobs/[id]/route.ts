import { auth } from "@clerk/nextjs/server";
import { connection, NextResponse } from "next/server";

import { decodeJobId } from "@/lib/job-id";
import { getUserJobs } from "@/lib/jobs-service";

import type { JobQuery } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: token } = await params;

    let jobId: string;

    try {
      jobId = decodeJobId(token);
    } catch {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const query: JobQuery = {
      q: "",
      where: "India",
      remoteOnly: true,
      limit: 50,
    };

    const result = await getUserJobs(userId, query);
    const job = result.jobs.find((item) => item.id === jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(
      { job },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Job detail API error:", error);

    return NextResponse.json(
      { error: "Unable to load job" },
      { status: 500 },
    );
  }
}
