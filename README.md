# Briefly

A calm AI companion in your Chrome side panel. It reads the page you're on, answers anything with live web search and citations, acts on pages for you (clicks, types, navigates), speaks its answers aloud, takes voice dictation, and turns any highlighted text into an instant action — all on your own Anthropic API key. No server, no account, no telemetry; nothing leaves your machine except calls to `api.anthropic.com` and `freetts.org`.

## 60 seconds to running

Prerequisites: Node 20+, Chrome 116+.

```sh
npm install
npm run build
```

1. Open `chrome://extensions`, turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick this project's `dist/` folder.
3. The welcome tab opens — paste your Anthropic API key (from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)) and hit **Verify**. The key lives only in the extension's local storage.
4. Optionally allow the microphone (for dictation), then **Open Briefly**.

Other commands: `npm run typecheck` · `npm test` · `npm run icons` (regenerates PNGs from `src/brand/icon.svg`).