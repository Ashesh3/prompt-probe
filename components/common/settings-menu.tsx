"use client";

import { Settings, Check, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { GithubMark } from "@/components/common/github-mark";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Header gear → configures the model used by "Analyze with AI". */
export function SettingsMenu() {
  const aiModel = useStore((s) => s.aiModel);
  const setAiModel = useStore((s) => s.setAiModel);
  const copilotModels = useStore((s) => s.copilotModels);
  const copilotLoggedIn = useStore((s) => s.copilotLoggedIn);

  // Always offer the gpt-5.5 default, then any models the account exposes.
  const options = Array.from(
    new Set(["gpt-5.5", ...copilotModels.map((m) => m.id)]),
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Settings">
            <Settings />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-cyan" />
            AI analysis model
          </PopoverTitle>
          <PopoverDescription className="text-[11.5px]">
            Model used by “Analyze with AI” to flag filter-triggering wording.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {options.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setAiModel(id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[12px] transition-colors hover:bg-hover",
                id === aiModel
                  ? "text-foreground"
                  : "text-secondary-foreground",
              )}
            >
              <span className="truncate">{id}</span>
              {id === aiModel && (
                <Check className="size-3.5 shrink-0 text-brand" />
              )}
            </button>
          ))}
        </div>

        {!copilotLoggedIn && (
          <p className="flex items-start gap-1.5 rounded-md border border-border bg-inset px-2 py-1.5 text-[11px] leading-relaxed text-faint">
            <GithubMark className="mt-0.5 size-3 shrink-0" />
            <span>
              Connect GitHub Copilot in the Models panel — AI analysis runs
              through your Copilot models.
            </span>
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
