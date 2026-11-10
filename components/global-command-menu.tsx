"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BriefcaseBusiness,
  Bookmark,
  User,
  House,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { Kbd } from "@/components/ui/kbd";

const navigation = [
  {
    group: "Navigation",
    items: [
      { label: "Home", href: "/", icon: House },
      { label: "Jobs", href: "/jobs", icon: BriefcaseBusiness },
      { label: "Bookmarks", href: "/my-jobs", icon: Bookmark },
      { label: "About", href: "/about", icon: Info },
    ],
  },
  {
    group: "Account",
    items: [{ label: "Profile", href: "/profile", icon: User }],
  },
];

export function GlobalCommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Search trigger */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        className="border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted h-9 justify-start gap-2 rounded-full px-2.5 sm:w-56 sm:px-3 md:rounded-xl lg:w-64"
      >
        <Search className="size-4 shrink-0" />

        <span className="hidden flex-1 truncate text-left text-sm sm:inline">
          Search pages...
        </span>

        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search pages and navigate..." />

          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {navigation.map((section, index) => (
              <div key={section.group}>
                {index > 0}

                <CommandGroup heading={section.group}>
                  {section.items.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="my-1"
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
