import { describe, it, expect } from "vitest";
import { diffLines, computeResultDeltas } from "@/lib/diff/diff";
import type { ModelResultStatus, ProviderId } from "@/lib/types";

describe("diffLines", () => {
  it("treats identical text as all equal with no add/remove", () => {
    const text = "alpha\nbeta\ngamma";
    const summary = diffLines(text, text);

    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.unchanged).toBe(3);
    expect(summary.lines).toHaveLength(3);
    expect(summary.lines.every((l) => l.op === "equal")).toBe(true);
    for (const line of summary.lines) {
      expect(line.oldLine).not.toBeNull();
      expect(line.newLine).not.toBeNull();
      expect(line.oldLine).toBe(line.newLine);
    }
  });

  it("handles a single identical line", () => {
    const summary = diffLines("only", "only");
    expect(summary.lines).toEqual([
      { op: "equal", oldLine: 1, newLine: 1, text: "only", risky: false },
    ]);
    expect(summary.unchanged).toBe(1);
  });

  it("treats two empty documents as one equal empty line", () => {
    const summary = diffLines("", "");
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.unchanged).toBe(1);
    expect(summary.lines).toEqual([
      { op: "equal", oldLine: 1, newLine: 1, text: "", risky: false },
    ]);
  });

  it("reports exactly one add for an appended line", () => {
    const summary = diffLines("a\nb", "a\nb\nc");

    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(0);
    expect(summary.unchanged).toBe(2);

    const adds = summary.lines.filter((l) => l.op === "add");
    expect(adds).toHaveLength(1);
    expect(adds[0]).toEqual({
      op: "add",
      oldLine: null,
      newLine: 3,
      text: "c",
      risky: false,
    });
  });

  it("reports exactly one remove for a deleted line", () => {
    const summary = diffLines("a\nb\nc", "a\nc");

    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(1);
    expect(summary.unchanged).toBe(2);

    const removes = summary.lines.filter((l) => l.op === "remove");
    expect(removes).toHaveLength(1);
    expect(removes[0]).toEqual({
      op: "remove",
      oldLine: 2,
      newLine: null,
      text: "b",
      risky: false,
    });
  });

  it("emits a changed middle line as exactly one remove followed by one add", () => {
    const summary = diffLines("alpha\nbeta\ngamma", "alpha\nBETA\ngamma");

    expect(summary.removed).toBe(1);
    expect(summary.added).toBe(1);
    expect(summary.unchanged).toBe(2);

    const ops = summary.lines.map((l) => l.op);
    expect(ops).toEqual(["equal", "remove", "add", "equal"]);

    // The removal must come immediately before the addition.
    const removeIdx = ops.indexOf("remove");
    const addIdx = ops.indexOf("add");
    expect(addIdx).toBe(removeIdx + 1);
  });

  it("numbers oldLine/newLine correctly across a 3-line change", () => {
    const summary = diffLines("alpha\nbeta\ngamma", "alpha\nBETA\ngamma");

    expect(summary.lines).toEqual([
      { op: "equal", oldLine: 1, newLine: 1, text: "alpha", risky: false },
      { op: "remove", oldLine: 2, newLine: null, text: "beta", risky: false },
      { op: "add", oldLine: null, newLine: 2, text: "BETA", risky: false },
      { op: "equal", oldLine: 3, newLine: 3, text: "gamma", risky: false },
    ]);
  });

  it("emits remove-before-add when a sole line is fully replaced", () => {
    const summary = diffLines("a", "b");
    expect(summary.lines.map((l) => l.op)).toEqual(["remove", "add"]);
    expect(summary.removed).toBe(1);
    expect(summary.added).toBe(1);
    expect(summary.unchanged).toBe(0);
  });

  it("represents an old document emptied to nothing as all removals", () => {
    const summary = diffLines("a\nb", "");
    // new text "" splits to a single empty line, which is an addition.
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(2);
    const newOnly = summary.lines.find((l) => l.op === "add");
    expect(newOnly).toEqual({
      op: "add",
      oldLine: null,
      newLine: 1,
      text: "",
      risky: false,
    });
  });

  it("splits on CRLF as well as LF", () => {
    const summary = diffLines("a\r\nb", "a\r\nb");
    expect(summary.unchanged).toBe(2);
    expect(summary.lines.map((l) => l.text)).toEqual(["a", "b"]);
  });

  it("preserves document order across multiple interleaved changes", () => {
    const summary = diffLines("a\nb\nc\nd", "a\nx\nc\ny\nd");
    expect(summary.lines.map((l) => `${l.op}:${l.text}`)).toEqual([
      "equal:a",
      "remove:b",
      "add:x",
      "equal:c",
      "add:y",
      "equal:d",
    ]);
    expect(summary.added).toBe(2);
    expect(summary.removed).toBe(1);
    expect(summary.unchanged).toBe(3);
  });

  it("flags risky phrasing on the relevant line only", () => {
    const summary = diffLines("hello world", "bypass controls now");

    const risky = summary.lines.find((l) => l.text === "bypass controls now");
    const benign = summary.lines.find((l) => l.text === "hello world");

    expect(risky?.risky).toBe(true);
    expect(benign?.risky).toBe(false);
  });

  it("sets risky=true for an added line containing a flagged phrase", () => {
    const summary = diffLines("hello world", "hello world\nbypass controls");
    const added = summary.lines.find((l) => l.op === "add");
    expect(added?.text).toBe("bypass controls");
    expect(added?.risky).toBe(true);
  });
});

describe("computeResultDeltas", () => {
  const mk = (
    provider: ProviderId,
    modelId: string,
    status: ModelResultStatus,
  ): { provider: ProviderId; modelId: string; status: ModelResultStatus } => ({
    provider,
    modelId,
    status,
  });

  it("marks a passed -> content_filter transition as changed", () => {
    const prev = [mk("anthropic", "claude", "passed")];
    const next = [mk("anthropic", "claude", "content_filter")];

    const deltas = computeResultDeltas(prev, next);
    expect(deltas).toEqual([
      {
        provider: "anthropic",
        modelId: "claude",
        from: "passed",
        to: "content_filter",
        changed: true,
      },
    ]);
  });

  it("marks an unchanged status as changed:false", () => {
    const prev = [mk("openai", "gpt", "passed")];
    const next = [mk("openai", "gpt", "passed")];

    const deltas = computeResultDeltas(prev, next);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].changed).toBe(false);
    expect(deltas[0].from).toBe("passed");
    expect(deltas[0].to).toBe("passed");
  });

  it("reports from:null for a model that exists only in next", () => {
    const prev = [mk("anthropic", "claude", "passed")];
    const next = [
      mk("anthropic", "claude", "passed"),
      mk("openai", "gpt", "refused"),
    ];

    const deltas = computeResultDeltas(prev, next);
    const fresh = deltas.find((d) => d.modelId === "gpt");
    expect(fresh).toEqual({
      provider: "openai",
      modelId: "gpt",
      from: null,
      to: "refused",
      changed: true,
    });
  });

  it("reports to:null for a model that exists only in prev", () => {
    const prev = [
      mk("anthropic", "claude", "passed"),
      mk("google", "gemini", "error"),
    ];
    const next = [mk("anthropic", "claude", "passed")];

    const deltas = computeResultDeltas(prev, next);
    const dropped = deltas.find((d) => d.modelId === "gemini");
    expect(dropped).toEqual({
      provider: "google",
      modelId: "gemini",
      from: "error",
      to: null,
      changed: true,
    });
  });

  it("orders next models first (in order), then prev-only models", () => {
    const prev = [
      mk("anthropic", "claude", "passed"),
      mk("google", "gemini", "error"),
    ];
    const next = [
      mk("openai", "gpt", "running"),
      mk("anthropic", "claude", "passed"),
    ];

    const deltas = computeResultDeltas(prev, next);
    expect(deltas.map((d) => d.modelId)).toEqual(["gpt", "claude", "gemini"]);
  });

  it("disambiguates models by provider as well as modelId", () => {
    const prev = [mk("anthropic", "shared", "passed")];
    const next = [
      mk("openai", "shared", "passed"),
      mk("anthropic", "shared", "refused"),
    ];

    const deltas = computeResultDeltas(prev, next);
    // openai/shared is brand new; anthropic/shared transitioned.
    const openai = deltas.find((d) => d.provider === "openai");
    const anthropic = deltas.find((d) => d.provider === "anthropic");
    expect(openai).toMatchObject({ from: null, to: "passed", changed: true });
    expect(anthropic).toMatchObject({
      from: "passed",
      to: "refused",
      changed: true,
    });
    expect(deltas).toHaveLength(2);
  });

  it("returns an entry for every model in the union", () => {
    const prev = [
      mk("anthropic", "a", "passed"),
      mk("openai", "b", "refused"),
    ];
    const next = [
      mk("openai", "b", "refused"),
      mk("google", "c", "running"),
    ];

    const deltas = computeResultDeltas(prev, next);
    expect(deltas.map((d) => d.modelId).sort()).toEqual(["a", "b", "c"]);
  });

  it("handles empty prev and empty next", () => {
    expect(computeResultDeltas([], [])).toEqual([]);

    const onlyNext = computeResultDeltas([], [mk("openai", "gpt", "passed")]);
    expect(onlyNext).toEqual([
      {
        provider: "openai",
        modelId: "gpt",
        from: null,
        to: "passed",
        changed: true,
      },
    ]);
  });
});
