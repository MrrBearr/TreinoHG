import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl shimmer h-4", className)}
      {...props}
    />
  );
}

export { Skeleton };
