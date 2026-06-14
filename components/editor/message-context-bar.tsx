"use client";

import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Per-message controls (role, remove). Renders only when a conversation turn
 * is the active editor tab — the tab strip itself just switches messages, so
 * this is where the message's type/settings live.
 */
export function MessageContextBar() {
  const activeTab = useStore((s) => s.activeTab);
  const messages = useStore((s) => s.messages);
  const setMessageRole = useStore((s) => s.setMessageRole);
  const removeMessage = useStore((s) => s.removeMessage);

  if (activeTab < 0) return null;
  const m = messages[activeTab];
  if (!m) return null;

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-inset px-3">
      <span className="font-mono text-[11px] font-medium text-faint">
        Message #{activeTab + 1}
      </span>

      <span className="text-[11px] text-faint">Role</span>
      <div className="flex items-center gap-0.5 rounded-md border border-strong bg-elevated p-0.5">
        {(["user", "assistant", "tool"] as const).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setMessageRole(activeTab, role)}
            className={cn(
              "rounded px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
              m.role === role
                ? "bg-cyan/15 text-cyan"
                : "text-faint hover:text-foreground",
            )}
          >
            {role}
          </button>
        ))}
      </div>
      {m.tool_call_id && (
        <span className="font-mono text-[10px] text-faint">
          tool_call_id: {m.tool_call_id.slice(0, 12)}…
        </span>
      )}

      <button
        type="button"
        onClick={() => removeMessage(activeTab)}
        className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-faint transition-colors hover:bg-hover hover:text-filter"
      >
        <Trash2 className="size-3.5" />
        Remove message
      </button>
    </div>
  );
}
