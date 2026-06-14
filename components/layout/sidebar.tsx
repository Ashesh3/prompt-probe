"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  History as HistoryIcon,
  RefreshCw,
  Folder,
  FileCode,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusDot } from "@/components/common/status-badge";
import { NameDialog } from "@/components/common/name-dialog";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { Kbd } from "@/components/common/kbd";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const projects = useStore((s) => s.projects);
  const projectId = useStore((s) => s.projectId);
  const selectProject = useStore((s) => s.selectProject);
  const newProject = useStore((s) => s.newProject);
  const versions = useStore((s) => s.versions);
  const runs = useStore((s) => s.runs);
  const savedHash = useStore((s) => s.savedHash);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const loadRun = useStore((s) => s.loadRun);
  const refreshProject = useStore((s) => s.refreshProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const deleteVersion = useStore((s) => s.deleteVersion);

  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [versions, runs]);

  const filteredVersions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return versions;
    return versions.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.changeSummary ?? "").toLowerCase().includes(q),
    );
  }, [versions, query]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-panel">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-inset px-2.5 py-2">
          <Search className="size-3.5 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-faint"
          />
          <Kbd>⌘K</Kbd>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section
          title="Prompts"
          action={
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              aria-label="New prompt project"
              className="text-faint transition-colors hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          }
        >
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-0.5">
            <Folder className="size-3.5 text-cyan" />
            <span className="text-[12.5px] font-semibold text-foreground">
              Workspace
            </span>
            <span className="ml-auto font-mono text-[10px] text-faint">
              {projects.length}
            </span>
          </div>
          {projects.map((p) => {
            const active = p.id === projectId;
            return (
              <div key={p.id} className="group/row relative">
                <button
                  type="button"
                  onClick={() => selectProject(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2 py-1.5 pr-8 pl-5 text-left transition-colors",
                    active
                      ? "border-l-2 border-brand bg-hover/60"
                      : "border-l-2 border-transparent hover:bg-hover/40",
                  )}
                >
                  <FileCode
                    className={cn(
                      "size-3.5 shrink-0",
                      active ? "text-brand" : "text-faint",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-[12.5px]",
                      active
                        ? "font-medium text-foreground"
                        : "text-secondary-foreground",
                    )}
                  >
                    {p.name}
                  </span>
                </button>
                {projects.length > 1 && (
                  <div className="absolute inset-y-0 right-1.5 flex items-center opacity-0 transition-opacity group-hover/row:opacity-100">
                    <ConfirmDelete
                      label={`workspace “${p.name}”`}
                      onConfirm={() => deleteProject(p.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </Section>

        <Section title="Saved Versions" icon={<HistoryIcon className="size-3.5" />}>
          {filteredVersions.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-faint">No versions.</p>
          ) : (
            filteredVersions.map((v) => {
              const active = v.contentHash === savedHash;
              const run = runs.find((r) => r.promptVersionId === v.id);
              return (
                <div key={v.id} className="group/row relative">
                  <button
                    type="button"
                    onClick={() => restoreVersion(v.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 py-2 pr-8 pl-3.5 text-left transition-colors hover:bg-hover/40",
                      active && "bg-hover/30",
                    )}
                  >
                    <span className="font-mono text-[12px] font-semibold text-cyan">
                      v{v.versionNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-secondary-foreground">
                        {v.changeSummary || v.name}
                      </div>
                      <div className="font-mono text-[10px] text-faint">
                        {now > 0 ? `${formatRelative(v.createdAt, now)} ago` : ""}
                        {" · "}#{v.contentHash.slice(0, 6)}
                      </div>
                    </div>
                    {run && run.filteredCount > 0 ? (
                      <span className="rounded-full bg-filter/15 px-1.5 font-mono text-[10px] text-filter">
                        {run.filteredCount}
                      </span>
                    ) : run ? (
                      <StatusDot status="passed" />
                    ) : (
                      <StatusDot status="not_run" />
                    )}
                  </button>
                  <div className="absolute inset-y-0 right-1.5 flex items-center opacity-0 transition-opacity group-hover/row:opacity-100">
                    <ConfirmDelete
                      label={`version v${v.versionNumber}`}
                      onConfirm={() => deleteVersion(v.id)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </Section>

        <Section
          title="Recent Runs"
          icon={<RefreshCw className="size-3.5" />}
          action={
            <button
              type="button"
              onClick={() => refreshProject()}
              aria-label="Refresh runs"
              className="text-faint transition-colors hover:text-foreground"
            >
              <RefreshCw className="size-3.5" />
            </button>
          }
        >
          {runs.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-faint">No runs yet.</p>
          ) : (
            runs.slice(0, 12).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => loadRun(r.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-hover/40"
              >
                <StatusDot
                  status={r.filteredCount > 0 ? "content_filter" : "passed"}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-secondary-foreground">
                    Run #{r.id.slice(-4)}
                  </div>
                  <div className="font-mono text-[10px] text-faint">
                    {r.selectedModels.length} models ·{" "}
                    {now > 0 ? `${formatRelative(r.startedAt, now)} ago` : ""}
                  </div>
                </div>
                {r.filteredCount > 0 && (
                  <span className="rounded-full bg-filter/15 px-1.5 font-mono text-[10px] text-filter">
                    {r.filteredCount}
                  </span>
                )}
              </button>
            ))
          )}
        </Section>
      </div>

      <NameDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="New prompt project"
        nameLabel="Project name"
        namePlaceholder="e.g. Support Content Filter"
        submitLabel="Create"
        onSubmit={(name) => newProject(name)}
      />
    </aside>
  );
}

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-1.5">
      <div className="flex items-center justify-between px-3.5 py-1.5">
        <span className="caption-label">{title}</span>
        <span className="text-faint">{action ?? icon}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
