# Bugs — Confirmed

Defects that are provably present in the current code: each has a real trigger, a real thing the user sees go wrong, and a cause traced through files that were read directly. Ordered from most to least serious.

---

### 1. An empty assistant reply blocks every following message in the same chat

**Severity** — High

**Area** — The side-panel conversation store and the Anthropic request-assembly layer. The concept at the center is the chat "history": the list of past turns that Briefly rebuilds into an API request every time you send.

**Where the user hits it** — In the side panel, right after a reply fails or is cut short. The assistant's bubble is left blank — an error notice, or a stopped agent with no closing summary. The person types their next question, sends it, and instead of an answer gets a flat "The API couldn't accept this request." Trying again produces the same wall. It feels like the whole conversation has jammed for no clear reason, because the message they just typed was perfectly ordinary.

**Hotspot Files**

- `src/sidepanel/store.ts` (side panel) — assembles the on-screen turns into the list sent to the API.
- `src/sidepanel/agent.ts` (side panel) — the agent path that can leave a blank assistant turn when stopped.
- `src/lib/anthropic/preflight.ts` (Anthropic layer) — the last checkpoint before sending, which validates tool ordering but not turn alternation.

**Trigger and consequence** — The problem needs one blank assistant turn to exist anywhere in the thread. A turn ends blank in several ordinary ways: a request that fails before any words stream (a brief network drop, a rejected key, an "overloaded" response that outlives its retries, or the context block described in bug 3); an agent task that the user stops before it writes its summary; or a model turn that simply comes back with no text. In each case the blank bubble is saved as-is. The very next message the user sends then fails with the bad-request error. Crucially, this is not self-healing: once a blank bubble sits earlier in the thread, even the built-in "Retry" on the newest turn hits the same wall, because retrying rebuilds the same broken shape. The only way out is starting a fresh chat, which abandons the thread. It reproduces every time: start an "Act" task, stop it immediately so its bubble stays blank, then switch to Chat and send any message.

**Proven mechanism** — When Briefly converts the visible conversation into the list of turns for the API, it keeps only turns that still have real content → a blank assistant turn contributes nothing and is dropped from that list → the user turn just before it and the user turn just after it now sit directly next to each other → the request goes out with two user turns in a row → the Anthropic API requires turns to strictly alternate between user and assistant, so it rejects the request as malformed → that rejection surfaces as the generic "couldn't accept this request." Because the drop-the-blank-turn step runs on every rebuild, a later "Retry" recreates the same adjacency whenever the blank bubble is not the last message, which is why nothing short of a new conversation clears it.

---

### 2. Leaving a running agent task throws away everything it did

**Severity** — High

**Area** — The side-panel store's saving path and the agent loop. The concept is how an agent turn's steps and final answer are written to the local database (IndexedDB, via Dexie).

**Where the user hits it** — The user starts an "Act" task that will take many steps — comparing pages, filling a form, hunting across tabs — and, while it is still working, clicks New chat or opens a different conversation from History to do something else in the meantime. The agent keeps going in the background. When they come back to the task later, its bubble is empty: no list of steps, no answer, as if the whole task never happened. The work — sometimes a minute or more of browsing — is simply gone.

**Hotspot Files**

- `src/sidepanel/store.ts` (side panel) — owns the save that updates a message row in the database.
- `src/sidepanel/agent.ts` (side panel) — runs the loop and only asks for a full save at the very end.

**Trigger and consequence** — When an agent task begins, Briefly writes a placeholder row for it and shows it on screen. As the task runs, the growing list of steps and the streamed narration are updated in memory only — they are never written to the database along the way. The complete result is committed to storage exactly once, at the very end. Separately, starting a new chat or opening another conversation does not stop a running agent. So if the user navigates away and the agent finishes afterward, its one and only save is aimed at a message that is no longer part of the visible conversation. The save finds no matching row on screen and quietly does nothing, so the database still holds only the empty placeholder. Reopening the task shows a blank agent turn. The same total loss happens if the panel is closed mid-run, because nothing was saved incrementally. It reproduces reliably: start a multi-step task, click New chat while it is still working, wait for it to finish, then reopen the task from History.

**Proven mechanism** — The agent writes an empty placeholder row at the start → every step and every scrap of streamed text is patched into the in-memory conversation only, with no write to storage during the run → New chat or opening another conversation replaces the visible conversation but does not cancel the agent → the agent runs to completion and issues its single "save everything" call, keyed to its message's id → that save scans the conversation currently on screen for a matching row, finds none, and skips writing entirely → the placeholder — blank steps, blank answer — is all that survives on disk. As a bonus hazard, that same blank row is exactly the empty assistant turn that triggers bug 1 if the user later chats in the reopened thread.

---

### 3. Long chats are cut off well before the model's real limit, with no way forward

**Severity** — High

**Area** — The Anthropic "preflight" layer that inspects every request before it is sent, and the chat send path. The concept is the input-size budget the preflight enforces.

**Where the user hits it** — Deep into a long back-and-forth — or after attaching several sizable pages across turns — the next reply abruptly fails with "The API couldn't accept this request," followed by a technical sentence about an estimated token count exceeding a budget. Every retry fails identically. The conversation is effectively dead: to keep going the user must start a brand-new chat and lose all the built-up context, even though nothing they did was unreasonable.

**Hotspot Files**

- `src/lib/anthropic/preflight.ts` (Anthropic layer) — sets the default budget and refuses oversized requests.
- `src/sidepanel/store.ts` (side panel) — builds chat requests without the shrinking step the agent uses.

**Trigger and consequence** — Chat requests are assembled without two things the agent path relies on: the "compaction session" that summarizes and trims older turns, and a raised size budget. Without them, chat falls back to the preflight's default ceiling of roughly 120,000 estimated input tokens. Once the running conversation's estimated size crosses that ceiling, the preflight refuses to send and raises an error that surfaces to the user as a bad request. Because chat has no step that shrinks its own history, the conversation is over the line on every retry too. Meanwhile the models themselves accept far more — Sonnet and Opus up to a million tokens, Haiku up to 200,000 — and the agent path stays comfortably under budget precisely because it does summarize old turns. So chat is halted far short of what the model could actually handle. Any sufficiently long thread, or one that repeatedly attaches large page context, will reach the wall.

**Proven mechanism** — Chat requests are built with no compaction session and no budget override → the preflight applies its default estimate ceiling of about 120,000 tokens → it measures the entire conversation and, once the estimate is over the ceiling, throws instead of sending → the thrown block is turned into a bad-request and shown as "couldn't accept this request" → retry rebuilds the very same oversized request and throws again → because there is no history-shrinking step on the chat path (unlike the agent path), the thread stays permanently pinned above the ceiling and below the model's true context window.

---

### 4. The Alt+B shortcut stops closing the panel after the background worker sleeps

**Severity** — Medium

**Area** — The background service worker and the side panel's start-up code. The concept is the long-lived "port" connection the panel opens back to the background so the keyboard shortcut can tell whether the panel is open.

**Where the user hits it** — The shortcut is presented, in the welcome tour and settings, as a way to toggle the panel — open it and close it — from any page. It works when the panel is fresh. But after the panel has been open for a while, pressing Alt+B no longer closes it; the panel just stays put. Opening still works, so the shortcut feels half-broken: it can summon Briefly but can no longer dismiss it.

**Hotspot Files**

- `src/background/index.ts` (background) — decides, on the shortcut, whether to close or open based on a registry of open panels.
- `src/sidepanel/main.tsx` (side panel) — opens the port and reports its window exactly once, at load.

**Trigger and consequence** — When the panel loads, it opens a single connection to the background and announces which browser window it belongs to; the background records that. On the shortcut, the background closes the panel only if that window is in its record of open panels, and otherwise opens one. Chrome routinely recycles the background worker after a stretch of inactivity and also ends long-lived connections after their allotted lifetime. When either happens, the window is removed from the record, and the panel has no logic to reconnect. From that point on the shortcut always takes the "open" branch — which does nothing visible when the panel is already open. It reproduces by opening the panel, leaving it open long enough for the background worker to go idle, then pressing Alt+B: it will not close.

**Proven mechanism** — Panel loads → opens one connection and registers its window with the background → on the shortcut the background checks its record: window present means "tell the panel to close," window absent means "open a panel" → Chrome recycles the worker or ends the connection → the disconnect removes that window from the record → the panel never re-opens the connection → the record stays empty → every later Alt+B falls to the "open" branch → an already-open panel is asked to open again and nothing changes.

---

### 5. The built-in Translate action does nothing when the text matches the browser's language

**Severity** — Medium

**Area** — The quick-action prompt definitions and the code that resolves an action into a request. The concept is the built-in "Translate" highlight action and the language it aims at.

**Where the user hits it** — On any page, the user highlights some text and picks Translate — from the selection popup, the right-click menu, or the composer. When the highlighted text is already in the browser's own language (for the common English setup, ordinary English text), the reply is just the same text handed back, not a translation into another language. The button appears to do nothing useful.

**Hotspot Files**

- `src/lib/anthropic/prompts.ts` (Anthropic layer) — defines the Translate instruction and the language it targets.
- `src/lib/actions.ts` (lib) — turns the action into the message that is sent.

**Trigger and consequence** — The Translate action always aims at the browser's own display language, and it adds a fallback clause: if the text is already in that language, translate it into English instead. On an English-language browser, both the target and the fallback are English, so the whole instruction collapses to "translate English into English." Highlighting English text and choosing Translate therefore returns essentially unchanged text. This is the default outcome for English users, which is a large share of them; the action only does something useful when the highlighted text happens to be in a language different from the browser's. It reproduces on any English profile by selecting an English sentence and choosing Translate.

**Proven mechanism** — The action reads the browser's display language and uses it as the translation target → it appends a same-language fallback that is also that language → on an English profile the target and the fallback are both English → the model is instructed to translate English into English → there is no other language to produce, so the model returns the input essentially as-is → the user sees no translation.

---

### 6. Tooltips jump into place instead of appearing where they belong

**Severity** — Low

**Area** — The shared UI kit's icon-button tooltip. The concept is the gap between where the tooltip is positioned and how it animates into view.

**Where the user hits it** — Hovering almost any icon button — the header actions, the per-message tools, the composer buttons — for about half a second pops a small text label. It shows up offset from the button, down and to the right, and then visibly snaps to its correct spot centered above the button. The flicker happens on every tooltip, so it reads as a small but constant roughness across the whole interface.

**Hotspot Files**

- `src/ui/IconButton.tsx` (UI kit) — positions the floating tooltip relative to its button.
- `src/styles/ui.css` (styles) — defines the tooltip's entrance animation.

**Trigger and consequence** — The tooltip is placed with an inline positioning shift that moves it left by half its width and up by its full height, so it ends up centered above the button. Its entrance animation, though, animates that same positioning property toward "none," which cancels the centering shift for as long as the animation runs. During those milliseconds the tooltip is drawn without the offset — anchored at the button's own point rather than centered above it — and only when the animation finishes does it fall back to the centered inline position, producing the snap. It fires on every tooltip and is suppressed only under the reduced-motion setting, where the animation is made near-instant.

**Proven mechanism** — The tooltip receives an inline positioning shift that centers it above the target → its fade-in animation animates that same positioning property toward "none" → while the animation runs, the animated value takes over and the centering shift is dropped → the tooltip renders at the un-centered anchor point, down and to the right of where it belongs → when the animation ends, the value reverts to the inline centered position → the tooltip snaps from the corner to centered, a visible jump each time it appears.
