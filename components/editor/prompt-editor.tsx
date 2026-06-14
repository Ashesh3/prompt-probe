"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { EditorProps, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Loader } from "lucide-react";
import { useStore, selectActiveContent } from "@/lib/store";
import { RISK_CATEGORY_META } from "@/lib/types";
import type { RiskFinding } from "@/lib/types";
import { definePromptProbeThemes, PP_DARK, PP_LIGHT } from "./monaco-theme";
import { setEditor } from "./editor-controller";

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-code-bg text-faint">
        <Loader className="size-4 animate-spin" />
      </div>
    ),
  },
);

export function PromptEditor() {
  const content = useStore(selectActiveContent);
  const activeTab = useStore((s) => s.activeTab);
  const setPrompt = useStore((s) => s.setPrompt);
  const updateMessage = useStore((s) => s.updateMessage);
  const { resolvedTheme } = useTheme();
  const editorTheme = resolvedTheme === "light" ? PP_LIGHT : PP_DARK;

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  function applyDecorations(items: RiskFinding[]) {
    const monaco = monacoRef.current;
    const collection = decoRef.current;
    if (!monaco || !collection) return;
    const decs: editor.IModelDeltaDecoration[] = [];
    for (const f of items) {
      const message = `**${RISK_CATEGORY_META[f.category].label}** — ${f.explanation}`;
      decs.push({
        range: new monaco.Range(f.lineStart, 1, f.lineEnd, 1),
        options: {
          isWholeLine: true,
          className: "pp-risk-line",
          linesDecorationsClassName: "pp-risk-glyph",
          hoverMessage: { value: message },
          overviewRuler: {
            color: "#ff6b78",
            position: monaco.editor.OverviewRulerLane.Right,
          },
          minimap: {
            color: "#ff6b78",
            position: monaco.editor.MinimapPosition.Inline,
          },
        },
      });
      if (
        typeof f.columnStart === "number" &&
        typeof f.columnEnd === "number" &&
        f.lineStart === f.lineEnd
      ) {
        decs.push({
          range: new monaco.Range(
            f.lineStart,
            f.columnStart + 1,
            f.lineEnd,
            f.columnEnd + 1,
          ),
          options: {
            inlineClassName: "pp-risk-phrase",
            hoverMessage: { value: message },
          },
        });
      }
    }
    collection.set(decs);
  }

  // Recompute decorations whenever the active tab content (or tools) changes.
  const includeTools = useStore((s) => s.settings.includeTools);
  const tools = useStore((s) => s.tools);
  useEffect(() => {
    let cancelled = false;
    import("@/lib/risk/scanner").then(({ analyzeRisk }) => {
      if (cancelled) return;
      applyDecorations(
        analyzeRisk(content, activeTab < 0 && includeTools ? tools : undefined),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [content, activeTab, includeTools, tools]);

  useEffect(() => () => setEditor(null), []);

  // Reliably switch the Monaco theme when the app theme changes.
  useEffect(() => {
    monacoRef.current?.editor.setTheme(editorTheme);
  }, [editorTheme]);

  return (
    <MonacoEditor
      language="markdown"
      theme={editorTheme}
      value={content}
      onChange={(v) => {
        const val = v ?? "";
        if (activeTab < 0) setPrompt(val);
        else updateMessage(activeTab, val);
      }}
      beforeMount={(monaco) => definePromptProbeThemes(monaco)}
      onMount={(ed, monaco) => {
        editorRef.current = ed;
        monacoRef.current = monaco;
        setEditor(ed);
        decoRef.current = ed.createDecorationsCollection([]);
        ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          void useStore.getState().runTest();
        });
        import("@/lib/risk/scanner").then(({ analyzeRisk }) => {
          const st = useStore.getState();
          applyDecorations(
            analyzeRisk(
              selectActiveContent(st),
              st.activeTab < 0 && st.settings.includeTools
                ? st.tools
                : undefined,
            ),
          );
        });
      }}
      options={{
        fontFamily:
          "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, monospace",
        fontSize: 13,
        lineHeight: 20,
        fontLigatures: true,
        minimap: { enabled: true, renderCharacters: false, maxColumn: 100 },
        lineNumbers: "on",
        glyphMargin: true,
        scrollBeyondLastLine: false,
        wordWrap: "off",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "all",
        overviewRulerBorder: false,
        cursorBlinking: "smooth",
        automaticLayout: true,
        guides: { indentation: true },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          useShadows: false,
        },
        stickyScroll: { enabled: false },
      }}
    />
  );
}
