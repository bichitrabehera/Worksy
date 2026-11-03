import { LoaderCircle } from "lucide-react";
import { cn } from "cn";

type LoaderProps = {
  className?: string;
  fullScreen?: boolean;
};

const Loader = ({ className, fullScreen = false }: LoaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen && "min-h-[calc(100vh-4rem)]",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <LoaderCircle className="size-5 animate-spin text-brand" />
    </div>
  );
};

export default Loader;
