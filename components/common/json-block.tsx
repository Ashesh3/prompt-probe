"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function JsonBlock({
  data,
  label,
  className,
  maxHeight = 240,
}: {
  data: unknown;
  label?: string;
  className?: string;
  maxHeight?: number;
}) {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border bg-code-bg",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="caption-label">{label ?? "JSON"}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-faint transition-colors hover:bg-hover hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-pass" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-code-text"
        style={{ maxHeight }}
      >
        {text}
      </pre>
    </div>
  );
}
