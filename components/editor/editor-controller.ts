import type { editor } from "monaco-editor";

let instance: editor.IStandaloneCodeEditor | null = null;

export function setEditor(e: editor.IStandaloneCodeEditor | null): void {
  instance = e;
}

export function openFind(): void {
  instance?.getAction("actions.find")?.run();
  instance?.focus();
}

export function focusEditor(): void {
  instance?.focus();
}

export function revealLine(line: number): void {
  if (!instance) return;
  instance.revealLineInCenter(line);
  instance.setPosition({ lineNumber: line, column: 1 });
  instance.focus();
}
