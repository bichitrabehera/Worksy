"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MapPin,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Search,
} from "lucide-react";

const Home = () => {
  const { user, isLoaded } = useUser();

  return (
    <div className="relative overflow-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <main className="flex flex-1 flex-col items-center justify-center py-16">
          <div className="mx-auto max-w-5xl text-center space-y-3">
            <div className="my-6 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Rule-based matching. No noise.
            </div>

            <h1 className="text-balance font-[copper] text-7xl tracking-tight text-zinc-900 dark:text-white">
              Fresher jobs in{" "}
              <span className="text-brand italic">Bengaluru</span>, matched to
              you.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Go from resume to a shortlist of relevant openings in under 5
              minutes. Save roles, track applications, and skip the spam.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isLoaded && !user ? (
                <Link href="/sign-up">
                  <Button size="lg" className="group w-full sm:w-auto">
                    Sign up
                  </Button>
                </Link>
              ) : null}
              {isLoaded && user ? (
                <Link href="/jobs">
                  <Button size="lg" className="group w-full sm:w-auto">
                    View matched jobs
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              ) : null}
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
          </div>

          <section className="py-24 sm:pb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border bg-neutral-100 border-zinc-200 dark:border-zinc-800 rounded-sm p-6 ">
                <Search className="h-5 w-5 mb-4 text-brand" />
                <h3 className="text-base font-medium mb-2">
                  Personalized feed
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Jobs ranked based on your skills, role preferences, and
                  location
                </p>
              </div>

              <div className="border bg-neutral-100 border-zinc-200 dark:border-zinc-800 rounded-sm p-6 ">
                <Bookmark className="h-5 w-5 mb-4 text-brand" />
                <h3 className="text-base font-medium mb-2">Save for later</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Bookmark interesting opportunities and revisit them anytime
                </p>
              </div>
              <div className="border bg-neutral-100 border-zinc-200 dark:border-zinc-800 rounded-sm p-6 ">
                <ArrowRight className="h-5 w-5 mb-4 text-brand" />
                <h3 className="text-base font-medium mb-2">Apply directly</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Redirect to original job postings to apply on company websites
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
