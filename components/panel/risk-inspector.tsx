"use client";

import {
  ShieldCheck,
  ShieldAlert,
  CornerDownRight,
  Sparkles,
  Loader,
  Check,
  Undo2,
} from "lucide-react";
import { useRiskFindings } from "@/components/editor/use-risk";
import { revealLine } from "@/components/editor/editor-controller";
import { RiskBadge } from "@/components/common/risk-badge";
import { useStore, selectActiveContent } from "@/lib/store";
import { RISK_CATEGORY_META } from "@/lib/types";
import { RISK_COLOR_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { RiskFinding } from "@/lib/types";

export function RiskInspector() {
  const findings = useRiskFindings();
  const aiFindings = useStore((s) => s.aiFindings);
  const aiFindingsFor = useStore((s) => s.aiFindingsFor);
  const aiAnalyzing = useStore((s) => s.aiAnalyzing);
  const analyzeWithAI = useStore((s) => s.analyzeWithAI);
  const aiModel = useStore((s) => s.aiModel);
  const aiAppliedPatches = useStore((s) => s.aiAppliedPatches);
  const applyAiPatch = useStore((s) => s.applyAiPatch);
  const undoAiPatch = useStore((s) => s.undoAiPatch);
  const activeContent = useStore(selectActiveContent);

  // AI findings are only valid for the exact content they were computed for.
  const showAi = aiFindingsFor === activeContent && aiFindings.length > 0;
  const empty = findings.length === 0 && !showAi && !aiAnalyzing;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-inset px-4 py-2">
        <span className="caption-label">
          {findings.length} scanner finding{findings.length === 1 ? "" : "s"}
          {showAi ? ` · ${aiFindings.length} AI` : ""}
        </span>
        <button
          type="button"
          onClick={() => analyzeWithAI()}
          disabled={aiAnalyzing}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11.5px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
        >
          {aiAnalyzing ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Analyze with AI
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {empty && (
          <div className="px-4 py-10 text-center">
            <ShieldCheck className="mx-auto size-6 text-pass" />
            <p className="mt-2 text-[13px] font-medium text-foreground">
              No risk findings
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-faint">
              The deterministic scanner found no phrasing commonly associated
              with content filters. Run{" "}
              <span className="text-brand">Analyze with AI</span> (
              <code className="font-mono">{aiModel}</code>) for a model-based
              second opinion with safer-rewrite suggestions.
            </p>
          </div>
        )}

        {findings.length > 0 && (
          <Group
            title="Deterministic scanner"
            count={findings.length}
            icon={<ShieldAlert className="size-3 text-faint" />}
          >
            {findings.map((f, i) => (
              <FindingRow key={`d${i}`} f={f} />
            ))}
          </Group>
        )}

        {aiAnalyzing && (
          <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-faint">
            <Loader className="size-3.5 animate-spin" />
            Analyzing with {aiModel}…
          </div>
        )}

        {showAi && (
          <Group
            title={`AI analysis · ${aiModel}`}
            count={aiFindings.length}
            icon={<Sparkles className="size-3 text-brand" />}
          >
            {aiFindings.map((f, i) => (
              <AiFindingRow
                key={`a${i}`}
                f={f}
                applied={aiAppliedPatches.includes(i)}
                onApply={() => applyAiPatch(i)}
                onUndo={() => undoAiPatch(i)}
              />
            ))}
          </Group>
        )}
      </div>
    </div>
  );
}

function Group({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-elevated/40 px-4 py-1.5">
        {icon}
        <span className="font-caption text-[10.5px] font-semibold tracking-wide text-secondary-foreground uppercase">
          {title}
        </span>
        <span className="font-mono text-[10px] text-faint">{count}</span>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function FindingRow({ f }: { f: RiskFinding }) {
  const meta = RISK_CATEGORY_META[f.category];
  const color = RISK_COLOR_META[meta.color];
  return (
    <button
      type="button"
      onClick={() => revealLine(f.lineStart)}
      className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover/50"
    >
      <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-faint">
        <CornerDownRight className="size-3" />
        L{f.lineStart}
        {f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ""}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge category={f.category} />
          <code className="truncate font-mono text-[12px] text-foreground">
            “{f.matchedText}”
          </code>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
          {f.explanation}
        </p>
      </div>
      <div className="flex w-20 shrink-0 flex-col items-end gap-1">
        <span className={cn("font-mono text-[11px]", color.fg)}>
          {Math.round(f.confidence * 100)}%
        </span>
        <span className="h-1 w-full overflow-hidden rounded-full bg-hover">
          <span
            className={cn("block h-full rounded-full", color.fg)}
            style={{
              width: `${Math.round(f.confidence * 100)}%`,
              backgroundColor: "currentColor",
            }}
          />
        </span>
      </div>
    </button>
  );
}

function AiFindingRow({
  f,
  applied,
  onApply,
  onUndo,
}: {
  f: RiskFinding;
  applied: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  const color = RISK_COLOR_META[RISK_CATEGORY_META[f.category].color];
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => revealLine(f.lineStart)}
          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-faint transition-colors hover:text-foreground"
        >
          <CornerDownRight className="size-3" />
          L{f.lineStart}
          {f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ""}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge category={f.category} />
            <code className="truncate font-mono text-[12px] text-foreground">
              “{f.matchedText}”
            </code>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
            {f.explanation}
          </p>

          {f.suggestion ? (
            <div
              className={cn(
                "mt-2 rounded-md border p-2 transition-colors",
                applied
                  ? "border-pass/40 bg-pass-bg/50"
                  : "border-border bg-inset",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-caption text-[10px] font-semibold tracking-wide text-pass uppercase">
                  <Sparkles className="size-3" />
                  {applied ? "Applied" : "Safer rewrite"}
                </span>
                {applied ? (
                  <button
                    type="button"
                    onClick={onUndo}
                    className="flex items-center gap-1 rounded-md border border-strong bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-hover hover:text-foreground"
                  >
                    <Undo2 className="size-3" />
                    Undo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onApply}
                    className="flex items-center gap-1 rounded-md border border-pass/40 bg-pass/15 px-2 py-0.5 text-[11px] font-medium text-pass transition-colors hover:bg-pass/25"
                  >
                    <Check className="size-3" />
                    Apply patch
                  </button>
                )}
              </div>
              <p
                className={cn(
                  "mt-1.5 font-mono text-[12px] leading-relaxed text-foreground",
                  applied && "line-clamp-none",
                )}
              >
                {f.suggestion}
              </p>
            </div>
          ) : null}
        </div>
        <span className={cn("mt-0.5 font-mono text-[11px]", color.fg)}>
          {Math.round(f.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}
