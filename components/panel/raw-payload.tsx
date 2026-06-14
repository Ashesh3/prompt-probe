"use client";

import { useState } from "react";
import { FileJson } from "lucide-react";
import { useStore } from "@/lib/store";
import { JsonBlock } from "@/components/common/json-block";
import { StatusDot } from "@/components/common/status-badge";
import { EmptyState } from "./results-matrix";
import { PROVIDER_LABEL } from "@/lib/models/catalog";
import { cn } from "@/lib/utils";

export function RawPayload() {
  const currentRun = useStore((s) => s.currentRun);
  const selectedResultId = useStore((s) => s.selectedResultId);
  const results = currentRun?.results ?? [];
  const [picked, setPicked] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<FileJson className="size-6 text-faint" />}
        title="No payloads yet"
        hint="Run a test to inspect the redacted request and raw response for each model."
      />
    );
  }

  const activeId = picked ?? selectedResultId ?? results[0].id;
  const active = results.find((r) => r.id === activeId) ?? results[0];

  return (
    <div className="flex h-full min-h-0">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-border">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setPicked(r.id)}
            className={cn(
              "flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-hover/50",
              r.id === active.id && "bg-hover/60",
            )}
          >
            <StatusDot status={r.status} />
            <div className="min-w-0">
              <div className="truncate font-mono text-[12px] text-foreground">
                {r.modelId}
              </div>
              <div className="truncate text-[10.5px] text-faint">
                {PROVIDER_LABEL[r.provider]}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {active.responseText && (
          <div className="rounded-md border border-border bg-panel p-3">
            <div className="caption-label mb-1.5">Response text</div>
            <p className="text-[12.5px] leading-relaxed text-secondary-foreground">
              {active.responseText}
            </p>
          </div>
        )}
        <JsonBlock
          label="Request summary (redacted)"
          data={active.requestSummary}
          maxHeight={200}
        />
        <JsonBlock
          label="Raw response (redacted)"
          data={active.rawResponse ?? { note: "No response body." }}
          maxHeight={320}
        />
      </div>
    </div>
  );
}
