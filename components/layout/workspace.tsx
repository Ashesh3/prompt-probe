"use client";

import { useEffect, useState } from "react";
import {
  FlaskConical,
  FileCode,
  SlidersHorizontal,
  ListChecks,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { EditorPanel } from "@/components/editor/editor-panel";
import { Inspector } from "@/components/inspector/inspector";
import { BottomPanel } from "@/components/panel/bottom-panel";
import { cn } from "@/lib/utils";

type CompactView = "editor" | "inspector" | "panel";

export function Workspace() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<CompactView>("editor");

  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const inspectorCollapsed = useStore((s) => s.inspectorCollapsed);
  const bottomCollapsed = useStore((s) => s.bottomCollapsed);
  const bottomMaximized = useStore((s) => s.bottomMaximized);
  const bottomHeight = useStore((s) => s.bottomHeight);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleInspector = useStore((s) => s.toggleInspector);

  useEffect(() => {
    setMounted(true);
    void useStore.getState().bootstrap();
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-faint">
        <div className="brand-gradient flex size-10 items-center justify-center rounded-lg">
          <FlaskConical className="size-5 text-white" />
        </div>
        <p className="font-caption text-xs tracking-wide uppercase">
          Loading Prompt Probe…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      {/* Desktop: editor-centric layout with collapsible panels */}
      <div className="hidden min-h-0 flex-1 flex-col gap-2 p-2 xl:flex">
        {!bottomMaximized && (
          <div className="flex min-h-0 flex-1 gap-2">
            {sidebarCollapsed ? (
              <SideRail
                side="left"
                label="Prompts & history"
                icon={FileCode}
                onExpand={toggleSidebar}
              />
            ) : (
              <div className="w-[240px] shrink-0 2xl:w-[280px]">
                <Sidebar />
              </div>
            )}

            <div className="flex min-w-0 flex-1">
              <EditorPanel />
            </div>

            {inspectorCollapsed ? (
              <SideRail
                side="right"
                label="Models & settings"
                icon={SlidersHorizontal}
                onExpand={toggleInspector}
              />
            ) : (
              <div className="w-[380px] shrink-0 2xl:w-[440px]">
                <Inspector />
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-border",
            bottomMaximized && "min-h-0 flex-1",
          )}
          style={
            !bottomMaximized && !bottomCollapsed
              ? { height: bottomHeight }
              : undefined
          }
        >
          {!bottomMaximized && !bottomCollapsed && <BottomResizeHandle />}
          <BottomPanel collapsible />
        </div>
      </div>

      {/* Compact: tabbed editor / inspector / panel */}
      <div className="flex min-h-0 flex-1 flex-col xl:hidden">
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-panel px-2 py-1.5">
          <CompactTab
            active={view === "editor"}
            onClick={() => setView("editor")}
            icon={<FileCode className="size-3.5" />}
            label="Editor"
          />
          <CompactTab
            active={view === "inspector"}
            onClick={() => setView("inspector")}
            icon={<SlidersHorizontal className="size-3.5" />}
            label="Models & Settings"
          />
          <CompactTab
            active={view === "panel"}
            onClick={() => setView("panel")}
            icon={<ListChecks className="size-3.5" />}
            label="Results"
          />
        </div>
        <div className="min-h-0 flex-1 p-2">
          {view === "editor" && (
            <div className="h-full">
              <EditorPanel />
            </div>
          )}
          {view === "inspector" && (
            <div className="h-full overflow-y-auto">
              <Inspector />
            </div>
          )}
          {view === "panel" && (
            <div className="h-full overflow-hidden rounded-lg border border-border">
              <BottomPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Slim rail shown in place of a collapsed side panel; click to expand. */
function SideRail({
  side,
  label,
  icon: Icon,
  onExpand,
}: {
  side: "left" | "right";
  label: string;
  icon: LucideIcon;
  onExpand: () => void;
}) {
  const Chevron = side === "left" ? PanelLeftOpen : PanelRightOpen;
  return (
    <button
      type="button"
      onClick={onExpand}
      title={`Show ${label}`}
      aria-label={`Show ${label}`}
      className="group flex w-9 shrink-0 flex-col items-center gap-3 rounded-lg border border-border bg-panel py-3 transition-colors hover:bg-hover"
    >
      <Chevron className="size-4 text-faint transition-colors group-hover:text-foreground" />
      <Icon className="size-4 text-faint transition-colors group-hover:text-secondary-foreground" />
      <span className="mt-1 text-[10px] font-medium tracking-wide whitespace-nowrap text-faint [writing-mode:vertical-rl] transition-colors group-hover:text-secondary-foreground">
        {label}
      </span>
    </button>
  );
}

/** Drag handle on the bottom panel's top edge to resize its height. */
function BottomResizeHandle() {
  const bottomHeight = useStore((s) => s.bottomHeight);
  const setBottomHeight = useStore((s) => s.setBottomHeight);

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    const onMove = (ev: PointerEvent) => {
      // Drag up → taller bottom panel; clamp so the editor keeps some room.
      const next = startH + (startY - ev.clientY);
      setBottomHeight(Math.min(next, window.innerHeight - 220));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="horizontal"
      title="Drag to resize"
      className="group absolute inset-x-0 -top-1.5 z-20 flex h-3 cursor-ns-resize items-center justify-center"
    >
      <div className="h-1 w-12 rounded-full bg-strong transition-colors group-hover:bg-faint" />
    </div>
  );
}

function CompactTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-hover text-foreground" : "text-faint hover:text-foreground",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
