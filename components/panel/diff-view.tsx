"use client";

import { useMemo } from "react";
import { GitCompare, Plus, Minus } from "lucide-react";
import { useStore } from "@/lib/store";
import { diffLines } from "@/lib/diff/diff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "./results-matrix";
import { cn } from "@/lib/utils";
import type { DiffLine } from "@/lib/types";

interface Pair {
  left: DiffLine | null;
  right: DiffLine | null;
}

export function DiffView() {
  const versions = useStore((s) => s.versions);
  const promptContent = useStore((s) => s.promptContent);
  const compareVersionId = useStore((s) => s.compareVersionId);
  const setCompareVersion = useStore((s) => s.setCompareVersion);
  const currentRun = useStore((s) => s.currentRun);
  const runs = useStore((s) => s.runs);

  const oldVersion =
    versions.find((v) => v.id === compareVersionId) ??
    versions[1] ??
    versions[0] ??
    null;

  const { summary, rows } = useMemo(() => {
    const oldText = oldVersion?.content ?? "";
    const s = diffLines(oldText, promptContent);
    const pairs: Pair[] = [];
    let removes: DiffLine[] = [];
    let adds: DiffLine[] = [];
    const flush = () => {
      const n = Math.max(removes.length, adds.length);
      for (let i = 0; i < n; i++)
        pairs.push({ left: removes[i] ?? null, right: adds[i] ?? null });
      removes = [];
      adds = [];
    };
    for (const ln of s.lines) {
      if (ln.op === "remove") removes.push(ln);
      else if (ln.op === "add") adds.push(ln);
      else {
        flush();
        pairs.push({ left: ln, right: ln });
      }
    }
    flush();
    return { summary: s, rows: pairs };
  }, [oldVersion, promptContent]);

  if (versions.length === 0) {
    return (
      <EmptyState
        icon={<GitCompare className="size-6 text-faint" />}
        title="No versions to compare"
        hint="Save a version, then edit the prompt to see a diff."
      />
    );
  }

  const oldFiltered = oldVersion
    ? runs.find((r) => r.promptVersionId === oldVersion.id)?.filteredCount
    : undefined;
  const newFiltered = currentRun?.results.filter((r) => r.filtered).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-inset px-4 py-2">
        <div className="flex items-center gap-2">
          <Select
            value={oldVersion?.id ?? ""}
            onValueChange={(v) => setCompareVersion(v)}
          >
            <SelectTrigger size="sm" className="h-7 min-w-40">
              <SelectValue placeholder="Base version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GitCompare className="size-4 text-brand" />
          <span className="rounded-md border border-border bg-panel px-2.5 py-1 font-mono text-[12px] text-secondary-foreground">
            Current draft
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11.5px]">
          <span className="flex items-center gap-1 text-diff-add">
            <Plus className="size-3" />
            {summary.added}
          </span>
          <span className="flex items-center gap-1 text-diff-remove">
            <Minus className="size-3" />
            {summary.removed}
          </span>
          {oldFiltered != null && newFiltered != null && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-caption font-semibold",
                newFiltered > oldFiltered
                  ? "border-filter/40 bg-filter-bg text-filter"
                  : newFiltered < oldFiltered
                    ? "border-pass/30 bg-pass-bg text-pass"
                    : "border-strong text-faint",
              )}
            >
              filtered {oldFiltered} → {newFiltered}
            </span>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 border-b border-border bg-panel font-caption text-[10.5px] font-semibold tracking-wide text-faint uppercase">
        <div className="border-r border-border px-3 py-1.5">
          {oldVersion ? `v${oldVersion.versionNumber} · ${oldVersion.name}` : "Base"}
        </div>
        <div className="px-3 py-1.5">Current draft</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-code-bg">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2">
            <DiffCell line={row.left} side="left" />
            <DiffCell line={row.right} side="right" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffCell({
  line,
  side,
}: {
  line: DiffLine | null;
  side: "left" | "right";
}) {
  if (!line) {
    return <div className="border-r border-border/40 bg-inset/30" />;
  }
  const isChange = side === "left" ? line.op === "remove" : line.op === "add";
  const bg = isChange
    ? side === "left"
      ? "bg-diff-remove-bg"
      : "bg-diff-add-bg"
    : "";
  const num = side === "left" ? line.oldLine : line.newLine;
  const sign = isChange ? (side === "left" ? "−" : "+") : "";
  const accent = isChange
    ? side === "left"
      ? "text-diff-remove"
      : "text-diff-add"
    : "text-faint";
  return (
    <div
      className={cn(
        "flex gap-2 border-r border-border/40 px-2 font-mono text-[11.5px] leading-5",
        bg,
      )}
    >
      <span className={cn("w-8 shrink-0 select-none text-right", accent)}>
        {num ?? ""}
      </span>
      <span className={cn("w-3 shrink-0 select-none text-center", accent)}>
        {sign}
      </span>
      <span
        className={cn(
          "min-w-0 break-words whitespace-pre-wrap",
          isChange ? "text-foreground" : "text-code-text",
          line.risky &&
            "underline decoration-code-risk decoration-wavy underline-offset-2",
        )}
      >
        {line.text || " "}
      </span>
    </div>
  );
}
