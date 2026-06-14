"use client";

import {
  FileCode,
  Search,
  Hash,
  Type,
  ShieldAlert,
  Plus,
  Sparkles,
  Loader,
} from "lucide-react";
import { useStore, selectIsDirty, selectActiveContent } from "@/lib/store";
import { useRiskFindings } from "./use-risk";
import { openFind } from "./editor-controller";
import {
  estimateTokens,
  countChars,
  formatCount,
  formatCompact,
} from "@/lib/tokens/estimate";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/common/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function EditorToolbar() {
  const content = useStore(selectActiveContent);
  const dirty = useStore(selectIsDirty);
  const activeTab = useStore((s) => s.activeTab);
  const messages = useStore((s) => s.messages);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const addMessage = useStore((s) => s.addMessage);
  const analyzeWithAI = useStore((s) => s.analyzeWithAI);
  const aiAnalyzing = useStore((s) => s.aiAnalyzing);
  const findings = useRiskFindings();

  const tokens = estimateTokens(content);
  const chars = countChars(content);
  const risks = findings.length;

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-inset px-2">
      {/* Tab strip: system prompt + conversation turns */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab(-1)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
            activeTab < 0
              ? "border-strong bg-code-bg text-foreground"
              : "border-border bg-transparent text-faint hover:text-foreground",
          )}
        >
          <FileCode
            className={cn("size-3.5", activeTab < 0 && "text-cyan")}
          />
          <span className="font-mono text-xs font-medium">
            system_prompt.md
          </span>
          {dirty && (
            <span
              className="size-1.5 rounded-full bg-brand"
              title="Unsaved changes"
            />
          )}
        </button>

        {messages.map((m, i) => {
          const active = activeTab === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveTab(i)}
              title={`Message #${i + 1} · ${m.role}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors",
                active
                  ? "border-strong bg-code-bg text-foreground"
                  : "border-border bg-transparent text-faint hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  m.role === "user"
                    ? "bg-cyan"
                    : m.role === "tool"
                      ? "bg-refusal"
                      : "bg-faint",
                )}
                aria-hidden
              />
              <span className="font-mono text-[11px] font-semibold">
                #{i + 1}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => addMessage()}
          title="Add message"
          aria-label="Add message"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Right: actions + stats */}
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => analyzeWithAI()}
                disabled={aiAnalyzing}
                className="flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1.5 text-[12px] font-medium text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
              >
                {aiAnalyzing ? (
                  <Loader className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span className="hidden sm:inline">Analyze with AI</span>
              </button>
            }
          />
          <TooltipContent>
            Flag filter-triggering wording in this tab with an AI model
          </TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={openFind}
          className="hidden items-center gap-2 rounded-md border border-strong bg-code-bg px-2.5 py-1.5 text-faint transition-colors hover:text-foreground lg:flex"
        >
          <Search className="size-3.5" />
          <span className="font-mono text-xs">Find</span>
          <Kbd>⌘F</Kbd>
        </button>

        <div className="hidden h-4 w-px bg-border lg:block" />

        <Meta icon={<Hash className="size-3.5" />}>
          {formatCount(tokens)} tokens
        </Meta>
        <Meta icon={<Type className="size-3.5" />}>
          {formatCompact(chars)} chars
        </Meta>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-caption text-[11px] font-semibold",
            risks > 0
              ? "border-filter/40 bg-filter/12 text-filter"
              : "border-pass/30 bg-pass-bg text-pass",
          )}
        >
          <ShieldAlert className="size-3" />
          {risks} {risks === 1 ? "risk" : "risks"}
        </span>
      </div>
    </div>
  );
}

function Meta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="hidden items-center gap-1.5 text-faint xl:flex">
      {icon}
      <span className="font-caption text-[11.5px] font-medium text-secondary-foreground">
        {children}
      </span>
    </span>
  );
}
