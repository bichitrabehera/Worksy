"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (systemDark ? "dark" : "light");

    setTheme(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Avoid hydration mismatch: only render once the client theme is known.
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        // Subtle border + background pulled from globals.css CSS variables.
        "inline-flex h-8 w-8 items-center justify-center rounded-md",
        "border border-border bg-background/60 backdrop-blur-sm text-foreground",
        "hover:bg-muted hover:text-foreground hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "transition-colors duration-200",
        "active:scale-95",
        "dark:border-border dark:bg-muted/50",
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-5 shrink-0" />
      ) : (
        <Moon className="size-5 shrink-0" />
      )}
    </button>
  );
}
