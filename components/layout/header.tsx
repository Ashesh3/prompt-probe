"use client";

import { useState } from "react";
import {
  FlaskConical,
  FileCode,
  ChevronDown,
  Save,
  GitCompare,
  Download,
  Play,
  Plus,
  Loader,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelBottomClose,
  PanelBottomOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useStore,
  selectStatusPill,
  selectIsDirty,
  type StatusPill,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/common/kbd";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SettingsMenu } from "@/components/common/settings-menu";
import { NameDialog } from "@/components/common/name-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PILL: Record<
  StatusPill,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  draft: {
    label: "Draft",
    text: "text-faint",
    bg: "bg-elevated",
    border: "border-strong",
    dot: "bg-faint",
  },
  running: {
    label: "Running",
    text: "text-running",
    bg: "bg-running-bg",
    border: "border-running/40",
    dot: "bg-running animate-pulse",
  },
  tested: {
    label: "Tested",
    text: "text-pass",
    bg: "bg-pass-bg",
    border: "border-pass/30",
    dot: "bg-pass",
  },
  filtered: {
    label: "Has Filter Failures",
    text: "text-filter",
    bg: "bg-filter-bg",
    border: "border-filter/40",
    dot: "bg-filter",
  },
};

export function Header() {
  const projectName = useStore((s) => s.projectName);
  const projects = useStore((s) => s.projects);
  const projectId = useStore((s) => s.projectId);
  const selectProject = useStore((s) => s.selectProject);
  const newProject = useStore((s) => s.newProject);
  const saveVersion = useStore((s) => s.saveVersion);
  const setBottomTab = useStore((s) => s.setBottomTab);
  const runTest = useStore((s) => s.runTest);
  const running = useStore((s) => s.running);
  const dirty = useStore(selectIsDirty);
  const pill = PILL[useStore(selectStatusPill)];

  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const inspectorCollapsed = useStore((s) => s.inspectorCollapsed);
  const bottomCollapsed = useStore((s) => s.bottomCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleInspector = useStore((s) => s.toggleInspector);
  const toggleBottom = useStore((s) => s.toggleBottom);

  const [saveOpen, setSaveOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  function exportReport() {
    const s = useStore.getState();
    const report = {
      project: s.projectName,
      promptContent: s.promptContent,
      settings: s.settings,
      selectedModels: s.selectedModels,
      run: s.currentRun,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-probe-report-${s.projectName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-panel px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="brand-gradient flex size-[30px] items-center justify-center rounded-md shadow-[0_0_16px_-4px] shadow-brand/50">
            <FlaskConical className="size-4 text-white" />
          </div>
          <span className="hidden font-heading text-base font-semibold whitespace-nowrap text-foreground sm:inline">
            Prompt Probe
          </span>
        </div>

        <div className="hidden h-5 w-px bg-strong sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-hover"
              >
                <FileCode className="size-3.5 shrink-0 text-faint" />
                <span className="max-w-[110px] truncate text-[13px] font-medium text-secondary-foreground sm:max-w-none">
                  {projectName}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-faint" />
              </button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Prompt projects</DropdownMenuLabel>
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  className="justify-between"
                >
                  {p.name}
                  {p.id === projectId && (
                    <Check className="size-3.5 text-brand" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setNewOpen(true)}>
              <Plus className="size-3.5" />
              New prompt project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-caption text-[11px] font-semibold whitespace-nowrap md:flex",
            pill.text,
            pill.bg,
            pill.border,
          )}
        >
          <span className={cn("size-1.5 rounded-full", pill.dot)} />
          {pill.label}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-elevated"
          onClick={() => setSaveOpen(true)}
        >
          <Save className="size-3.5" />
          <span className="hidden xl:inline">Save Version</span>
          {dirty && <span className="size-1.5 rounded-full bg-brand" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 bg-elevated sm:flex"
          onClick={() => setBottomTab("diff")}
        >
          <GitCompare className="size-3.5" />
          <span className="hidden xl:inline">Compare</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-1.5 bg-elevated sm:flex"
          onClick={exportReport}
        >
          <Download className="size-3.5" />
          <span className="hidden xl:inline">Export</span>
        </Button>

        <div className="mx-1 hidden h-5 w-px bg-strong sm:block" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3.5 shadow-[0_0_18px_-2px] shadow-brand/40"
                onClick={() => (running ? undefined : runTest())}
                disabled={running}
              >
                {running ? (
                  <Loader className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                Run Test
                <Kbd className="hidden border-current/30 bg-current/15 text-current sm:inline-flex">
                  ⌘↵
                </Kbd>
              </Button>
            }
          />
          <TooltipContent>Run the test matrix across selected models</TooltipContent>
        </Tooltip>

        <div className="mx-0.5 hidden h-5 w-px bg-strong xl:block" />
        <div className="hidden items-center gap-0.5 xl:flex">
          <LayoutToggle
            open={!sidebarCollapsed}
            onClick={toggleSidebar}
            OpenIcon={PanelLeftClose}
            ClosedIcon={PanelLeftOpen}
            label="prompts sidebar"
          />
          <LayoutToggle
            open={!bottomCollapsed}
            onClick={toggleBottom}
            OpenIcon={PanelBottomClose}
            ClosedIcon={PanelBottomOpen}
            label="results panel"
          />
          <LayoutToggle
            open={!inspectorCollapsed}
            onClick={toggleInspector}
            OpenIcon={PanelRightClose}
            ClosedIcon={PanelRightOpen}
            label="models & settings"
          />
        </div>

        <SettingsMenu />
        <ThemeToggle />
      </div>

      <NameDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save prompt version"
        description="Snapshot the current prompt as a named, immutable version."
        nameLabel="Version name"
        namePlaceholder="e.g. Removed dual-use wording"
        withSummary
        submitLabel="Save version"
        onSubmit={(name, summary) => saveVersion(name, summary)}
      />
      <NameDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="New prompt project"
        nameLabel="Project name"
        namePlaceholder="e.g. Support Content Filter"
        submitLabel="Create"
        onSubmit={(name) => newProject(name)}
      />
    </header>
  );
}

/** Header button that collapses/expands a workspace panel (desktop only). */
function LayoutToggle({
  open,
  onClick,
  OpenIcon,
  ClosedIcon,
  label,
}: {
  open: boolean;
  onClick: () => void;
  OpenIcon: LucideIcon;
  ClosedIcon: LucideIcon;
  label: string;
}) {
  const Icon = open ? OpenIcon : ClosedIcon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={`${open ? "Hide" : "Show"} ${label}`}
            className={cn(
              "rounded-md p-1.5 transition-colors hover:bg-hover",
              open ? "text-secondary-foreground" : "text-faint",
            )}
          >
            <Icon className="size-4" />
          </button>
        }
      />
      <TooltipContent>
        {open ? "Hide" : "Show"} {label}
      </TooltipContent>
    </Tooltip>
  );
}
