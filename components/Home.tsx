import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles, CheckCircle2 } from "lucide-react";

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
      {/* Grid backdrop */}
      <div aria-hidden />
      {/* Soft gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-200/50 via-purple-100/30 to-transparent blur-3xl dark:from-indigo-900/30 dark:via-purple-900/20"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center py-16">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Rule-based matching. No noise.
            </div>

            <h1 className="text-balance text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
              Fresher jobs in{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                Bengaluru
              </span>
              , matched to you.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Go from resume to a shortlist of relevant openings in under 5
              minutes. Save roles, track applications, and skip the spam.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="group w-full sm:w-auto">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Browse jobs
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-500">
              {["Free to start", "No recruiter spam", "Save & track"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Product preview card */}
          <div className="mt-16 w-full max-w-3xl">
            <div className="rounded-2xl border border-zinc-200 bg-white/60 p-1.5 shadow-2xl shadow-zinc-900/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="rounded-xl border border-zinc-200/70 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  </div>
                  <span className="text-xs text-zinc-400">Your matches</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    {
                      role: "Frontend Developer",
                      company: "Zoho",
                      tag: "React",
                    },
                    {
                      role: "Backend Engineer",
                      company: "Razorpay",
                      tag: "Node",
                    },
                    { role: "Data Analyst", company: "Swiggy", tag: "SQL" },
                  ].map((job) => (
                    <div
                      key={job.role}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {job.role}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {job.company} · Bengaluru
                        </p>
                      </div>
                      <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {job.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
