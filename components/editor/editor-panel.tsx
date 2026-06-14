"use client";

import { EditorToolbar } from "./editor-toolbar";
import { MessageContextBar } from "./message-context-bar";
import { PromptEditor } from "./prompt-editor";

export function EditorPanel() {
  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-code-bg">
      <EditorToolbar />
      <MessageContextBar />
      <div className="min-h-0 flex-1">
        <PromptEditor />
      </div>
    </div>
  );
}
