"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-950 p-6 rounded-lg border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to find Bengaluru fresher jobs</p>
        </div>
        <Button onClick={() => signIn("google", { callbackUrl: "/jobs" })} className="w-full">Sign in with Google</Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">Or continue with</span></div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn("credentials", { email, password, callbackUrl: "/jobs" });
          }}
          className="space-y-3"
        >
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">Sign in with Email</Button>
        </form>
        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account? <Link href="/signup" className="underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
