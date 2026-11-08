import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 lg:px-12">
        <p className="mb-4 text-sm font-medium text-brand">About Worksy</p>
        <h1 className="font-[copper] text-4xl tracking-tight sm:text-5xl">
          Make your next move easier.
        </h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          <p>
            Worksy helps students, freshers, and job seekers discover relevant
            opportunities without the noise. We bring remote roles from trusted
            job sources into one focused place.
          </p>
          <p>
            Save roles you want to revisit, build your profile, and spend more
            time preparing for the opportunities that fit you.
          </p>
        </div>
        <Link
          href="/jobs"
          className="mt-10 inline-flex rounded-md bg-brand px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Explore jobs
        </Link>
      </div>
    </main>
  );
}
