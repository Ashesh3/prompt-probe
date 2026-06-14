"use client";

import { useState } from "react";
import { SlidersHorizontal, RotateCcw, Play, Upload, Loader, X } from "lucide-react";
import { PanelCard } from "@/components/common/panel-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/common/kbd";
import { ImportCaptureDialog } from "@/components/dialogs/import-capture-dialog";
import { useStore } from "@/lib/store";
import { formatCompact } from "@/lib/tokens/estimate";
import { cn } from "@/lib/utils";

export function SettingsCard() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const resetSettings = useStore((s) => s.resetSettings);
  const tools = useStore((s) => s.tools);
  const running = useStore((s) => s.running);
  const runTest = useStore((s) => s.runTest);
  const cancelRun = useStore((s) => s.cancelRun);
  const selectedCount = useStore((s) => s.selectedModels.length);
  const [importOpen, setImportOpen] = useState(false);

  const toolBytes = tools.length ? JSON.stringify(tools).length : 0;

  return (
    <PanelCard
      className="shrink-0"
      icon={<SlidersHorizontal className="size-4 text-cyan" />}
      title="Run Settings"
      actions={
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={resetSettings}
                className="rounded-md p-1 text-faint transition-colors hover:bg-hover hover:text-foreground"
                aria-label="Reset settings"
              >
                <RotateCcw className="size-3.5" />
              </button>
            }
          />
          <TooltipContent>Reset to defaults</TooltipContent>
        </Tooltip>
      }
    >
      <div className="flex flex-col gap-3 p-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Max tokens">
            <Input
              type="number"
              min={1}
              value={settings.maxTokens}
              className="bg-inset font-mono text-[13px]"
              onChange={(e) =>
                setSettings({
                  maxTokens: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </Field>
          <Field label="Temperature">
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={settings.temperature}
              className="bg-inset font-mono text-[13px]"
              onChange={(e) =>
                setSettings({
                  temperature: Math.min(
                    2,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </Field>
        </div>

        <ToggleRow
          label="Streaming"
          hint="Stream tokens as they arrive"
          checked={settings.stream}
          onChange={(v) => setSettings({ stream: v })}
        />
        <ToggleRow
          label="Include tools"
          hint={
            settings.includeTools
              ? `${tools.length} schema${tools.length === 1 ? "" : "s"} · ${formatCompact(toolBytes)}`
              : "Attach tool schemas to the request"
          }
          checked={settings.includeTools}
          onChange={(v) => setSettings({ includeTools: v })}
        />

        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-inset text-secondary-foreground"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="size-4" />
          Import request capture
        </Button>

        <div className="flex items-center gap-2">
          <Button
            className="h-10 flex-1 gap-2 text-sm shadow-[0_0_18px_-2px] shadow-brand/40"
            onClick={() => (running ? undefined : runTest())}
            disabled={running || selectedCount === 0}
          >
            {running ? (
              <>
                <Loader className="size-4 animate-spin" />
                Running {selectedCount} model{selectedCount === 1 ? "" : "s"}…
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run selected
                <span className="ml-auto">
                  <Kbd className="border-current/30 bg-current/15 text-current">
                    ⌘↵
                  </Kbd>
                </span>
              </>
            )}
          </Button>
          {running && (
            <Button
              variant="outline"
              size="icon-lg"
              className="size-10"
              onClick={cancelRun}
              aria-label="Cancel run"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <ImportCaptureDialog open={importOpen} onOpenChange={setImportOpen} />
    </PanelCard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] text-faint">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border bg-inset px-3 py-2",
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="truncate text-[11px] text-faint">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
