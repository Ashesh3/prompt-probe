"use client";

import {
  ListChecks,
  GitCompare,
  History,
  ShieldAlert,
  FileJson,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRiskFindings } from "@/components/editor/use-risk";
import { ResultsMatrix } from "./results-matrix";
import { DiffView } from "./diff-view";
import { HistoryTimeline } from "./history-timeline";
import { RiskInspector } from "./risk-inspector";
import { RawPayload } from "./raw-payload";
import { cn } from "@/lib/utils";
import type { BottomTab } from "@/lib/store";

export function BottomPanel({ collapsible = false }: { collapsible?: boolean }) {
  const tab = useStore((s) => s.bottomTab);
  const setTab = useStore((s) => s.setBottomTab);
  const resultsCount = useStore((s) => s.currentRun?.results.length ?? 0);
  const versionsCount = useStore((s) => s.versions.length);
  const bottomCollapsed = useStore((s) => s.bottomCollapsed);
  const toggleBottom = useStore((s) => s.toggleBottom);
  const bottomMaximized = useStore((s) => s.bottomMaximized);
  const toggleBottomMaximized = useStore((s) => s.toggleBottomMaximized);
  const findings = useRiskFindings();

  const collapsed = collapsible && bottomCollapsed;
  const maximized = collapsible && bottomMaximized;

  const tabs: {
    id: BottomTab;
    label: string;
    icon: LucideIcon;
    count?: number;
    danger?: boolean;
  }[] = [
    { id: "results", label: "Results", icon: ListChecks, count: resultsCount },
    { id: "diff", label: "Diff", icon: GitCompare },
    { id: "history", label: "History", icon: History, count: versionsCount },
    {
      id: "risk",
      label: "Risk Inspector",
      icon: ShieldAlert,
      count: findings.length,
      danger: findings.length > 0,
    },
    { id: "raw", label: "Raw Payload", icon: FileJson },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2">
        {tabs.map((t) => {
          const active = tab === t.id && !collapsed;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (collapsed) toggleBottom();
              }}
              className={cn(
                "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "bg-hover text-foreground"
                  : "text-faint hover:text-secondary-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 font-mono text-[10px]",
                    t.danger
                      ? "bg-filter/15 text-filter"
                      : active
                        ? "bg-brand/20 text-brand"
                        : "bg-hover text-faint",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        {collapsible && (
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => toggleBottomMaximized()}
              aria-label={maximized ? "Restore panel" : "Maximize panel"}
              title={maximized ? "Restore panel" : "Maximize panel"}
              className="rounded-md p-1.5 text-faint transition-colors hover:bg-hover hover:text-foreground"
            >
              {maximized ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
            {!maximized && (
              <button
                type="button"
                onClick={() => toggleBottom()}
                aria-label={collapsed ? "Expand panel" : "Collapse panel"}
                title={collapsed ? "Expand panel" : "Collapse panel"}
                className="rounded-md p-1.5 text-faint transition-colors hover:bg-hover hover:text-foreground"
              >
                {collapsed ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "results" && <ResultsMatrix />}
          {tab === "diff" && <DiffView />}
          {tab === "history" && <HistoryTimeline />}
          {tab === "risk" && <RiskInspector />}
          {tab === "raw" && <RawPayload />}
        </div>
      )}
    </div>
  );
}
