import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

import { DEFAULT_JOB_QUERY, getUserJobsPage } from "@/lib/jobs-service";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 120;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1, Math.floor(parsed));
}

export async function GET(req: NextRequest) {
  await connection();

  try {
    // 1. Authenticate using Clerk.
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read and bound pagination parameters. Paging is applied to the already
    // ranked feed, so a request only pays for the page it returns.
    const sp = req.nextUrl.searchParams;

    const page = parsePositiveInt(sp.get("page"), 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      parsePositiveInt(sp.get("limit"), DEFAULT_PAGE_SIZE),
    );

    // 3. Search and filters are matched against the ranked feed.
    const searchQuery = (sp.get("q") ?? "")
      .trim()
      .slice(0, MAX_SEARCH_LENGTH)
      .toLowerCase();
    const jobType = (sp.get("jobType") ?? "").trim().toLowerCase();
    const workMode = (sp.get("workMode") ?? "").trim().toLowerCase();

    // 4. Get only the requested page.
    const result = await getUserJobsPage(userId, DEFAULT_JOB_QUERY, {
      page,
      pageSize,
      searchQuery,
      jobType,
      workMode,
    });

    const nextPage = result.hasMore ? result.page + 1 : null;
    const previousPage = result.hasPrevious ? result.page - 1 : null;

    // 5. Return the page plus explicit pagination metadata. The flat fields are
    // kept for existing callers; `pagination` is the documented contract.
    return NextResponse.json(
      {
        jobs: result.jobs,

        // Current page information
        count: result.jobs.length,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,

        // Complete collection information
        totalCount: result.totalCount,
        matchedCount: result.totalCount,
        totalPages: result.totalPages,

        pagination: {
          page: result.page,
          limit: result.pageSize,
          returned: result.jobs.length,
          total: result.totalCount,
          totalPages: result.totalPages,
          hasNextPage: result.hasMore,
          hasPreviousPage: result.hasPrevious,
          nextPage,
          previousPage,
        },

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
