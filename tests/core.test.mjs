import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../js/markdown.js";
import { OllamaClient } from "../js/ollama.js";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, loadChats, saveChats, makeChat, makeMessage } from "../js/storage.js";

test("Markdown formats common text and code blocks", () => {
  const html = renderMarkdown("## Hello\n\n**Bold** and `inline`.\n\n```js\nconst answer = 42;\n```");
  assert.match(html, /<h2>Hello<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<code>inline<\/code>/);
  assert.match(html, /const answer = 42;/);
});

test("Markdown escapes HTML and only links http(s) destinations", () => {
  const html = renderMarkdown('<img src=x onerror="alert(1)"> [safe](https://example.com) [unsafe](javascript:alert(1))');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test("Ollama client discovers model names", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ models: [{ name: "qwen3:4b" }, { name: "smollm2:latest" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const client = new OllamaClient("http://localhost:11434/");
    assert.deepEqual(await client.listModels(), ["qwen3:4b", "smollm2:latest"]);
  } finally { globalThis.fetch = originalFetch; }
});

test("Ollama client streams NDJSON tokens in order", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"message":{"content":"hello"},"done":false}\n{"message":{"content":" world"},"done":true}\n'));
      controller.close();
    }
  }), { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
  try {
    const tokens = [];
    const client = new OllamaClient("http://localhost:11434");
    const result = await client.chat({ model: "test", messages: [{ role: "user", content: "hi" }], temperature: 0.7, contextLength: 4096, onToken: (token) => tokens.push(token) });
    assert.equal(result, "hello world");
    assert.deepEqual(tokens, ["hello", " world"]);
  } finally { globalThis.fetch = originalFetch; }
});

test("local storage round-trips settings and conversations", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  saveSettings({ ...DEFAULT_SETTINGS, theme: "light" });
  assert.equal(loadSettings().theme, "light");
  const chat = makeChat();
  chat.messages.push(makeMessage("user", "hello"));
  saveChats([chat]);
  assert.equal(loadChats()[0].messages[0].content, "hello");
});
