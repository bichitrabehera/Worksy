"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-lg border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Get started finding fresher jobs in Bengaluru</p>
        </div>
        <Button onClick={() => signIn("google", { callbackUrl: "/onboarding" })} className="w-full">Sign up with Google</Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">Or</span></div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // For MVP, just sign in with credentials flow after creating account conceptually
            signIn("credentials", { email, password: "temp", callbackUrl: "/onboarding" });
          }}
          className="space-y-3"
        >
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full">Continue</Button>
        </form>
        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
          Already have an account? <Link href="/signin" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
