import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  countChars,
  formatCount,
  formatCompact,
} from "@/lib/tokens/estimate";

describe("estimateTokens", () => {
  it("returns 0 for an empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(estimateTokens("   ")).toBe(0);
    expect(estimateTokens("\n\t  \n")).toBe(0);
  });

  it("counts at least one token for a single word", () => {
    expect(estimateTokens("hello")).toBeGreaterThanOrEqual(1);
  });

  it("never undercounts a single very long word below one token", () => {
    // 3 chars -> ceil(3/4) = 1, words = 1, so >= 1.
    expect(estimateTokens("hi!")).toBeGreaterThanOrEqual(1);
    // One long word: word-count floor keeps it >= 1.
    expect(estimateTokens("a")).toBe(1);
  });

  it("uses the word-count floor when words exceed the char heuristic", () => {
    // 8 single-char words separated by spaces: length 15 -> ceil(15/4) = 4,
    // but there are 8 words, so the word floor wins.
    const text = "a a a a a a a a";
    expect(estimateTokens(text)).toBe(8);
  });

  it("uses the char heuristic for dense text", () => {
    // "abcdefgh" -> 1 word, ceil(8/4) = 2 -> max(1, 2) = 2.
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("is monotonic-ish: longer text estimates at least as many tokens", () => {
    const short = "The quick brown fox.";
    const long = short + " " + short + " " + short;
    expect(estimateTokens(long)).toBeGreaterThanOrEqual(estimateTokens(short));
  });

  it("estimates a ~400-char string within a plausible range", () => {
    const text = "word ".repeat(80); // length 400
    expect(text.length).toBe(400);
    const est = estimateTokens(text);
    expect(est).toBeGreaterThanOrEqual(50);
    expect(est).toBeLessThanOrEqual(200);
  });

  it("is deterministic across repeated calls", () => {
    const text = "deterministic output should not change between runs";
    expect(estimateTokens(text)).toBe(estimateTokens(text));
  });
});

describe("countChars", () => {
  it("returns the raw length", () => {
    expect(countChars("")).toBe(0);
    expect(countChars("abc")).toBe(3);
    expect(countChars("  spaced  ")).toBe(10);
  });

  it("counts whitespace and newlines", () => {
    expect(countChars("a\nb")).toBe(3);
  });
});

describe("formatCount", () => {
  it("comma-groups thousands", () => {
    expect(formatCount(1284)).toBe("1,284");
  });

  it("leaves sub-thousand values ungrouped", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(0)).toBe("0");
  });

  it("rounds non-integers before formatting", () => {
    expect(formatCount(1283.6)).toBe("1,284");
  });

  it("groups millions", () => {
    expect(formatCount(1_200_000)).toBe("1,200,000");
  });
});

describe("formatCompact", () => {
  it("returns the rounded integer below 1,000", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
  });

  it("formats thousands with a single decimal and 'k'", () => {
    expect(formatCompact(5900)).toBe("5.9k");
  });

  it("trims a trailing .0 in the 'k' range", () => {
    expect(formatCompact(1000)).toBe("1k");
  });

  it("formats millions with a single decimal and 'M'", () => {
    expect(formatCompact(1_200_000)).toBe("1.2M");
  });

  it("trims a trailing .0 in the 'M' range", () => {
    expect(formatCompact(1_000_000)).toBe("1M");
  });
});
