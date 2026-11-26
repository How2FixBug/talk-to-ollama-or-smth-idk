const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function inlineMarkdown(text) {
  let value = escapeHTML(text);
  value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  value = value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/~~(.+?)~~/g, "<del>$1</del>").replace(/`([^`]+)`/g, "<code>$1</code>");
  return value;
}
export function renderMarkdown(source) {
  const text = String(source || "").replace(/\r\n/g, "\n");
  const chunks = text.split(/```/); let html = "";
  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) { const firstBreak = chunk.indexOf("\n"); const language = firstBreak >= 0 ? chunk.slice(0, firstBreak).trim() : ""; const code = firstBreak >= 0 ? chunk.slice(firstBreak + 1) : chunk; html += `<div class="code-block"><div class="code-header"><span>${escapeHTML(language || "code")}</span><button type="button" data-copy-code>Copy code</button></div><pre><code>${escapeHTML(code.replace(/\n$/, ""))}</code></pre></div>`; return; }
    const lines = chunk.split("\n"); let paragraph = []; let list = ""; let listType = "";
    const flushParagraph = () => { if (paragraph.length) { html += `<p>${inlineMarkdown(paragraph.join("<br>"))}</p>`; paragraph = []; } };
    const flushList = () => { if (list) { html += `<${listType}>${list}</${listType}>`; list = ""; listType = ""; } };
    for (const line of lines) {
      const heading = line.match(/^(#{1,3})\s+(.+)$/); const item = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/); const quote = line.match(/^>\s?(.*)$/);
      if (!line.trim()) { flushParagraph(); flushList(); continue; }
      if (heading) { flushParagraph(); flushList(); const level = heading[1].length; html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`; continue; }
      if (item) { flushParagraph(); const type = /^\d/.test(item[1]) ? "ol" : "ul"; if (listType && listType !== type) flushList(); listType = type; list += `<li>${inlineMarkdown(item[2])}</li>`; continue; }
      if (quote) { flushParagraph(); flushList(); html += `<blockquote>${inlineMarkdown(quote[1])}</blockquote>`; continue; }
      flushList(); paragraph.push(line);
    }
    flushParagraph(); flushList();
  });
  return html || "<p></p>";
}
export { escapeHTML };
