import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded border border-border bg-inset px-1.5 py-px font-mono text-[10px] font-medium text-faint",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
