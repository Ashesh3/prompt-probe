import type { RiskCategory } from "@/lib/types";

/**
 * Canonical risk-phrase data for Prompt Probe's deterministic scanner.
 *
 * IMPORTANT (docs/SECURITY.md): all language here is DIAGNOSTIC. Patterns
 * describe wording that providers *often associate with* content filters.
 * Nothing here advises how to bypass anything.
 */

export interface PhrasePattern {
  /** Source for a case-insensitive matcher. Compiled with the `gi` flags. */
  source: string;
  category: RiskCategory;
  /** 0..1 — how strongly this phrase tends to correlate with filtering. */
  confidence: number;
  explanation: string;
}

export const RISK_PATTERNS: PhrasePattern[] = [
  // --- instruction override -------------------------------------------------
  {
    source: "\\bdo not refuse\\b",
    category: "instruction-override",
    confidence: 0.9,
    explanation:
      "Directives telling the model never to refuse frequently correlate with safety-filter activation.",
  },
  {
    source: "\\b(must|always) comply\\b",
    category: "instruction-override",
    confidence: 0.82,
    explanation:
      "Unconditional-compliance wording reads as an attempt to override default behavior.",
  },
  {
    source: "\\bignore (all |any )?(previous|prior|earlier) (instructions|messages|context)\\b",
    category: "instruction-override",
    confidence: 0.92,
    explanation:
      "Instruction to ignore prior context is a classic override pattern providers watch for.",
  },
  {
    source: "\\b(override|overrides|overriding) (the )?(system|default|safety)\\b",
    category: "instruction-override",
    confidence: 0.88,
    explanation:
      "Explicitly overriding system or safety instructions is a strong filter trigger.",
  },
  {
    source: "\\b(takes? precedence|highest priority|instruction priority)\\b",
    category: "instruction-override",
    confidence: 0.6,
    explanation:
      "Priority-assertion language can read as an attempt to supersede safety rules.",
  },
  {
    source: "\\bwithout (warning|warnings|moral|caveats?|disclaimer)\\b",
    category: "instruction-override",
    confidence: 0.66,
    explanation:
      "Suppressing warnings or disclaimers is associated with jailbreak-style prompts.",
  },

  // --- bypass / compliance --------------------------------------------------
  {
    source: "\\bbypass(ing)? (controls|filters|safety|restrictions|guardrails)\\b",
    category: "bypass-compliance",
    confidence: 0.93,
    explanation:
      "Direct references to bypassing controls are among the most reliable filter triggers.",
  },
  {
    source: "\\b(circumvent|evade|get around) (the )?(filter|filters|controls|safeguards?)\\b",
    category: "bypass-compliance",
    confidence: 0.85,
    explanation:
      "Synonyms for evading safeguards are flagged similarly to explicit bypass wording.",
  },
  {
    source: "\\b(unrestricted|unfiltered|no restrictions|without restrictions)\\b",
    category: "bypass-compliance",
    confidence: 0.7,
    explanation:
      "Claims of operating without restrictions read as removing safety scaffolding.",
  },
  {
    source: "\\bjailbreak\\b",
    category: "bypass-compliance",
    confidence: 0.9,
    explanation:
      "The term jailbreak itself is strongly associated with filter activation.",
  },

  // --- dual-use security ----------------------------------------------------
  {
    source: "\\bmalware( analysis)?\\b",
    category: "dual-use-security",
    confidence: 0.78,
    explanation:
      "Security terminology like malware is dual-use and can trip provider filters even in defensive contexts.",
  },
  {
    source: "\\b(exploit|exploitation|exploit development)\\b",
    category: "dual-use-security",
    confidence: 0.74,
    explanation:
      "Exploit-related wording is dual-use and frequently flagged out of context.",
  },
  {
    source: "\\b(ransomware|rootkit|keylogger|shellcode|payload)\\b",
    category: "dual-use-security",
    confidence: 0.8,
    explanation:
      "Specific offensive-tooling terms raise filter sensitivity regardless of intent.",
  },
  {
    source: "\\b(reverse[- ]engineer(ing)?|disassembl(e|y|er))\\b",
    category: "dual-use-security",
    confidence: 0.6,
    explanation:
      "Reverse-engineering language is dual-use and can be associated with filters.",
  },
  {
    source: "\\b(privilege escalation|penetration test(ing)?|red[- ]team(ing)?|offensive security)\\b",
    category: "dual-use-security",
    confidence: 0.68,
    explanation:
      "Authorized security-testing terms are dual-use and still raise filter sensitivity.",
  },
  {
    source: "\\b(licensing|license key|key verification) (bypass|crack|patch)\\b",
    category: "dual-use-security",
    confidence: 0.72,
    explanation:
      "Licensing/key-verification tampering wording is commonly filtered.",
  },

  // --- high-risk standalone terms ------------------------------------------
  {
    source: "\\b(weapon|explosive|bioweapon)\\b",
    category: "high-risk-term",
    confidence: 0.85,
    explanation:
      "Standalone high-risk terms are filtered by most providers irrespective of context.",
  },
  {
    source: "\\b(self[- ]harm|suicide)\\b",
    category: "high-risk-term",
    confidence: 0.8,
    explanation:
      "Sensitive-harm terms invoke dedicated safety classifiers.",
  },
];

/** Markers that indicate injected harness / agent-scaffolding context. */
export const ROLE_HARNESS_MARKERS: PhrasePattern[] = [
  {
    source: "<\\/?(system-reminder|EXTREMELY_IMPORTANT|IMPORTANT|function_calls|antml:)",
    category: "role-harness",
    confidence: 0.7,
    explanation:
      "Harness control tags injected into the prompt can read as out-of-band roleplay context.",
  },
  {
    source: "\\byou (are|have) (an? )?(ai|assistant|superpowers|access to)\\b",
    category: "role-harness",
    confidence: 0.5,
    explanation:
      "Agent self-description lines are common in harness context and add filter surface.",
  },
  {
    source: "^(user|assistant|system)\\s*:",
    category: "role-harness",
    confidence: 0.45,
    explanation:
      "Inline role markers suggest a transcript embedded as user content.",
  },
];

const compiledAll: { re: RegExp; p: PhrasePattern }[] = RISK_PATTERNS.map(
  (p) => ({ re: new RegExp(p.source, "gi"), p }),
);

export interface PhraseMatch {
  start: number;
  end: number;
  text: string;
  category: RiskCategory;
  confidence: number;
  explanation: string;
}

/** All risk-phrase matches within a single line, with character offsets. */
export function riskyMatchesInLine(line: string): PhraseMatch[] {
  const out: PhraseMatch[] = [];
  for (const { re, p } of compiledAll) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        category: p.category,
        confidence: p.confidence,
        explanation: p.explanation,
      });
      if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** True when a line contains any risky phrasing (used by editor + diff). */
export function lineIsRisky(line: string): boolean {
  for (const { re } of compiledAll) {
    re.lastIndex = 0;
    if (re.test(line)) return true;
  }
  return false;
}
