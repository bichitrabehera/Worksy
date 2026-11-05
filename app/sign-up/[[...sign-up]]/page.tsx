
import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loader from "@/components/ui/loader";

async function SignUpContent() {
  const { userId } = await auth();

  if (userId) redirect("/jobs");

  return <SignUp />;
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<Loader fullScreen />}>
     
        <div className="flex h-full min-h-screen items-center justify-center">
       <SignUpContent />
     </div>
    </Suspense>
  );
}
