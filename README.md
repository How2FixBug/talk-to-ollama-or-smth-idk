# Ollama Chat

A modular, local-first chat interface for Ollama. Built with plain HTML, CSS, and vanilla JavaScript modules. No framework, build step, account, or hosted chat backend.

## Open it on GitHub Pages

Once GitHub Pages is enabled for this repository, open:

https://how2fixbug.github.io/talk-to-ollama-or-smth-idk/

No Python server, Node server, or local build is needed. The site is static; your browser connects directly to Ollama running on your own computer.

## One-time Ollama CORS setup (macOS)

GitHub Pages and Ollama run on different origins, so Ollama must allow the GitHub Pages origin.

1. Quit Ollama completely.
2. In Terminal, run:

   ```sh
   launchctl setenv OLLAMA_ORIGINS "https://how2fixbug.github.io"
   ```

3. Open Ollama again.
4. Reload the GitHub Pages site and press **Try again** in the connection popup.

If Ollama was already launched from a Terminal session with a custom environment, set `OLLAMA_ORIGINS` there instead. Keep the origin exactly as shown above (no repository path and no trailing slash). Do not expose your Ollama API to the public internet.

The app's connection popup appears automatically if Ollama cannot be reached. It shows the current site origin and offers a retry button and a shortcut to connection settings.

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

Messages are sent directly from your browser to the Ollama server URL configured in Settings. Conversations and preferences are stored in this browser's local storage when chat-history saving is enabled. This app does not include analytics or a third-party chat API.
