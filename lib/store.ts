"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { contentHash } from "@/lib/hash";
import {
  DEFAULT_SETTINGS,
  DEFAULT_USER_MESSAGE,
  DRAFT_STORAGE_KEY,
  DEFAULT_PROMPT_CONTENT,
} from "@/lib/constants";
import { DEFAULT_SELECTION, modelKey } from "@/lib/models/catalog";
import type {
  ConversationMessage,
  CopilotModel,
  CopilotUser,
  ModelResult,
  ModelResultStatus,
  ModelSelection,
  ModelPreset,
  PromptVersion,
  RiskFinding,
  RunSettings,
  RunStatus,
  RunSummary,
  ToolSchema,
} from "@/lib/types";

export type BottomTab = "results" | "diff" | "history" | "risk" | "raw";
export type StatusPill = "draft" | "running" | "tested" | "filtered";

export interface CurrentRun {
  id: string;
  versionId: string;
  versionNumber: number;
  status: RunStatus;
  results: ModelResult[];
  startedAt: number;
  finishedAt: number | null;
}

interface StoreState {
  // server-backed data
  projectId: string | null;
  projectName: string;
  projects: { id: string; name: string }[];
  versions: PromptVersion[];
  runs: RunSummary[];
  latestStatus: Record<string, ModelResultStatus>;
  presets: ModelPreset[];

  // GitHub Copilot (real models; token stays in an httpOnly cookie)
  copilotLoggedIn: boolean;
  copilotUser: CopilotUser | null;
  copilotModels: CopilotModel[];

  // draft (persisted)
  promptContent: string;
  savedHash: string;
  selectedModels: ModelSelection[];
  settings: RunSettings;
  tools: ToolSchema[];
  messages: ConversationMessage[];
  /** Per-workspace conversations (keyed by projectId); `messages` mirrors the active one. */
  messagesByProject: Record<string, ConversationMessage[]>;

  // AI risk analysis (model used is persisted; findings are ephemeral)
  aiModel: string;
  aiFindings: RiskFinding[];
  /** The exact content the AI findings were computed for (stale-detection). */
  aiFindingsFor: string;
  aiAnalyzing: boolean;
  /** Indices of AI findings whose safer-rewrite suggestion has been applied. */
  aiAppliedPatches: number[];

  // run state
  running: boolean;
  currentRun: CurrentRun | null;
  liveStatuses: Record<string, ModelResultStatus>;

  // ui
  bottomTab: BottomTab;
  /** Active editor document: -1 = system prompt, >=0 = messages[index]. */
  activeTab: number;
  compareVersionId: string | null;
  expandedResultId: string | null;
  selectedResultId: string | null;
  booted: boolean;
  sidebarCollapsed: boolean;
  inspectorCollapsed: boolean;
  bottomCollapsed: boolean;
  bottomMaximized: boolean;
  bottomHeight: number;

  // actions
  bootstrap: () => Promise<void>;
  refreshProject: () => Promise<void>;
  selectProject: (id: string) => Promise<void>;
  newProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setPrompt: (v: string) => void;
  toggleModel: (sel: ModelSelection) => void;
  setSelectedModels: (m: ModelSelection[]) => void;
  selectAllModels: () => void;
  clearModels: () => void;
  setSettings: (patch: Partial<RunSettings>) => void;
  resetSettings: () => void;
  setTools: (tools: ToolSchema[]) => void;
  addMessage: (role?: "user" | "assistant") => void;
  updateMessage: (index: number, content: string) => void;
  setMessageRole: (index: number, role: ConversationMessage["role"]) => void;
  removeMessage: (index: number) => void;
  setMessages: (messages: ConversationMessage[]) => void;
  setActiveTab: (tab: number) => void;
  setAiModel: (model: string) => void;
  analyzeWithAI: () => Promise<void>;
  applyAiPatch: (index: number) => void;
  undoAiPatch: (index: number) => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleBottom: () => void;
  toggleBottomMaximized: () => void;
  setBottomHeight: (height: number) => void;
  runTest: () => Promise<void>;
  cancelRun: () => void;
  saveVersion: (name: string, changeSummary?: string) => Promise<void>;
  restoreVersion: (id: string) => void;
  duplicateVersion: (id: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
  loadRun: (id: string) => Promise<void>;
  setBottomTab: (t: BottomTab) => void;
  setCompareVersion: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  selectResult: (id: string) => void;
  savePreset: (name: string) => Promise<void>;
  applyPreset: (id: string) => void;
  loadCopilot: () => Promise<void>;
  refreshCopilotModels: () => Promise<void>;
  onCopilotLogin: (user: CopilotUser | null) => Promise<void>;
  copilotLogout: () => Promise<void>;
}

let abortController: AbortController | null = null;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      projectId: null,
      projectName: "Untitled",
      projects: [],
      versions: [],
      runs: [],
      latestStatus: {},
      presets: [],

      copilotLoggedIn: false,
      copilotUser: null,
      copilotModels: [],

      promptContent: "",
      savedHash: "",
      selectedModels: DEFAULT_SELECTION,
      settings: DEFAULT_SETTINGS,
      tools: [],
      messages: [{ role: "user", content: DEFAULT_USER_MESSAGE }],
      messagesByProject: {},

      aiModel: "gpt-5.5",
      aiFindings: [],
      aiFindingsFor: "",
      aiAnalyzing: false,
      aiAppliedPatches: [],

      running: false,
      currentRun: null,
      liveStatuses: {},

      bottomTab: "results",
      activeTab: -1,
      compareVersionId: null,
      expandedResultId: null,
      selectedResultId: null,
      booted: false,
      sidebarCollapsed: false,
      inspectorCollapsed: false,
      bottomCollapsed: false,
      bottomMaximized: false,
      bottomHeight: 300,

      bootstrap: async () => {
        if (get().booted) return;
        try {
          const { projects } = await api<{
            projects: { id: string; name: string }[];
          }>("/api/prompts");
          if (projects.length === 0) {
            set({ booted: true });
            return;
          }
          // Reopen the last-active workspace if it still exists.
          const persistedId = get().projectId;
          const project =
            projects.find((p) => p.id === persistedId) ?? projects[0];
          set({
            projectId: project.id,
            projectName: project.name,
            projects: projects.map((p) => ({ id: p.id, name: p.name })),
            // The persisted draft conversation belongs to the active workspace.
            messagesByProject: {
              ...get().messagesByProject,
              [project.id]: get().messages,
            },
            activeTab: -1,
          });
          await get().refreshProject();

          // Fill editor from the latest version only if there is no draft yet.
          const { promptContent, versions } = get();
          const latest = versions[0];
          if ((!promptContent || promptContent.length === 0) && latest) {
            set({
              promptContent: latest.content,
              savedHash: latest.contentHash,
            });
          } else if (!get().savedHash && latest) {
            set({ savedHash: latest.contentHash });
          }

          try {
            const { presets } = await api<{ presets: ModelPreset[] }>(
              "/api/presets",
            );
            set({ presets });
          } catch {
            /* presets are optional */
          }

          void get().loadCopilot();
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Failed to load workspace",
          );
        } finally {
          set({ booted: true });
        }
      },

      refreshProject: async () => {
        const id = get().projectId;
        if (!id) return;
        const data = await api<{
          project: { id: string; name: string };
          versions: PromptVersion[];
          runs: RunSummary[];
          latestStatus: Record<string, ModelResultStatus>;
        }>(`/api/prompts/${id}`);
        set({
          projectName: data.project.name,
          versions: data.versions,
          runs: data.runs,
          latestStatus: data.latestStatus,
        });
      },

      setPrompt: (v) => set({ promptContent: v }),

      selectProject: async (id) => {
        const { projects, projectId: currentId, messages, messagesByProject } =
          get();
        const proj = projects.find((p) => p.id === id);
        if (!proj || id === currentId) return;
        // Save the current workspace's conversation; load the target's.
        const savedMap = currentId
          ? { ...messagesByProject, [currentId]: messages }
          : messagesByProject;
        const nextMessages = savedMap[id] ?? [
          { role: "user" as const, content: DEFAULT_USER_MESSAGE },
        ];
        set({
          projectId: id,
          projectName: proj.name,
          currentRun: null,
          compareVersionId: null,
          messages: nextMessages,
          messagesByProject: { ...savedMap, [id]: nextMessages },
          activeTab: -1,
        });
        await get().refreshProject();
        const latest = get().versions[0];
        if (latest)
          set({ promptContent: latest.content, savedHash: latest.contentHash });
      },

      newProject: async (name) => {
        try {
          const { project } = await api<{
            project: { id: string; name: string };
          }>("/api/prompts", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          set({
            projects: [
              { id: project.id, name: project.name },
              ...get().projects,
            ],
          });
          await get().selectProject(project.id);
          toast.success(`Created "${name}".`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to create project");
        }
      },

      deleteProject: async (id) => {
        const { projects, projectId } = get();
        if (projects.length <= 1) {
          toast.error("Can't delete the only workspace.");
          return;
        }
        try {
          await api(`/api/prompts/${id}`, { method: "DELETE" });
          const remaining = projects.filter((p) => p.id !== id);
          const nextByProject = { ...get().messagesByProject };
          delete nextByProject[id];
          set({ projects: remaining, messagesByProject: nextByProject });
          // If the active workspace was deleted, open another one.
          if (projectId === id) {
            const next = remaining[0];
            if (next) {
              set({ projectId: null });
              await get().selectProject(next.id);
            }
          }
          toast.success("Workspace deleted.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Failed to delete workspace",
          );
        }
      },

      toggleModel: (sel) => {
        const key = modelKey(sel);
        const exists = get().selectedModels.some((m) => modelKey(m) === key);
        set({
          selectedModels: exists
            ? get().selectedModels.filter((m) => modelKey(m) !== key)
            : [...get().selectedModels, sel],
        });
      },

      setSelectedModels: (m) => set({ selectedModels: m }),

      selectAllModels: () => {
        // Lazy import to avoid bundling catalog twice; catalog is tiny.
        import("@/lib/models/catalog").then(({ ALL_MODELS }) => {
          const copilot = get().copilotModels.map((m) => ({
            provider: "copilot" as const,
            modelId: m.id,
          }));
          set({
            selectedModels: [
              ...copilot,
              ...ALL_MODELS.map((m) => ({
                provider: m.provider,
                modelId: m.id,
              })),
            ],
          });
        });
      },

      clearModels: () => set({ selectedModels: [] }),

      setSettings: (patch) =>
        set({ settings: { ...get().settings, ...patch } }),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      setTools: (tools) => set({ tools }),

      addMessage: (role) => {
        const msgs = get().messages;
        const last = msgs[msgs.length - 1];
        // Alternate roles by default so adding turns builds a conversation.
        const nextRole = role ?? (last?.role === "user" ? "assistant" : "user");
        const next = [...msgs, { role: nextRole, content: "" }];
        // Focus the new message tab.
        set({ messages: next, activeTab: next.length - 1 });
      },
      updateMessage: (index, content) =>
        set({
          messages: get().messages.map((m, i) =>
            i === index ? { ...m, content } : m,
          ),
        }),
      setMessageRole: (index, role) =>
        set({
          messages: get().messages.map((m, i) =>
            i === index ? { ...m, role } : m,
          ),
        }),
      removeMessage: (index) => {
        const msgs = get().messages.filter((_, i) => i !== index);
        let activeTab = get().activeTab;
        if (activeTab === index) activeTab = index - 1; // prev message, or -1 (system)
        else if (activeTab > index) activeTab -= 1;
        set({ messages: msgs, activeTab });
      },
      setMessages: (messages) => set({ messages, activeTab: -1 }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setAiModel: (model) => set({ aiModel: model }),
      analyzeWithAI: async () => {
        const s = get();
        const content = selectActiveContent(s);
        if (!content.trim()) {
          toast.info("Nothing to analyze in this tab.");
          return;
        }
        set({ aiAnalyzing: true });
        try {
          const res = await api<{ findings: RiskFinding[] }>(
            "/api/risk/ai-analyze",
            {
              method: "POST",
              body: JSON.stringify({
                content,
                model: s.aiModel,
                tools:
                  s.activeTab < 0 && s.settings.includeTools ? s.tools : [],
              }),
            },
          );
          const findings = res.findings ?? [];
          set({
            aiFindings: findings,
            aiFindingsFor: content,
            aiAnalyzing: false,
            aiAppliedPatches: [],
            bottomTab: "risk",
            bottomCollapsed: false,
          });
          toast.success(
            `AI flagged ${findings.length} item${findings.length === 1 ? "" : "s"} with ${s.aiModel}.`,
          );
        } catch (e) {
          set({ aiAnalyzing: false });
          toast.error(e instanceof Error ? e.message : "AI analysis failed");
        }
      },
      applyAiPatch: (index) => {
        const s = get();
        const f = s.aiFindings[index];
        if (!f || !f.suggestion || s.aiAppliedPatches.includes(index)) return;
        const content = selectActiveContent(s);
        if (!content.includes(f.matchedText)) {
          toast.error("Couldn't find the text to patch — it may have changed.");
          return;
        }
        const next = content.replace(f.matchedText, f.suggestion);
        if (s.activeTab < 0) get().setPrompt(next);
        else get().updateMessage(s.activeTab, next);
        // Pin the AI panel to the patched content so the findings stay visible.
        set({
          aiFindingsFor: next,
          aiAppliedPatches: [...s.aiAppliedPatches, index],
        });
      },
      undoAiPatch: (index) => {
        const s = get();
        const f = s.aiFindings[index];
        if (!f || !f.suggestion) return;
        const content = selectActiveContent(s);
        if (!content.includes(f.suggestion)) {
          toast.error("Couldn't undo — the patched text was changed.");
          return;
        }
        const next = content.replace(f.suggestion, f.matchedText);
        if (s.activeTab < 0) get().setPrompt(next);
        else get().updateMessage(s.activeTab, next);
        set({
          aiFindingsFor: next,
          aiAppliedPatches: s.aiAppliedPatches.filter((i) => i !== index),
        });
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleInspector: () =>
        set({ inspectorCollapsed: !get().inspectorCollapsed }),
      toggleBottom: () => set({ bottomCollapsed: !get().bottomCollapsed }),
      toggleBottomMaximized: () => {
        const max = !get().bottomMaximized;
        // Maximizing implies an expanded (non-collapsed) panel.
        set({
          bottomMaximized: max,
          ...(max ? { bottomCollapsed: false } : {}),
        });
      },
      setBottomHeight: (height) =>
        set({ bottomHeight: Math.min(Math.max(Math.round(height), 140), 1000) }),

      runTest: async () => {
        const state = get();
        if (state.running) return;
        if (state.selectedModels.length === 0) {
          toast.error("Select at least one model to run.");
          return;
        }
        const live: Record<string, ModelResultStatus> = {};
        for (const m of state.selectedModels) live[modelKey(m)] = "running";
        set({ running: true, liveStatuses: live, bottomTab: "results" });

        abortController = new AbortController();
        try {
          const res = await api<{
            runId: string;
            promptVersionId: string;
            version: { versionNumber: number };
            status: RunStatus;
            startedAt: number;
            finishedAt: number;
            results: ModelResult[];
          }>("/api/runs", {
            method: "POST",
            body: JSON.stringify({
              projectId: state.projectId,
              promptContent: state.promptContent,
              userMessage: state.settings.userMessage,
              messages: state.messages,
              models: state.selectedModels,
              settings: state.settings,
              tools: state.settings.includeTools ? state.tools : [],
            }),
            signal: abortController.signal,
          });

          set({
            currentRun: {
              id: res.runId,
              versionId: res.promptVersionId,
              versionNumber: res.version.versionNumber,
              status: res.status,
              results: res.results,
              startedAt: res.startedAt,
              finishedAt: res.finishedAt,
            },
            savedHash: contentHash(state.promptContent),
            running: false,
            liveStatuses: {},
          });

          const filtered = res.results.filter((r) => r.filtered).length;
          if (filtered > 0) {
            toast.warning(
              `${filtered} model${filtered > 1 ? "s" : ""} content-filtered.`,
            );
          } else {
            toast.success("Run complete — no content filters.");
          }
          await get().refreshProject();
        } catch (e) {
          if (e instanceof Error && /abort/i.test(e.name + e.message)) {
            toast.info("Run cancelled.");
          } else {
            toast.error(e instanceof Error ? e.message : "Run failed");
          }
          set({ running: false, liveStatuses: {} });
        } finally {
          abortController = null;
        }
      },

      cancelRun: () => {
        abortController?.abort();
        set({ running: false, liveStatuses: {} });
      },

      saveVersion: async (name, changeSummary) => {
        const { projectId, promptContent } = get();
        if (!projectId) return;
        try {
          await api(`/api/prompts/${projectId}/versions`, {
            method: "POST",
            body: JSON.stringify({ name, content: promptContent, changeSummary }),
          });
          set({ savedHash: contentHash(promptContent) });
          await get().refreshProject();
          toast.success(`Saved version "${name}".`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to save version");
        }
      },

      restoreVersion: (id) => {
        const v = get().versions.find((x) => x.id === id);
        if (!v) return;
        // Show the restored system prompt (the conversation is unchanged — the
        // same test input is reused across a workspace's prompt revisions).
        set({ promptContent: v.content, savedHash: v.contentHash, activeTab: -1 });
        toast.info(`Restored ${v.name}.`);
      },

      duplicateVersion: async (id) => {
        const { projectId, versions } = get();
        const v = versions.find((x) => x.id === id);
        if (!projectId || !v) return;
        try {
          await api(`/api/prompts/${projectId}/versions`, {
            method: "POST",
            body: JSON.stringify({
              name: `Copy of ${v.name}`,
              content: v.content,
              changeSummary: `Duplicated from v${v.versionNumber}`,
            }),
          });
          await get().refreshProject();
          toast.success(`Duplicated ${v.name}.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to duplicate");
        }
      },

      deleteVersion: async (id) => {
        const { projectId } = get();
        if (!projectId) return;
        try {
          await api(`/api/prompts/${projectId}/versions/${id}`, {
            method: "DELETE",
          });
          await get().refreshProject();
          toast.success("Version deleted.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to delete version");
        }
      },

      loadRun: async (id) => {
        try {
          const detail = await api<{
            run: {
              id: string;
              promptVersionId: string;
              status: RunStatus;
              startedAt: number;
              finishedAt: number | null;
            };
            version: PromptVersion | null;
            results: ModelResult[];
          }>(`/api/runs/${id}`);
          set({
            currentRun: {
              id: detail.run.id,
              versionId: detail.run.promptVersionId,
              versionNumber: detail.version?.versionNumber ?? 0,
              status: detail.run.status,
              results: detail.results,
              startedAt: detail.run.startedAt,
              finishedAt: detail.run.finishedAt,
            },
            bottomTab: "results",
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to load run");
        }
      },

      setBottomTab: (t) => set({ bottomTab: t }),
      setCompareVersion: (id) =>
        set({ compareVersionId: id, bottomTab: id ? "diff" : get().bottomTab }),
      toggleExpanded: (id) =>
        set({ expandedResultId: get().expandedResultId === id ? null : id }),
      selectResult: (id) => set({ selectedResultId: id, bottomTab: "raw" }),

      savePreset: async (name) => {
        try {
          const { preset } = await api<{ preset: ModelPreset }>(
            "/api/presets",
            {
              method: "POST",
              body: JSON.stringify({ name, models: get().selectedModels }),
            },
          );
          set({ presets: [preset, ...get().presets] });
          toast.success(`Saved preset "${name}".`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to save preset");
        }
      },

      applyPreset: (id) => {
        const p = get().presets.find((x) => x.id === id);
        if (p) set({ selectedModels: p.models });
      },

      loadCopilot: async () => {
        try {
          const status = await api<{
            loggedIn: boolean;
            user?: CopilotUser;
          }>("/api/copilot/auth");
          if (status.loggedIn) {
            set({ copilotLoggedIn: true, copilotUser: status.user ?? null });
            await get().refreshCopilotModels();
          } else {
            set({
              copilotLoggedIn: false,
              copilotUser: null,
              copilotModels: [],
            });
          }
        } catch {
          /* offline / not configured */
        }
      },

      refreshCopilotModels: async () => {
        try {
          const data = await api<{ models: CopilotModel[] }>(
            "/api/copilot/models",
          );
          const models = data.models ?? [];
          set((s) => {
            // Drop any selected Copilot model that's no longer available (e.g.
            // filtered out as non-testable) so the matrix can't run it. Only
            // prune when we actually got a list back, to avoid clearing
            // selections on a transient empty response.
            if (models.length === 0) return { copilotModels: models };
            const available = new Set(models.map((m) => m.id));
            return {
              copilotModels: models,
              selectedModels: s.selectedModels.filter(
                (m) => m.provider !== "copilot" || available.has(m.modelId),
              ),
            };
          });
        } catch {
          /* ignore */
        }
      },

      onCopilotLogin: async (user) => {
        set({ copilotLoggedIn: true, copilotUser: user });
        await get().refreshCopilotModels();
      },

      copilotLogout: async () => {
        try {
          await api("/api/copilot/auth", {
            method: "POST",
            body: JSON.stringify({ action: "logout" }),
          });
        } catch {
          /* ignore */
        }
        set({
          copilotLoggedIn: false,
          copilotUser: null,
          copilotModels: [],
          selectedModels: get().selectedModels.filter(
            (m) => m.provider !== "copilot",
          ),
        });
        toast.info("Disconnected GitHub Copilot.");
      },
    }),
    {
      name: DRAFT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>;
        // v0 stored only a single settings.userMessage; seed the conversation
        // array from it so existing drafts keep their user message.
        if (
          version < 1 &&
          (!Array.isArray(s.messages) || (s.messages as unknown[]).length === 0)
        ) {
          const settings = s.settings as { userMessage?: string } | undefined;
          s.messages = [
            {
              role: "user",
              content: settings?.userMessage ?? DEFAULT_USER_MESSAGE,
            },
          ];
        }
        return s as unknown as StoreState;
      },
      partialize: (s) => ({
        projectId: s.projectId,
        promptContent: s.promptContent,
        savedHash: s.savedHash,
        selectedModels: s.selectedModels,
        settings: s.settings,
        tools: s.tools,
        messages: s.messages,
        messagesByProject: s.messagesByProject,
        aiModel: s.aiModel,
        bottomTab: s.bottomTab,
        sidebarCollapsed: s.sidebarCollapsed,
        inspectorCollapsed: s.inspectorCollapsed,
        bottomCollapsed: s.bottomCollapsed,
        bottomHeight: s.bottomHeight,
      }),
    },
  ),
);

/* ---- derived selectors (used across components) ---- */

/** Content of the active editor tab: system prompt (-1) or a message turn. */
export function selectActiveContent(s: StoreState): string {
  return s.activeTab < 0
    ? s.promptContent
    : (s.messages[s.activeTab]?.content ?? "");
}

export function selectIsDirty(s: StoreState): boolean {
  return contentHash(s.promptContent) !== s.savedHash;
}

export function selectStatusPill(s: StoreState): StatusPill {
  if (s.running) return "running";
  if (s.currentRun) {
    return s.currentRun.results.some((r) => r.filtered) ? "filtered" : "tested";
  }
  return "draft";
}

export const SEED_PROMPT = DEFAULT_PROMPT_CONTENT;
