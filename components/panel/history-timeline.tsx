"use client";

import { useEffect, useState } from "react";
import {
  History,
  RotateCcw,
  Copy,
  GitCompare,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { EmptyState } from "./results-matrix";
import { formatRelative } from "@/lib/time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HistoryTimeline() {
  const versions = useStore((s) => s.versions);
  const runs = useStore((s) => s.runs);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const duplicateVersion = useStore((s) => s.duplicateVersion);
  const setCompareVersion = useStore((s) => s.setCompareVersion);
  const [now, setNow] = useState(0);

  useEffect(() => setNow(Date.now()), [versions]);

  if (versions.length === 0) {
    return (
      <EmptyState
        icon={<History className="size-6 text-faint" />}
        title="No version history yet"
        hint="Every run auto-saves a snapshot. Save named versions from the header."
      />
    );
  }

  // oldest → newest, left to right
  const ordered = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const latestNumber = Math.max(...versions.map((v) => v.versionNumber));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-inset px-4 py-2">
        <span className="caption-label">
          {versions.length} version{versions.length === 1 ? "" : "s"} ·{" "}
          {runs.length} run{runs.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full items-stretch gap-2 p-4">
          {ordered.map((v) => {
            const run = runs.find((r) => r.promptVersionId === v.id);
            const isCurrent = v.versionNumber === latestNumber;
            const filtered = run?.filteredCount ?? 0;
            const total = run?.resultCount ?? 0;
            return (
              <div
                key={v.id}
                className={cn(
                  "flex w-60 shrink-0 flex-col gap-2 rounded-lg border bg-elevated p-3",
                  isCurrent
                    ? "border-brand shadow-[0_0_20px_-4px] shadow-brand/30"
                    : "border-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold text-cyan">
                    v{v.versionNumber}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full border border-brand/60 bg-brand/15 px-1.5 py-px font-caption text-[9px] font-semibold text-brand uppercase">
                      Current
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-faint">
                    {now > 0 ? formatRelative(v.createdAt, now) : ""}
                  </span>
                </div>

                <p className="line-clamp-2 min-h-8 text-[12px] font-medium text-secondary-foreground">
                  {v.changeSummary || v.name}
                </p>

                <div className="flex items-center gap-1">
                  {total > 0 ? (
                    Array.from({ length: total }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-2 rounded-full",
                          i < filtered ? "bg-filter" : "bg-pass",
                        )}
                      />
                    ))
                  ) : (
                    <span className="text-[10px] text-faint">Not run</span>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-1 border-t border-border pt-2">
                  <code className="font-mono text-[10.5px] text-faint">
                    #{v.contentHash.slice(0, 6)}
                  </code>
                  <div className="ml-auto flex items-center gap-0.5">
                    <IconAction
                      label="Restore this version"
                      onClick={() => restoreVersion(v.id)}
                    >
                      <RotateCcw className="size-3.5" />
                    </IconAction>
                    <IconAction
                      label="Duplicate"
                      onClick={() => duplicateVersion(v.id)}
                    >
                      <Copy className="size-3.5" />
                    </IconAction>
                    <IconAction
                      label="Compare with current draft"
                      onClick={() => setCompareVersion(v.id)}
                    >
                      <GitCompare className="size-3.5" />
                    </IconAction>
                    {filtered > 0 ? (
                      <ShieldAlert className="size-3.5 text-filter" />
                    ) : total > 0 ? (
                      <ShieldCheck className="size-3.5 text-pass" />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="rounded p-1 text-faint transition-colors hover:bg-hover hover:text-foreground"
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
