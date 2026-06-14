/**
 * Tiny, dependency-free, deterministic string hash (cyrb53).
 * Used for prompt content hashes, commit-style short ids, and cheap
 * change detection on the client. Not cryptographic.
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable 14-char hex content hash. */
export function contentHash(input: string): string {
  return cyrb53(input).toString(16).padStart(14, "0");
}

/** Commit-style short hash, e.g. "5b2e10". */
export function shortHash(input: string): string {
  return contentHash(input).slice(0, 6);
}
