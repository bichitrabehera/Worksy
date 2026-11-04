import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

import { truncateDescription } from "@/lib/job-display";
import { getUserJobs } from "@/lib/jobs-service";

import type { JobQuery } from "@/lib/types";

export async function GET(req: NextRequest) {
  await connection();
  try {
    // 1. Authenticate using Clerk.
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read pagination parameters.
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(sp.get("limit")) || 50));

    // 3. Build job query.
    const searchQuery = sp.get("q")?.trim().toLowerCase() || "";
    const query: JobQuery = {
      q: "",
      where: sp.get("where") ?? "India",
      remoteOnly: true,
      limit: 50,
    };
    const jobType = sp.get("jobType")?.trim().toLowerCase() || "";
    const workMode = sp.get("workMode")?.trim().toLowerCase() || "";

    // 4. Get the user's cached feed, or fetch and personalize it.
    const result = await getUserJobs(userId, query);

    // 5. Apply search and filters after matching and ranking.
    const allJobs = result.jobs.filter((job) => {
      const searchableText = [
        job.title,
        job.company,
        job.description,
        job.requirements,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchQuery || searchableText.includes(searchQuery);
      const matchesJobType =
        !jobType || job.jobType?.trim().toLowerCase() === jobType;
      const matchesWorkMode =
        !workMode || job.workMode?.trim().toLowerCase() === workMode;

      return matchesSearch && matchesJobType && matchesWorkMode;
    });

    const start = (page - 1) * pageSize;

    // 6. Keep the cached descriptions complete, but send a short preview to the
    // feed. The job detail page requests the full description.
    const finalJobs = allJobs
      .slice(start, start + pageSize)
      .map((job) => ({
        ...job,
        description: truncateDescription(job.description),
      }));

    const totalCount = allJobs.length;
    const matchedCount = allJobs.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // 7. Return only the requested page.
    return NextResponse.json(
      {
        jobs: finalJobs,

        // Current page information
        count: finalJobs.length,
        page,
        pageSize,
        hasMore: start + pageSize < totalCount,

        // Complete collection information
        totalCount,
        matchedCount,
        totalPages,

        // Provider information
        sources: result.sources,
        errors: result.errors.length ? result.errors : undefined,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Jobs API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load jobs",
      },
      {
        status: 500,
      },
    );
  }
}
