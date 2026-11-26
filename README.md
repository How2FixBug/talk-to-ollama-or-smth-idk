# Ollama Chat

A modular, local-first chat interface for Ollama. Built with plain HTML, CSS, and JavaScript modules — no framework, build step, account, or hosted chat backend.

## Run it

1. Make sure [Ollama](https://ollama.com) is installed and running.
2. Serve this folder from a local web server (ES modules do not run reliably from a `file://` URL). For example, from this folder run `python3 -m http.server 8000`.
3. Open `http://localhost:8000`.
4. Choose an installed model and start chatting.

The default Ollama address is `http://localhost:11434`. Change it in **Settings → General** if your server uses another address.

### CORS note

If the interface is hosted on another origin (for example, GitHub Pages), Ollama must allow that exact origin. Set the `OLLAMA_ORIGINS` environment variable to include the page's origin, then restart Ollama. For local development, allow the local origin you use (such as `http://localhost:8000`). Do not expose an Ollama server to the public internet without appropriate network protections.

## Features

- Streaming responses with stop generation
- New chats, searchable history, rename, pin, delete, and Markdown export
- Model discovery from the connected Ollama server
- Dark, light, and system themes
- Responsive sidebar and mobile layout
- System prompt, temperature, and context-length controls
- Copy messages and code blocks; regenerate the last assistant response
- Keyboard shortcuts: `⌘/Ctrl + K` for a new chat and `⌘/Ctrl + ,` for settings
- Local browser storage with a setting to disable chat-history persistence
- Reduced-motion toggle and compact chat spacing

## Project structure

```
index.html
styles.css
js/
  app.js       # Application state and event wiring
  ollama.js    # Ollama HTTP + streaming API client
  storage.js   # Local settings and conversation persistence
  settings.js  # Settings UI and theme application
  ui.js        # DOM rendering and small UI helpers
  markdown.js  # Safe, lightweight Markdown renderer
```

## Privacy

Messages are sent to the Ollama server URL configured in Settings. Conversations and preferences are stored in this browser's local storage when chat-history saving is enabled. This app does not include analytics or a third-party chat API.
