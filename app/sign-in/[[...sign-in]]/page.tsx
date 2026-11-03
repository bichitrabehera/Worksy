import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/components/ui/loader";

export default async function Page() {
  const { userId } = await auth();
  if (userId) redirect("/jobs");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <Suspense fallback={<Loader fullScreen />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
