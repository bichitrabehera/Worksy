import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <main className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Bengaluru Fresher Jobs</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Go from resume/profile to a shortlist of relevant fresher jobs in under 5 minutes. Rule-based matching, save & track.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup"><Button size="lg">Get Started</Button></Link>
          <Link href="/jobs"><Button size="lg" variant="outline">Browse Jobs</Button></Link>
        </div>
      </main>
    </div>
  );
}
