import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import jobsData from "@/data/jobs.json";
import { sql } from "drizzle-orm";

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function makeDedupKey(company: string, title: string, locations: string[], applyUrl: string) {
  const c = normalize(company);
  const t = normalize(title);
  const loc = locations.map(normalize).sort().join("|");
  const u = normalize(applyUrl);
  return `${c}::${t}::${loc}::${u}`;
}

export async function POST() {
  try {
    let inserted = 0;
    for (const j of jobsData as any[]) {
      const companyNormalized = normalize(j.company);
      const locationNormalized = (j.location || []).map((l: string) => normalize(l));
      const applyUrlNormalized = normalize(j.apply_url);
      const dedupKey = makeDedupKey(j.company, j.title, j.location || [], j.apply_url);
      try {
        await db
          .insert(jobs)
          .values({
            source: j.source,
            sourceJobId: j.source_job_id,
            title: j.title,
            company: j.company,
            companyNormalized,
            location: j.location,
            locationNormalized,
            description: j.description,
            requirements: j.requirements || null,
            jobType: j.job_type || "Full-time",
            workMode: j.work_mode || "Unknown",
            experienceRequired: j.experience_required || null,
            salaryRange: j.salary_range || null,
            salaryMin: j.salary_min || null,
            salaryMax: j.salary_max || null,
            applyUrl: j.apply_url,
            applyUrlNormalized,
            postedDate: j.posted_date ? new Date(j.posted_date) : null,
            isActive: true,
            dedupKey,
          })
          .onConflictDoNothing();
        inserted++;
      } catch (e) {
        // ignore duplicates
      }
    }
    return NextResponse.json({ ok: true, inserted });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, count: (jobsData as any[]).length });
}
