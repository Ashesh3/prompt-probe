"use client";

import { useState } from "react";
import { ShieldCheck, Loader, FileJson } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { ConversationMessage, ParsedCapture } from "@/lib/types";

export function ImportCaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedCapture | null>(null);

  const setPrompt = useStore((s) => s.setPrompt);
  const setTools = useStore((s) => s.setTools);
  const setSettings = useStore((s) => s.setSettings);
  const setMessages = useStore((s) => s.setMessages);

  async function parse() {
    setParsing(true);
    try {
      const res = await fetch("/api/import/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to parse capture");
      setResult((await res.json()) as ParsedCapture);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  function apply() {
    if (!result) return;
    if (result.systemPrompt) setPrompt(result.systemPrompt);
    if (result.tools.length) setTools(result.tools);
    // Keep user/assistant/tool turns in order (the system prompt is applied to
    // the editor above); preserve tool-call structure for faithful replay.
    const convo = result.messages
      .filter(
        (m) =>
          m.role === "user" || m.role === "assistant" || m.role === "tool",
      )
      .map((m) => ({
        role: m.role as ConversationMessage["role"],
        content: m.content,
        ...(m.tool_calls !== undefined ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.name ? { name: m.name } : {}),
      }));
    if (convo.length) setMessages(convo);
    setSettings({
      ...result.settings,
      includeTools: result.tools.length > 0,
    });
    toast.success("Capture applied to workspace.");
    onOpenChange(false);
    setText("");
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import request capture</DialogTitle>
          <DialogDescription>
            Paste raw request JSON or a debug capture containing a{" "}
            <code className="font-mono text-[11px]">Request Body</code>.
            Credentials are redacted before anything is shown or stored.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          rows={8}
          placeholder={'{\n  "system": "...",\n  "messages": [ ... ],\n  "tools": [ ... ]\n}'}
          className="max-h-[40vh] resize-none overflow-auto bg-inset font-mono text-xs"
          onChange={(e) => setText(e.target.value)}
        />

        {result && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-inset p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <FileJson className="size-3.5 text-cyan" />
              <span className="text-secondary-foreground">
                {result.systemPrompt ? "System prompt found" : "No system prompt"}{" "}
                · {result.messages.length} message
                {result.messages.length === 1 ? "" : "s"} · {result.tools.length}{" "}
                tool{result.tools.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-pass" />
              {result.redactions.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  Redacted:
                  {result.redactions.map((r) => (
                    <code
                      key={r}
                      className="rounded bg-filter/15 px-1.5 py-px font-mono text-[10px] text-filter"
                    >
                      {r}
                    </code>
                  ))}
                </span>
              ) : (
                <span className="text-faint">No credentials detected.</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {result ? (
            <Button onClick={apply}>Apply to workspace</Button>
          ) : (
            <Button onClick={parse} disabled={!text.trim() || parsing}>
              {parsing && <Loader className="size-4 animate-spin" />}
              Parse &amp; redact
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
