import { describe, it, expect } from "vitest";
import { parseCapture, REDACTION_KEYS } from "@/lib/import/capture";

describe("REDACTION_KEYS", () => {
  it("contains the documented header/field names", () => {
    expect(REDACTION_KEYS).toEqual([
      "authorization",
      "cookie",
      "set-cookie",
      "api_key",
      "access_token",
      "refresh_token",
      "x-api-key",
      "api-key",
    ]);
  });
});

describe("parseCapture — plain Anthropic-style JSON body", () => {
  const body = JSON.stringify({
    system: "You are a helpful assistant.",
    messages: [{ role: "user", content: "hi" }],
    tools: [{ name: "x" }],
    max_tokens: 128,
    temperature: 0.5,
  });

  it("extracts the system prompt", () => {
    expect(parseCapture(body).systemPrompt).toBe("You are a helpful assistant.");
  });

  it("extracts a single message with string content", () => {
    const result = parseCapture(body);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({ role: "user", content: "hi" });
  });

  it("extracts a single tool schema as opaque data", () => {
    const result = parseCapture(body);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("x");
  });

  it("normalizes OpenAI-format tools to a top-level name", () => {
    const openai = JSON.stringify({
      messages: [],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Look up weather",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    });
    const result = parseCapture(openai);
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe("get_weather");
    expect(result.tools[0].description).toBe("Look up weather");
  });

  it("preserves tool-call turns across the whole conversation", () => {
    const capture = JSON.stringify({
      system: "You are an agent.",
      messages: [
        { role: "user", content: "Read the file." },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "Read", arguments: "{}" },
            },
          ],
        },
        { role: "tool", tool_call_id: "call_1", content: "file contents" },
      ],
    });
    const result = parseCapture(capture);
    expect(result.systemPrompt).toBe("You are an agent.");
    // All three turns survive (the tool turn used to be dropped).
    expect(result.messages).toHaveLength(3);
    expect(result.messages[1].tool_calls).toBeTruthy();
    expect(result.messages[2].role).toBe("tool");
    expect(result.messages[2].tool_call_id).toBe("call_1");
  });

  it("extracts settings including maxTokens === 128", () => {
    const result = parseCapture(body);
    expect(result.settings.maxTokens).toBe(128);
    expect(result.settings.temperature).toBe(0.5);
  });

  it("does not invent settings that were absent", () => {
    expect(parseCapture(body).settings.stream).toBeUndefined();
  });

  it("reports no redactions for a clean body", () => {
    expect(parseCapture(body).redactions).toEqual([]);
  });
});

describe("parseCapture — content blocks", () => {
  it("joins .text of message content blocks", () => {
    const body = JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
          ],
        },
      ],
    });
    expect(parseCapture(body).messages[0].content).toBe("Hello world");
  });

  it("ignores content blocks without a .text field", () => {
    const body = JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: {} },
            { type: "text", text: "caption" },
          ],
        },
      ],
    });
    expect(parseCapture(body).messages[0].content).toBe("caption");
  });

  it("joins .text of a system array-of-text-blocks", () => {
    const body = JSON.stringify({
      system: [
        { type: "text", text: "Part one. " },
        { type: "text", text: "Part two." },
      ],
      messages: [],
    });
    expect(parseCapture(body).systemPrompt).toBe("Part one. Part two.");
  });

  it("falls back to a system-role message when no system field exists", () => {
    const body = JSON.stringify({
      messages: [
        { role: "system", content: "Be terse." },
        { role: "user", content: "go" },
      ],
    });
    const result = parseCapture(body);
    expect(result.systemPrompt).toBe("Be terse.");
    // The system entry still appears in the mapped messages list.
    expect(result.messages).toHaveLength(2);
  });

  it("uses null systemPrompt when nothing supplies one", () => {
    const body = JSON.stringify({ messages: [{ role: "user", content: "x" }] });
    expect(parseCapture(body).systemPrompt).toBeNull();
  });
});

describe("parseCapture — debug export with Request Body marker", () => {
  const debug = [
    "POST https://api.anthropic.com/v1/messages",
    "x-api-key: secret-key-do-not-log",
    "Request Body",
    JSON.stringify({
      system: "Helpful.",
      messages: [{ role: "user", content: "hi" }],
    }),
  ].join("\n");

  it("parses the first balanced object after the marker", () => {
    const result = parseCapture(debug);
    expect(result.systemPrompt).toBe("Helpful.");
    expect(result.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("matches the marker case-insensitively", () => {
    const lower = debug.replace("Request Body", "request body");
    expect(parseCapture(lower).systemPrompt).toBe("Helpful.");
  });

  it("falls back to the first balanced object when no marker is present", () => {
    const noMarker = "garbage prose before { not json\n" +
      JSON.stringify({ system: "Found.", messages: [] });
    expect(parseCapture(noMarker).systemPrompt).toBe("Found.");
  });
});

describe("parseCapture — redaction by key", () => {
  it("redacts a nested Authorization header value", () => {
    // Nest the header inside a tool schema, which is surfaced as opaque data,
    // so we can assert the placeholder actually flows into the output.
    const body = JSON.stringify({
      tools: [{ name: "fetch", Authorization: "topsecretvalue123" }],
      messages: [],
    });
    const result = parseCapture(body);
    expect(result.tools[0].Authorization).toBe("[REDACTED_AUTHORIZATION]");
    expect(JSON.stringify(result)).not.toContain("topsecretvalue123");
    expect(result.redactions).toContain("authorization");
  });

  it("records the lowercased key regardless of original casing", () => {
    const body = JSON.stringify({ Cookie: "sid=abc; theme=dark", messages: [] });
    expect(parseCapture(body).redactions).toContain("cookie");
  });

  it("redacts secrets that appear inside extracted outputs", () => {
    const body = JSON.stringify({
      messages: [{ role: "user", content: "key=plainsecret" }],
      api_key: "plainsecret",
    });
    const result = parseCapture(body);
    expect(result.redactions).toContain("api_key");
  });
});

describe("parseCapture — redaction by token pattern", () => {
  it("redacts a Bearer token in a string value", () => {
    const body = JSON.stringify({
      messages: [{ role: "user", content: "Bearer abc123def456" }],
    });
    const result = parseCapture(body);
    expect(result.messages[0].content).toBe("[REDACTED_TOKEN]");
    expect(result.redactions).toContain("bearer");
  });

  it("redacts an OpenAI-style sk- key", () => {
    const body = JSON.stringify({
      messages: [{ role: "user", content: "sk-ABCDEFGHIJ1234567890" }],
    });
    const result = parseCapture(body);
    expect(result.messages[0].content).toBe("[REDACTED_TOKEN]");
    expect(result.redactions).toContain("api_key");
  });

  it("redacts a GitHub token while preserving surrounding text", () => {
    const body = JSON.stringify({
      messages: [{ role: "user", content: "token ghp_ABCDEF1234567890zz here" }],
    });
    const result = parseCapture(body);
    expect(result.messages[0].content).toBe("token [REDACTED_TOKEN] here");
    expect(result.redactions).toContain("github_token");
  });

  it("scans raw debug text outside the JSON body for secrets", () => {
    const debug = [
      "Authorization: Bearer raw_header_token_value",
      "Request Body",
      JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    ].join("\n");
    const result = parseCapture(debug);
    expect(result.redactions).toContain("bearer");
    expect(result.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("de-duplicates repeated redactions", () => {
    const body = JSON.stringify({
      messages: [
        { role: "user", content: "Bearer aaaaaaaaaa" },
        { role: "user", content: "Bearer bbbbbbbbbb" },
      ],
    });
    const result = parseCapture(body);
    expect(result.redactions.filter((r) => r === "bearer")).toHaveLength(1);
  });
});

describe("parseCapture — malformed input", () => {
  const empty = {
    systemPrompt: null,
    messages: [],
    tools: [],
    settings: {},
    redactions: [],
  };

  it("returns an empty capture for garbage text without throwing", () => {
    expect(() => parseCapture("this is not json at all {{{ broken"))
      .not.toThrow();
    expect(parseCapture("this is not json at all {{{ broken")).toEqual(empty);
  });

  it("returns an empty capture for an empty string", () => {
    expect(parseCapture("")).toEqual(empty);
  });

  it("returns an empty capture for whitespace only", () => {
    expect(parseCapture("   \n\t ")).toEqual(empty);
  });

  it("returns an empty capture for a non-object JSON value", () => {
    expect(parseCapture("[1, 2, 3]")).toEqual(empty);
  });

  it("returns an empty capture when braces never balance", () => {
    expect(parseCapture('prefix {"a": 1')).toEqual(empty);
  });
});
