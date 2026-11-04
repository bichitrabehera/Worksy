"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { Bookmark, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <header className="bg-background/10 sticky top-0 z-50 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/"
            className="text-brand font-[copper] text-xl font-semibold"
          >
            Worksy
          </Link>
        </div>

        <div className="flex items-center justify-center gap-4">
          <nav className="hidden items-center justify-center gap-6 md:flex">
            {links.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm hover:text-neutral-500"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {!isLoaded ? (
            <Loader className="size-8" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
                aria-label="Open account menu"
              >
                <div className="text-foreground flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium hover:text-neutral-500">
                  <Avatar>
                    <AvatarImage
                      src={user.imageUrl}
                      alt={user.fullName ?? "Profile"}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-foreground text-sm font-medium"></span>
                    <span className="truncate text-xs font-normal">
                      {user.primaryEmailAddress?.emailAddress}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem render={<Link href="/profile" />}>
                  <User />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem render={<Link href="/my-jobs" />}>
                  <Bookmark />
                  Saved jobs
                </DropdownMenuItem>

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
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "hidden sm:flex")}
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
