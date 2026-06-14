"use client";

import { useEffect, useState } from "react";
import { Activity, Maximize2 } from "lucide-react";
import { PanelCard } from "@/components/common/panel-card";
import { useStore } from "@/lib/store";
import { formatCompact } from "@/lib/tokens/estimate";
import { formatRelative, formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ModelResultStatus } from "@/lib/types";

const SUMMARY: {
  status: ModelResultStatus;
  label: string;
  fg: string;
  bg: string;
}[] = [
  { status: "passed", label: "Passed", fg: "text-pass", bg: "bg-pass-bg" },
  {
    status: "content_filter",
    label: "Filtered",
    fg: "text-filter",
    bg: "bg-filter-bg",
  },
  { status: "refused", label: "Refused", fg: "text-refusal", bg: "bg-refusal-bg" },
  { status: "error", label: "Errored", fg: "text-faint", bg: "bg-notrun-bg" },
];

export function LatestCard() {
  const currentRun = useStore((s) => s.currentRun);
  const running = useStore((s) => s.running);
  const setBottomTab = useStore((s) => s.setBottomTab);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [currentRun]);

  const results = currentRun?.results ?? [];
  const counts = (status: ModelResultStatus) =>
    results.filter((r) => r.status === status).length;

  const latencies = results
    .map((r) => r.latencyMs)
    .filter((v): v is number => typeof v === "number");
  const totalTokens = results.reduce((a, r) => a + (r.totalTokens ?? 0), 0);

  return (
    <PanelCard
      className="min-h-0 flex-1"
      bodyClassName="overflow-y-auto"
      icon={<Activity className="size-4 text-cyan" />}
      title="Latest Results"
      actions={
        <div className="flex items-center gap-2">
          {currentRun && now > 0 && (
            <span className="font-mono text-[11px] text-faint">
              v{currentRun.versionNumber} ·{" "}
              {formatRelative(currentRun.finishedAt ?? currentRun.startedAt, now)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setBottomTab("results")}
            className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-foreground"
            aria-label="Open results"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      }
    >
      {!currentRun ? (
        <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
          <Activity className="size-5 text-faint" />
          <p className="text-[13px] font-medium text-secondary-foreground">
            {running ? "Running test matrix…" : "No runs yet"}
          </p>
          <p className="text-[11px] text-faint">
            {running
              ? "Results will appear here."
              : "Select models and run a test to see results."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3.5">
          <div className="grid grid-cols-2 gap-2">
            {SUMMARY.map((s) => {
              const c = counts(s.status);
              return (
                <div
                  key={s.status}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border px-3 py-2",
                    c > 0 ? s.bg : "bg-inset",
                  )}
                >
                  <span className="text-[11px] font-medium text-faint">
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-lg font-semibold tabular-nums",
                      c > 0 ? s.fg : "text-faint",
                    )}
                  >
                    {c}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-md bg-inset px-3 py-2 text-[11px]">
            <div className="flex flex-col">
              <span className="text-faint">Latency range</span>
              <span className="font-mono text-secondary-foreground">
                {latencies.length
                  ? `${formatDuration(Math.min(...latencies))} – ${formatDuration(Math.max(...latencies))}`
                  : "—"}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-faint">Total tokens</span>
              <span className="font-mono text-secondary-foreground">
                {totalTokens ? formatCompact(totalTokens) : "—"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBottomTab("results")}
            className="text-left text-[11px] font-medium text-cyan hover:underline"
          >
            View raw details in results matrix →
          </button>
        </div>
      )}
    </PanelCard>
  );
}
