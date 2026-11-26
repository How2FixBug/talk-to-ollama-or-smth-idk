export class OllamaClient {
  constructor(baseUrl) { this.setBaseUrl(baseUrl); }
  setBaseUrl(url) { this.baseUrl = (url || "http://localhost:11434").trim().replace(/\/+$/, ""); }
  async request(path, options = {}) { const response = await fetch(this.baseUrl + path, options); if (!response.ok) { let detail = ""; try { detail = (await response.json()).error || ""; } catch {} throw new Error(detail || `Ollama returned ${response.status}`); } return response; }
  async listModels() { const response = await this.request("/api/tags"); const data = await response.json(); return (data.models || []).map(model => model.name).filter(Boolean); }
  async chat({ model, messages, temperature, contextLength, signal, onToken }) {
    const response = await this.request("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal, body: JSON.stringify({ model, messages, stream: true, options: { temperature, num_ctx: contextLength } }) });
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let fullText = "";
    while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || ""; for (const line of lines) { if (!line.trim()) continue; let data; try { data = JSON.parse(line); } catch { continue; } if (data.error) throw new Error(data.error); const token = data.message?.content || ""; if (token) { fullText += token; onToken(token, fullText); } if (data.done) return fullText; } }
    if (buffer.trim()) { try { const data = JSON.parse(buffer); if (data.message?.content) { fullText += data.message.content; onToken(data.message.content, fullText); } } catch {} }
    return fullText;
  }
}
