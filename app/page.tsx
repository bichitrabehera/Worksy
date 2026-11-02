import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Bookmark } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  
  if (userId) {
    redirect("/jobs");
  }
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-black dark:text-white leading-[1.1]">
              Discover opportunities that match you
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
              A clean, minimal job discovery platform. Get personalized recommendations based on your profile and apply directly on company websites.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto h-11 px-6">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-11 px-6">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-24 sm:pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <Search className="h-5 w-5 mb-4 text-zinc-900 dark:text-zinc-100" />
              <h3 className="text-base font-medium mb-2">Personalized feed</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Jobs ranked based on your skills, role preferences, and location
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <Bookmark className="h-5 w-5 mb-4 text-zinc-900 dark:text-zinc-100" />
              <h3 className="text-base font-medium mb-2">Save for later</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Bookmark interesting opportunities and revisit them anytime
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <ArrowRight className="h-5 w-5 mb-4 text-zinc-900 dark:text-zinc-100" />
              <h3 className="text-base font-medium mb-2">Apply directly</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Redirect to original job postings to apply on company websites
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
