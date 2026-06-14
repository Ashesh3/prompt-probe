"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GithubMark } from "@/components/common/github-mark";
import { useStore } from "@/lib/store";
import type { CopilotUser } from "@/lib/types";

export function CopilotLoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const onCopilotLogin = useStore((s) => s.onCopilotLogin);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let aborted = false;
    setUserCode(null);
    setVerificationUri(null);
    setError(null);

    async function run() {
      try {
        const initRes = await fetch("/api/copilot/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "initiate" }),
        });
        if (!initRes.ok) throw new Error("Failed to start GitHub login.");
        const d = (await initRes.json()) as {
          userCode: string;
          verificationUri: string;
          interval: number;
          expiresIn: number;
        };
        if (aborted) return;
        setUserCode(d.userCode);
        setVerificationUri(d.verificationUri);
        window.open(d.verificationUri, "_blank", "noopener,noreferrer");

        const step = ((d.interval ?? 5) + 1) * 1000;
        const maxAttempts = Math.floor((d.expiresIn ?? 900) / ((d.interval ?? 5) + 1));
        for (let i = 0; i < maxAttempts && !aborted; i++) {
          await new Promise((r) => setTimeout(r, step));
          if (aborted) return;
          const pollRes = await fetch("/api/copilot/auth", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "poll" }),
          });
          if (!pollRes.ok) continue;
          const p = (await pollRes.json()) as {
            status?: string;
            user?: CopilotUser;
            error?: string;
          };
          if (p.status === "authorized") {
            if (aborted) return;
            await onCopilotLogin(p.user ?? null);
            toast.success("Connected to GitHub Copilot.");
            onOpenChange(false);
            return;
          }
          if (p.status === "error") {
            setError(
              p.error === "access_denied"
                ? "Authorization was denied."
                : p.error === "expired_token"
                  ? "The code expired — try again."
                  : "Login failed — try again.",
            );
            return;
          }
        }
        if (!aborted) setError("Login timed out — please try again.");
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Login failed.");
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [open, attempt, onCopilotLogin, onOpenChange]);

  function copy() {
    if (!userCode) return;
    navigator.clipboard.writeText(userCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GithubMark className="size-4" />
            Connect GitHub Copilot
          </DialogTitle>
          <DialogDescription>
            Authorize Prompt Probe to use your Copilot models. Your token is kept
            in a server-side httpOnly cookie — it never reaches the browser.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <TriangleAlert className="size-6 text-refusal" />
            <p className="text-center text-[13px] text-secondary-foreground">
              {error}
            </p>
            <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
          </div>
        ) : userCode ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border bg-inset p-3">
              <p className="mb-2 text-[12px] text-faint">
                Enter this one-time code on GitHub:
              </p>
              <div className="flex items-center justify-between gap-2 rounded-md border border-strong bg-code-bg px-3 py-2">
                <span className="font-mono text-xl font-semibold tracking-[0.3em] text-foreground">
                  {userCode}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-faint transition-colors hover:bg-hover hover:text-foreground"
                >
                  {copied ? (
                    <Check className="size-3.5 text-pass" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                verificationUri &&
                window.open(verificationUri, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="size-4" />
              Open github.com/login/device
            </Button>
            <div className="flex items-center justify-center gap-2 text-[12px] text-faint">
              <Loader className="size-3.5 animate-spin" />
              Waiting for authorization…
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-6 text-faint">
            <Loader className="size-4 animate-spin" />
            Starting…
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
