import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted [background:linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--muted-foreground)/0.1)_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
