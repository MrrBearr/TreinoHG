import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  withBottomNav = true,
}: {
  children: React.ReactNode;
  className?: string;
  withBottomNav?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto min-h-screen w-full max-w-xl px-4",
        withBottomNav && "pb-28",
        className,
      )}
    >
      {children}
    </div>
  );
}
