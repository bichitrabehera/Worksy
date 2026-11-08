"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { Bookmark, LogOut, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlobalCommandMenu } from "@/components/global-command-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

import Loader from "@/components/ui/loader";
import { cn } from "@/lib/utils";

const links = [
  { href: "/jobs", label: "Jobs" },
  { href: "/my-jobs", label: "Bookmarks" },
];

function getInitials(name?: string | null) {
  if (!name) return "U";

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const initials = getInitials(
    user?.fullName || user?.primaryEmailAddress?.emailAddress,
  );

  return (
    <header className="border-border/60 border-b bg-background/80 sticky top-0 z-50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="text-brand shrink-0 font-[copper] text-xl font-semibold tracking-tight"
        >
          Worksy
        </Link>

        {/* Search + Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalCommandMenu />

          {!isLoaded ? (
            <Loader className="size-8" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open account menu"
                className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Avatar className="border-border size-9 cursor-pointer border transition-opacity hover:opacity-80">
                  <AvatarImage
                    src={user.imageUrl}
                    alt={user.fullName ?? "Profile"}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="text-foreground truncate text-sm font-medium">
                      {user.fullName}
                    </span>
                    <span className="text-muted-foreground truncate text-xs font-normal">
                      {user.primaryEmailAddress?.emailAddress}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <User />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem render={<Link href="/my-jobs" />}>
                    <Bookmark />
                    Saved jobs
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ redirectUrl: "/" })}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                })}
              >
                Sign in
              </Link>

              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
