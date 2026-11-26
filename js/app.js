import { $, renderChatList, renderMessages, showTyping, toast } from "./ui.js";
import { OllamaClient } from "./ollama.js";
import { loadChats, saveChats, loadSettings, makeChat, makeMessage } from "./storage.js";
import { initSettings, applyTheme } from "./settings.js";
import { renderMarkdown } from "./markdown.js";

let chats = loadChats();
let settings = loadSettings();
let activeId = chats[0]?.id || null;
let client = new OllamaClient(settings.serverUrl);
let controller = null;
let generating = false;
let availableModels = [];
let selectedModel = "";
let modelFilter = "all";
let modelSort = "az";
let favoriteModels = JSON.parse(localStorage.getItem("ollama-chat.favorites") || "[]");
const currentChat = () => chats.find(chat => chat.id === activeId) || null;
function persist() { saveChats(chats, settings.saveHistory); }
function setSettings(next) { settings = next; }
function showConnectionModal(title, message) { $("#connectionTitle").textContent = title; $("#connectionMessage").textContent = message; $("#connectionOrigin").textContent = location.origin; $("#corsCommand").textContent = "launchctl setenv OLLAMA_ORIGINS \"" + location.origin + "\""; $("#connectionOverlay").classList.remove("hidden"); }
function hideConnectionModal() { $("#connectionOverlay").classList.add("hidden"); }
function updateConnection(online, detail = "") { $("#connectionDot").className = "status-dot " + (online ? "online" : "offline"); $("#connectionLabel").textContent = online ? "Ollama connected" : "Ollama offline"; $("#connectionDetail").textContent = detail || (online ? availableModels.length + " model" + (availableModels.length === 1 ? "" : "s") + " available" : "Check your server URL"); $("#modelStatus").innerHTML = online ? '<i class="online"></i> Connected locally' : '<i></i> Not connected'; }
function renderModelPicker() {
  const query = $("#modelSearch").value.trim().toLowerCase();
  let models = [...availableModels].filter(name => name.toLowerCase().includes(query));
  if (modelFilter === "favorites") models = models.filter(name => favoriteModels.includes(name));
  models.sort((x,y) => modelSort === "az" ? x.localeCompare(y, undefined, {numeric:true,sensitivity:"base"}) : y.localeCompare(x, undefined, {numeric:true,sensitivity:"base"}));
  $("#modelPickerCount").textContent = models.length + " of " + availableModels.length + " installed models";
  $("#modelPickerList").innerHTML = "";
  if (!models.length) { $("#modelPickerList").innerHTML = "<div class='model-empty'>No models match these filters.</div>"; return; }
  for (const name of models) {
    const row = document.createElement("div");
    row.className = "model-row" + (name === selectedModel ? " selected" : "");
    row.innerHTML = "<button class='model-row-main' type='button'><span class='model-row-icon'>◈</span><span class='model-row-name'></span><span class='model-row-check'>✓</span></button><button class='model-favorite' type='button' aria-label='Toggle favorite'>★</button>";
    row.querySelector(".model-row-name").textContent = name;
    row.querySelector(".model-row-main").addEventListener("click", () => { selectedModel = name; $("#modelSelect").value = name; $("#selectedModelLabel").textContent = name; $("#modelPickerSelected").textContent = "Selected: " + name; renderModelPicker(); });
    const star = row.querySelector(".model-favorite");
    star.classList.toggle("active", favoriteModels.includes(name));
    star.addEventListener("click", () => { favoriteModels = favoriteModels.includes(name) ? favoriteModels.filter(item => item !== name) : [...favoriteModels, name]; localStorage.setItem("ollama-chat.favorites", JSON.stringify(favoriteModels)); renderModelPicker(); });
    $("#modelPickerList").append(row);
  }
}
function openModelPicker() { $("#modelPickerOverlay").classList.remove("hidden"); $("#modelSearch").value = ""; $("#modelPickerSelected").textContent = selectedModel ? "Selected: " + selectedModel : "No model selected"; renderModelPicker(); $("#modelSearch").focus(); }
function closeModelPicker() { $("#modelPickerOverlay").classList.add("hidden"); }
function render() {
  renderChatList(chats, activeId, $("#chatSearch").value);
  const chat = currentChat();
  $("#currentChatTitle").textContent = chat?.title || "New conversation";
  $("#welcome").classList.toggle("hidden", Boolean(chat?.messages.length));
  renderMessages(chat?.messages || [], settings.showTimestamps);
  $("#exportChat").disabled = !chat?.messages.length;
}
function createChat() { if (controller) controller.abort(); const chat = makeChat(); chats.unshift(chat); activeId = chat.id; persist(); render(); $("#messageInput").focus(); $("#sidebar").classList.remove("open"); }
function titleFromPrompt(text) { const clean = text.replace(/\s+/g, " ").trim(); return clean.length > 34 ? clean.slice(0, 34).trimEnd() + "…" : clean || "New conversation"; }
async function refreshModels() {
  $("#connectionLabel").textContent = "Connecting…"; $("#connectionDetail").textContent = client.baseUrl;
  try { availableModels = await client.listModels(); updateConnection(true); hideConnectionModal(); const select = $("#modelSelect"); const previous = selectedModel || select.value; select.innerHTML = ""; availableModels.sort((x,y) => x.localeCompare(y, undefined, {numeric:true,sensitivity:"base"})); if (!availableModels.length) { select.add(new Option("No models found", "")); $("#selectedModelLabel").textContent = "No models found"; renderModelPicker(); toast("Ollama is running, but no models are installed."); return; } for (const model of availableModels) select.add(new Option(model, model)); selectedModel = availableModels.includes(previous) ? previous : availableModels[0]; select.value = selectedModel; $("#selectedModelLabel").textContent = selectedModel; renderModelPicker(); }
  catch (error) { availableModels = []; updateConnection(false, error.message.includes("Failed to fetch") ? "Check URL and CORS settings" : error.message); $("#modelSelect").innerHTML = '<option value="">Ollama unavailable</option>'; showConnectionModal("Ollama isn't connected", error.message.includes("Failed to fetch") ? "Can't reach your Ollama server. It may be stopped, or this GitHub Pages origin may not be allowed by Ollama CORS." : error.message); }
}
function setGenerating(value) { generating = value; $("#sendButton").classList.toggle("hidden", value); $("#stopGeneration").classList.toggle("hidden", !value); $("#messageInput").disabled = value; }
async function sendPrompt(text, addUser = true) {
  const chat = currentChat(); if (!chat) { createChat(); return sendPrompt(text, addUser); }
  const model = $("#modelSelect").value;
  if (!model) { toast("Connect to Ollama and choose a model first."); return; }
  if (addUser) { chat.messages.push(makeMessage("user", text)); if (chat.messages.filter(message => message.role === "user").length === 1) chat.title = titleFromPrompt(text); }
  chat.updatedAt = Date.now(); persist(); render();
  const assistant = makeMessage("assistant", ""); chat.messages.push(assistant); persist(); showTyping(); setGenerating(true); controller = new AbortController();
  const history = chat.messages.filter(message => message.content).filter(message => message.id !== assistant.id).map(message => ({ role: message.role, content: message.content }));
  const messages = [...(settings.systemPrompt.trim() ? [{ role: "system", content: settings.systemPrompt }] : []), ...history];
  try {
    await client.chat({ model, messages, temperature: settings.temperature, contextLength: settings.contextLength, signal: controller.signal, onToken: (_token, fullText) => { assistant.content = fullText; const existing = document.querySelector(`[data-message-id="${assistant.id}"]`); if (!existing) { $("#typingIndicator")?.remove(); render(); } else { const content = existing.querySelector(".message-content"); if (content) { if (document.body.contains(content)) content.innerHTML = renderMarkdown(fullText); } } $("#messages").scrollTop = $("#messages").scrollHeight; } });
    if (!assistant.content) assistant.content = "*(No response received.)*";
  } catch (error) {
    if (error.name === "AbortError") { if (!assistant.content) chat.messages.pop(); }
    else { assistant.content = assistant.content ? assistant.content + "\n\n**Connection error:** " + error.message : "I couldn't reach Ollama. Check that Ollama is running and that this page is allowed by its CORS settings.\n\n" + error.message; toast("Couldn't complete the response"); }
  } finally { controller = null; setGenerating(false); chat.updatedAt = Date.now(); persist(); render(); $("#messageInput").focus(); }
}
function stopGeneration() { if (controller) controller.abort(); }
function exportChat() {
  const chat = currentChat(); if (!chat?.messages.length) { toast("This chat is empty"); return; }
  const content = `# ${chat.title}\n\n` + chat.messages.map(message => `## ${message.role === "user" ? "You" : "Assistant"} · ${new Date(message.createdAt).toLocaleString()}\n\n${message.content}\n`).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" })); const link = document.createElement("a"); link.href = url; link.download = (chat.title || "conversation").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + ".md"; link.click(); URL.revokeObjectURL(url); toast("Conversation exported");
}
function deleteChat(id) { const index = chats.findIndex(chat => chat.id === id); if (index < 0) return; chats.splice(index, 1); if (activeId === id) activeId = chats[0]?.id || null; persist(); render(); }

$("#newChat").addEventListener("click", createChat);
$("#openModelPicker").addEventListener("click", openModelPicker);
$("#closeModelPicker").addEventListener("click", closeModelPicker);
$("#doneModelPicker").addEventListener("click", closeModelPicker);
$("#modelPickerOverlay").addEventListener("click", event => { if (event.target === $("#modelPickerOverlay")) closeModelPicker(); });
$("#modelSearch").addEventListener("input", renderModelPicker);
document.querySelectorAll("[data-model-filter]").forEach(button => button.addEventListener("click", () => { modelFilter = button.dataset.modelFilter; document.querySelectorAll("[data-model-filter]").forEach(item => item.classList.toggle("active", item === button)); renderModelPicker(); }));
document.querySelectorAll("[data-model-sort]").forEach(button => button.addEventListener("click", () => { modelSort = button.dataset.modelSort; document.querySelectorAll("[data-model-sort]").forEach(item => item.classList.toggle("active", item === button)); renderModelPicker(); }));
$("#chatList").addEventListener("click", event => {
  const item = event.target.closest("[data-chat-id]"); if (!item) return; const id = item.dataset.chatId; const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) { if (controller) controller.abort(); activeId = id; render(); $("#sidebar").classList.remove("open"); return; }
  const chat = chats.find(entry => entry.id === id); if (!chat) return;
  if (action === "delete") { if (confirm("Delete this conversation?")) deleteChat(id); }
  if (action === "rename") { const title = prompt("Rename conversation:", chat.title); if (title?.trim()) { chat.title = title.trim(); persist(); render(); } }
  if (action === "pin") { chat.pinned = !chat.pinned; persist(); render(); }
});
$("#searchToggle").addEventListener("click", () => { $("#searchWrap").classList.toggle("hidden"); if (!$("#searchWrap").classList.contains("hidden")) $("#chatSearch").focus(); else { $("#chatSearch").value = ""; renderChatList(chats, activeId); } });
$("#chatSearch").addEventListener("input", () => renderChatList(chats, activeId, $("#chatSearch").value));
$("#sendButton").addEventListener("click", () => { const value = $("#messageInput").value.trim(); if (!value || generating) return; $("#messageInput").value = ""; $("#messageInput").style.height = "auto"; sendPrompt(value); });
$("#messageInput").addEventListener("input", event => { event.target.style.height = "auto"; event.target.style.height = Math.min(event.target.scrollHeight, 180) + "px"; });
$("#messageInput").addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey && settings.enterToSend) { event.preventDefault(); $("#sendButton").click(); } });
$("#stopGeneration").addEventListener("click", stopGeneration);
$("#refreshModels").addEventListener("click", refreshModels);
$("#retryConnection").addEventListener("click", refreshModels);
$("#copyCorsCommand").addEventListener("click", async () => { await navigator.clipboard.writeText("launchctl setenv OLLAMA_ORIGINS \"" + location.origin + "\""); $("#copyCorsCommand").textContent = "Copied"; });
$("#dismissConnection").addEventListener("click", hideConnectionModal);
$("#connectionSettings").addEventListener("click", () => { hideConnectionModal(); $("#openSettings").click(); });
$("#exportChat").addEventListener("click", exportChat);
$("#moreChat").addEventListener("click", () => { const chat = currentChat(); if (!chat) { toast("Start a conversation first"); return; } const choice = prompt("Type: rename, pin, or delete", "rename"); if (choice === "delete" && confirm("Delete this conversation?")) deleteChat(chat.id); else if (choice === "pin") { chat.pinned = !chat.pinned; persist(); render(); } else if (choice === "rename") { const title = prompt("Conversation name:", chat.title); if (title?.trim()) { chat.title = title.trim(); persist(); render(); } } });
$("#messages").addEventListener("click", async event => {
  const copyCode = event.target.closest("[data-copy-code]"); if (copyCode) { const code = copyCode.closest(".code-block").querySelector("code").textContent; await navigator.clipboard.writeText(code); copyCode.textContent = "Copied"; setTimeout(() => copyCode.textContent = "Copy code", 1200); return; }
  const action = event.target.closest("[data-message-action]"); if (!action) return; const messageEl = action.closest("[data-message-id]"); const chat = currentChat(); const message = chat?.messages.find(entry => entry.id === messageEl?.dataset.messageId); if (!message) return;
  if (action.dataset.messageAction === "copy") { await navigator.clipboard.writeText(message.content); toast("Copied to clipboard"); }
  if (action.dataset.messageAction === "retry") { const index = chat.messages.findIndex(entry => entry.id === message.id); const previousUser = [...chat.messages.slice(0,index)].reverse().find(entry => entry.role === "user"); if (!previousUser) return; chat.messages.splice(index); await sendPrompt(previousUser.content, false); }
});
document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => { $("#messageInput").value = button.dataset.prompt; $("#messageInput").focus(); $("#messageInput").dispatchEvent(new Event("input")); }));
$("#openSidebar").addEventListener("click", () => $("#sidebar").classList.add("open"));
$("#closeSidebar").addEventListener("click", () => $("#sidebar").classList.remove("open"));
document.addEventListener("keydown", event => { const mod = event.metaKey || event.ctrlKey; if (mod && event.key.toLowerCase() === "k") { event.preventDefault(); createChat(); } if (mod && event.key === ",") { event.preventDefault(); $("#openSettings").click(); } if (event.key === "Escape") { closeModelPicker(); $("#settingsOverlay").classList.add("hidden"); $("#sidebar").classList.remove("open"); } });

initSettings(() => settings, setSettings, url => { client.setBaseUrl(url); refreshModels(); });
applyTheme(settings.theme, settings);
if (!activeId && chats.length) activeId = chats[0].id;
render();
refreshModels();
