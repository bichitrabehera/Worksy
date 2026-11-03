import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type CompanyAvatarProps = {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function CompanyAvatar({
  name,
  size = "default",
  className,
}: CompanyAvatarProps) {
  return (
    <Avatar
      size={size}
      className={cn("rounded-lg after:rounded-lg", className)}
    >
      <AvatarFallback className="rounded-lg bg-muted font-medium text-muted-foreground">
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
