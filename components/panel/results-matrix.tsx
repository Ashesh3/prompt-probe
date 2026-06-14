"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Inbox,
  Loader,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useRiskFindings } from "@/components/editor/use-risk";
import { StatusBadge } from "@/components/common/status-badge";
import { RiskBadge } from "@/components/common/risk-badge";
import { JsonBlock } from "@/components/common/json-block";
import { PROVIDER_LABEL, modelKey } from "@/lib/models/catalog";
import { formatCount } from "@/lib/tokens/estimate";
import { formatDuration } from "@/lib/time";
import { RISK_CATEGORY_META } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ModelResult, ModelResultStatus, ModelSelection } from "@/lib/types";

const COLS =
  "minmax(180px,1.6fr) 132px 116px 78px 92px 92px 92px 152px 56px";

type SortKey = "model" | "status" | "latency" | "promptTokens";
const STATUS_ORDER: Record<ModelResultStatus, number> = {
  content_filter: 0,
  refused: 1,
  error: 2,
  passed: 3,
  running: 4,
  cancelled: 5,
  not_run: 6,
};

interface Row {
  sel: ModelSelection;
  status: ModelResultStatus;
  result: ModelResult | null;
}

export function ResultsMatrix() {
  const running = useStore((s) => s.running);
  const currentRun = useStore((s) => s.currentRun);
  const selectedModels = useStore((s) => s.selectedModels);
  const liveStatuses = useStore((s) => s.liveStatuses);
  const expandedId = useStore((s) => s.expandedResultId);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const findings = useRiskFindings();

  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "status",
    dir: 1,
  });

  const rows = useMemo<Row[]>(() => {
    let base: Row[];
    if (currentRun && currentRun.results.length > 0) {
      base = currentRun.results.map((r) => ({
        sel: { provider: r.provider, modelId: r.modelId },
        status: r.status,
        result: r,
      }));
    } else if (running) {
      base = selectedModels.map((sel) => ({
        sel,
        status: liveStatuses[modelKey(sel)] ?? "running",
        result: null,
      }));
    } else {
      base = [];
    }
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "model") cmp = a.sel.modelId.localeCompare(b.sel.modelId);
      else if (sort.key === "status")
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else if (sort.key === "latency")
        cmp = (a.result?.latencyMs ?? 0) - (b.result?.latencyMs ?? 0);
      else cmp = (a.result?.promptTokens ?? 0) - (b.result?.promptTokens ?? 0);
      return cmp * sort.dir;
    });
    return sorted;
  }, [currentRun, running, selectedModels, liveStatuses, sort]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-6 text-faint" />}
        title="No results yet"
        hint="Select models in the inspector and click Run Test."
      />
    );
  }

  function setSortKey(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div
        className="grid shrink-0 items-center gap-x-3 border-b border-border bg-inset px-4 py-2 font-caption text-[10.5px] font-semibold tracking-wide text-faint uppercase"
        style={{ gridTemplateColumns: COLS }}
      >
        <SortHeader label="Model" active={sort} k="model" onClick={setSortKey} />
        <SortHeader label="Status" active={sort} k="status" onClick={setSortKey} />
        <span>Finish</span>
        <span>Filtered</span>
        <SortHeader
          label="Prompt"
          active={sort}
          k="promptTokens"
          onClick={setSortKey}
          align="right"
        />
        <span className="text-right">Compl.</span>
        <SortHeader
          label="Latency"
          active={sort}
          k="latency"
          onClick={setSortKey}
          align="right"
        />
        <span>Response ID</span>
        <span className="text-right">Notes</span>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => {
          const key = modelKey(row.sel);
          const r = row.result;
          const expanded = r ? expandedId === r.id : false;
          const accent =
            row.status === "content_filter"
              ? "before:bg-filter"
              : row.status === "refused"
                ? "before:bg-refusal"
                : row.status === "passed"
                  ? "before:bg-pass"
                  : row.status === "running"
                    ? "before:bg-running"
                    : "before:bg-faint";
          return (
            <div key={key} className="border-b border-border/60">
              <button
                type="button"
                disabled={!r}
                onClick={() => r && toggleExpanded(r.id)}
                className={cn(
                  "relative grid w-full items-center gap-x-3 px-4 py-2 text-left text-[12.5px] transition-colors",
                  "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
                  accent,
                  r && "hover:bg-hover/50",
                )}
                style={{ gridTemplateColumns: COLS }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {r ? (
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-faint transition-transform",
                        expanded && "rotate-90",
                      )}
                    />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-mono font-medium text-foreground">
                      {row.sel.modelId}
                    </div>
                    <div className="truncate text-[10.5px] text-faint">
                      {PROVIDER_LABEL[row.sel.provider]}
                    </div>
                  </div>
                </div>

                <div>
                  {row.status === "running" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-running">
                      <Loader className="size-3 animate-spin" />
                      Running
                    </span>
                  ) : (
                    <StatusBadge status={row.status} />
                  )}
                </div>

                <span className="truncate font-mono text-[11px] text-secondary-foreground">
                  {r?.finishReason ?? "—"}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    r?.filtered ? "text-filter" : "text-faint",
                  )}
                >
                  {r ? (r.filtered ? "Yes" : "No") : "—"}
                </span>
                <span className="text-right font-mono tabular-nums text-secondary-foreground">
                  {r?.promptTokens != null ? formatCount(r.promptTokens) : "—"}
                </span>
                <span className="text-right font-mono tabular-nums text-secondary-foreground">
                  {r?.completionTokens != null
                    ? formatCount(r.completionTokens)
                    : "—"}
                </span>
                <span className="text-right font-mono tabular-nums text-secondary-foreground">
                  {r?.latencyMs != null ? formatDuration(r.latencyMs) : "—"}
                </span>
                <span className="truncate font-mono text-[11px] text-faint">
                  {r?.responseId ?? "—"}
                </span>
                <span className="text-right text-faint">
                  {r?.notes ? "✎" : "—"}
                </span>
              </button>

              {expanded && r && <ExpandedRow result={r} findings={findings} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  active,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  active: { key: SortKey; dir: 1 | -1 };
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const on = active.key === k;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={cn(
        "flex items-center gap-1 uppercase transition-colors hover:text-secondary-foreground",
        align === "right" && "justify-end",
        on && "text-secondary-foreground",
      )}
    >
      {label}
      {on &&
        (active.dir === 1 ? (
          <ArrowDownNarrowWide className="size-3" />
        ) : (
          <ArrowUpNarrowWide className="size-3" />
        ))}
    </button>
  );
}

function ExpandedRow({
  result,
  findings,
}: {
  result: ModelResult;
  findings: ReturnType<typeof useRiskFindings>;
}) {
  const suspects = findings.slice(0, 4);
  return (
    <div className="grid gap-3 bg-inset/60 px-4 py-3 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-border bg-panel p-3">
          <div className="caption-label mb-2">Filter metadata</div>
          <dl className="grid grid-cols-2 gap-y-1.5 text-[12px]">
            <Meta k="Finish reason" v={result.finishReason} />
            <Meta k="Filtered" v={result.filtered ? "Yes" : "No"} />
            <Meta k="Refused" v={result.refused ? "Yes" : "No"} />
            <Meta
              k="Response ID"
              v={result.responseId ?? "—"}
              mono
            />
            {result.errorType && (
              <Meta k="Error type" v={result.errorType} />
            )}
            {result.errorMessage && (
              <div className="col-span-2 text-[11.5px] text-filter">
                {result.errorMessage}
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-md border border-border bg-panel p-3">
          <div className="caption-label mb-2">Suspect lines</div>
          {suspects.length === 0 ? (
            <p className="text-[11.5px] text-faint">
              No risky phrasing detected in the current prompt.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {suspects.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[11.5px]">
                  <span className="font-mono text-faint">
                    L{f.lineStart}
                  </span>
                  <RiskBadge category={f.category} showLabel={false} />
                  <code className="truncate text-secondary-foreground">
                    {f.matchedText}
                  </code>
                  <span className="ml-auto shrink-0 text-[10px] text-faint">
                    {RISK_CATEGORY_META[f.category].badge}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <JsonBlock
          label="Request summary"
          data={result.requestSummary}
          maxHeight={140}
        />
        <JsonBlock
          label="Raw response"
          data={result.rawResponse ?? { note: "No response body." }}
          maxHeight={200}
        />
      </div>
    </div>
  );
}

function Meta({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-faint">{k}</dt>
      <dd
        className={cn(
          "truncate text-right text-secondary-foreground",
          mono && "font-mono text-[11px]",
        )}
      >
        {v}
      </dd>
    </>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      {icon}
      <p className="text-sm font-medium text-secondary-foreground">{title}</p>
      <p className="max-w-xs text-xs text-faint">{hint}</p>
    </div>
  );
}
