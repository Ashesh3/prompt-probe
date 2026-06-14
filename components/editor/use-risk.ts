"use client";

import { useMemo } from "react";
import { analyzeRisk } from "@/lib/risk/scanner";
import { useStore, selectActiveContent } from "@/lib/store";
import type { RiskFinding } from "@/lib/types";

/** Memoized, client-side risk analysis of the active editor tab. */
export function useRiskFindings(): RiskFinding[] {
  const content = useStore(selectActiveContent);
  const activeTab = useStore((s) => s.activeTab);
  const includeTools = useStore((s) => s.settings.includeTools);
  const tools = useStore((s) => s.tools);
  return useMemo(
    // Tool-volume risk only applies to the system prompt (the -1 tab).
    () => analyzeRisk(content, activeTab < 0 && includeTools ? tools : undefined),
    [content, activeTab, includeTools, tools],
  );
}
