import { cn } from "@/lib/utils";

export function PanelCard({
  icon,
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-panel",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3.5">
        {icon}
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {title}
        </h3>
        {actions && (
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        )}
      </div>
      <div className={cn("min-h-0", bodyClassName)}>{children}</div>
    </div>
  );
}
