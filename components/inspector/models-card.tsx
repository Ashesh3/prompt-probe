"use client";

import { useState } from "react";
import { Layers, BookmarkPlus, LogOut, RefreshCw } from "lucide-react";
import { PanelCard } from "@/components/common/panel-card";
import { StatusBadge, StatusDot } from "@/components/common/status-badge";
import { NameDialog } from "@/components/common/name-dialog";
import { GithubMark } from "@/components/common/github-mark";
import { CopilotLoginDialog } from "@/components/dialogs/copilot-login-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  PROVIDER_GROUPS,
  PROVIDER_LABEL,
  modelKey,
  ALL_MODELS,
} from "@/lib/models/catalog";
import { formatCompact } from "@/lib/tokens/estimate";
import { cn } from "@/lib/utils";
import type {
  ModelResultStatus,
  ModelSelection,
  ProviderGroup,
} from "@/lib/types";

export function ModelsCard() {
  const selected = useStore((s) => s.selectedModels);
  const latestStatus = useStore((s) => s.latestStatus);
  const liveStatuses = useStore((s) => s.liveStatuses);
  const toggleModel = useStore((s) => s.toggleModel);
  const selectAll = useStore((s) => s.selectAllModels);
  const clearModels = useStore((s) => s.clearModels);
  const presets = useStore((s) => s.presets);
  const applyPreset = useStore((s) => s.applyPreset);
  const savePreset = useStore((s) => s.savePreset);
  const copilotLoggedIn = useStore((s) => s.copilotLoggedIn);
  const copilotUser = useStore((s) => s.copilotUser);
  const copilotModels = useStore((s) => s.copilotModels);
  const copilotLogout = useStore((s) => s.copilotLogout);
  const refreshCopilotModels = useStore((s) => s.refreshCopilotModels);

  const [presetDialog, setPresetDialog] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const selectedKeys = new Set(selected.map(modelKey));

  function statusFor(sel: ModelSelection): ModelResultStatus {
    const key = modelKey(sel);
    return liveStatuses[key] ?? latestStatus[key] ?? "not_run";
  }

  const copilotGroup: ProviderGroup | null =
    copilotModels.length > 0
      ? {
          id: "copilot",
          name: "GitHub Copilot",
          models: copilotModels.map((m) => ({
            id: m.id,
            name: m.name,
            provider: "copilot" as const,
            family: m.vendor || "Copilot",
            enabled: true,
          })),
        }
      : null;
  const groups = copilotGroup ? [copilotGroup, ...PROVIDER_GROUPS] : PROVIDER_GROUPS;
  const totalModels = ALL_MODELS.length + copilotModels.length;

  return (
    <PanelCard
      className="shrink-0"
      icon={<Layers className="size-4 text-cyan" />}
      title="Models"
      actions={
        <span className="rounded-full bg-hover px-2 py-0.5 font-mono text-[11px] text-secondary-foreground">
          {selected.length}/{totalModels}
        </span>
      }
    >
      <div className="flex items-center gap-3 border-b border-border px-3.5 py-2">
        <button
          type="button"
          onClick={selectAll}
          className="text-xs font-medium text-cyan hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearModels}
          className="text-xs font-medium text-faint hover:text-foreground"
        >
          Clear all
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          {presets.length > 0 && (
            <Select
              onValueChange={(v) => applyPreset(v as string)}
              items={presets.map((p) => ({ value: p.id, label: p.name }))}
            >
              <SelectTrigger size="sm" className="h-7 min-w-28">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setPresetDialog(true)}
                  className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-foreground"
                  aria-label="Save preset"
                >
                  <BookmarkPlus className="size-4" />
                </button>
              }
            />
            <TooltipContent>Save current selection as preset</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* GitHub Copilot connection */}
      <div className="border-b border-border px-3.5 py-2">
        {copilotLoggedIn ? (
          <div className="flex items-center gap-2">
            <GithubMark className="size-4 shrink-0 text-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-foreground">
                {copilotUser?.login ?? "GitHub Copilot"}
              </div>
              <div className="text-[10.5px] text-faint">
                {copilotModels.length} Copilot model
                {copilotModels.length === 1 ? "" : "s"} available
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => refreshCopilotModels()}
                    className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-foreground"
                    aria-label="Refresh Copilot models"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent>Refresh models</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => copilotLogout()}
                    className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-filter"
                    aria-label="Disconnect GitHub Copilot"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent>Disconnect</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-strong bg-elevated px-3 py-2 text-[12.5px] font-medium text-secondary-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <GithubMark className="size-4" />
            Connect GitHub Copilot
          </button>
        )}
      </div>

      <div className="max-h-[320px] overflow-y-auto py-1">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex items-center justify-between px-3.5 pt-2 pb-1">
              <span className="caption-label flex items-center gap-1.5">
                {group.id === "copilot" && <GithubMark className="size-3" />}
                {PROVIDER_LABEL[group.id]}
              </span>
              <span className="font-mono text-[10px] text-faint">
                {group.models.filter((m) => selectedKeys.has(`${m.provider}:${m.id}`)).length}/
                {group.models.length}
              </span>
            </div>
            {group.models.map((m) => {
              const sel = { provider: m.provider, modelId: m.id };
              const key = modelKey(sel);
              const checked = selectedKeys.has(key);
              const status = statusFor(sel);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleModel(sel)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left transition-colors hover:bg-hover/60",
                    checked && "bg-hover/40",
                  )}
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12.5px] font-medium text-foreground">
                      {m.id}
                    </div>
                    <div className="truncate text-[11px] text-faint">
                      {m.family}
                      {m.contextWindow
                        ? ` · ${formatCompact(m.contextWindow)} ctx`
                        : ""}
                    </div>
                  </div>
                  {status === "not_run" ? (
                    <StatusDot status="not_run" />
                  ) : (
                    <StatusBadge
                      status={status}
                      withIcon={false}
                      className="px-1.5 py-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <NameDialog
        open={presetDialog}
        onOpenChange={setPresetDialog}
        title="Save model preset"
        description={`Save ${selected.length} selected model${selected.length === 1 ? "" : "s"} as a reusable preset.`}
        nameLabel="Preset name"
        namePlaceholder="e.g. Strict Claude set"
        submitLabel="Save preset"
        onSubmit={(name) => savePreset(name)}
      />
      <CopilotLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </PanelCard>
  );
}
