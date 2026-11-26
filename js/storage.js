const CHAT_KEY = "ollama-chat.conversations.v1";
const SETTINGS_KEY = "ollama-chat.settings.v1";
export const DEFAULT_SETTINGS = { serverUrl: "http://localhost:11434", theme: "dark", enterToSend: true, showTimestamps: true, saveHistory: true, compactMode: false, animations: true, systemPrompt: "You are a helpful assistant.", temperature: 0.7, contextLength: 4096 };
export function loadChats() { try { const value = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
export function saveChats(chats, enabled = true) { if (!enabled) { localStorage.removeItem(CHAT_KEY); return; } localStorage.setItem(CHAT_KEY, JSON.stringify(chats)); }
export function loadSettings() { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; } catch { return { ...DEFAULT_SETTINGS }; } }
export function saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
export function makeChat() { return { id: crypto.randomUUID(), title: "New conversation", createdAt: Date.now(), updatedAt: Date.now(), pinned: false, messages: [] }; }
export function makeMessage(role, content) { return { id: crypto.randomUUID(), role, content, createdAt: Date.now() }; }
