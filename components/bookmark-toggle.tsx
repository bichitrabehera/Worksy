"use client";

import { Bookmark } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type BookmarkToggleProps = {
  saved: boolean;
  onToggle: (saved: boolean) => void;
  className?: string;
};

export function BookmarkToggle({
  saved,
  onToggle,
  className,
}: BookmarkToggleProps) {
  return (
    <Toggle
      variant="outline"
      size="icon-sm"
      pressed={saved}
      onPressedChange={onToggle}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      title={saved ? "Remove from saved jobs" : "Save job"}
      className={cn(
        "text-muted-foreground aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary",
        className,
      )}
    >
      <Bookmark className={cn(saved && "fill-current")} />
    </Toggle>
  );
}
