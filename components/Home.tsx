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
  ExternalLink,
} from "lucide-react";

const data = [
  {
    title: "Personalized feed",
    description:
      "Every opportunity is scored against your skills, roles, location, work mode, and experience level.",
    icon: <Sparkles className="h-5 w-5 mb-4 text-brand" />,
  },
  {
    title: "Keep your shortlist",
    description: "Save promising roles and keep them available for 30 days.",
    icon: <Bookmark className="h-5 w-5 mb-4 text-brand" />,
  },
  {
    title: "Apply with confidence",
    description:
      "See why a role matches, then follow the original listing or company link to apply.",
    icon: <ExternalLink className="h-5 w-5 mb-4 text-brand" />,
  },
];

const Home = () => {
  const { user, isLoaded } = useUser();

  return (
    <div className="relative overflow-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 sm:px-6 lg:px-8">
        <main className="flex flex-1 flex-col items-center justify-center py-16">
          <div className="mx-auto max-w-5xl text-center space-y-3">
            <div className="my-6 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Personalized recommendations. Less noise.
            </div>

            <h1 className="text-balance font-[copper] text-7xl tracking-tight text-zinc-900 dark:text-white">
              Find work that{" "}
              <span className="text-brand italic">fits you.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Tell us what you want to do, where you want to work, and what you
              know. We&apos;ll rank opportunities from trusted job sources
              around your preferences.
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

          {/* Job sources */}
          <div className="my-12 space-y-6">
            <div className="py-3">
              <h2 className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Job sources
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {[
                {
                  name: "Remotive",
                  logo: "https://www.google.com/s2/favicons?domain=remotive.com&sz=128",
                  url: "https://remotive.com",
                },
                {
                  name: "Himalayas",
                  logo: "https://www.google.com/s2/favicons?domain=himalayas.app&sz=128",
                  url: "https://himalayas.app",
                }, 
                {
                  name: "Remote OK",
                  logo: "https://www.google.com/s2/favicons?domain=remoteok.com&sz=128",
                  url: "https://remoteok.com",
                },
                {
                  name: "Jobicy",
                  logo: "https://www.google.com/s2/favicons?domain=jobicy.com&sz=128",
                  url: "https://jobicy.com",
                },
              ].map((source) => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 hover:opacity-100 hover:grayscale-0 transition-all duration-200"
                >
                  <img
                    src={source.logo}
                    alt={`${source.name} logo`}
                    className="h-7 w-7 object-contain"
                  />
                  <span className="text-sm font-semibold tracking-tight text-zinc-700 hover:text-neutral-500 dark:text-zinc-300 font-[copper]">
                    {source.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <section className="py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.map((item) => {
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.title}
                    className="border bg-neutral-100 border-zinc-200 dark:border-zinc-800 rounded-sm p-6"
                  >
                    {IconComponent}
                    <h3 className="text-base font-medium mb-2 font-[copper]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
