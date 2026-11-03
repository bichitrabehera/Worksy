import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/components/ui/loader";

async function SignInContent() {
  const { userId } = await auth();

  if (userId) redirect("/jobs");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <SignIn />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader fullScreen />}>
      <SignInContent />
    </Suspense>
  );
}
