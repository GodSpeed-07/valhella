# UI Ideas

Fresh visual and interaction ideas, each grown from something the interface already has. These propose things Briefly does not do yet; none describe how to build them. Ordered from most to least impactful.

---

### 1. A warm, editorial empty state instead of a lone hint line

**Effort** — Medium

**Area** — Side panel: the thread's empty state and the quick-start block.

**Anchor** — When a chat is empty, the panel shows either a single muted line ("Ask Briefly anything, or add this page to ask about what you're reading") or, when a page or draft is present, a plain vertical stack of small action pills (Summarize, Explain, Simplify, Translate, Improve writing). That empty state is what this grows from.

**Hotspot Files**

- `src/sidepanel/components/QuickStart.tsx` (side panel) — renders the empty-state hint and the pill list.
- `src/sidepanel/panel.css` (side panel) — styles the quick-start block and its entrance animation.

**The idea** — Replace the bare hint with a small editorial welcome: a short greeting set in the design system's display serif (already loaded and used for the wordmark and the empty-History heading), a live "you're reading …" line showing the current page's favicon and title when one is available, and the quick actions laid out as a tidy two-column grid of labeled cards — each with its icon and a one-line hint of what it does — rather than a single vertical run of pills. With no page attached, the same grid offers a few concrete starter prompts ("Summarize this page", "What are people saying about this?", "Draft a reply") that drop into the composer on click. The block fades and staggers in the way the pills already animate.

**Why it's worth it** — The empty panel is the first thing seen at the start of every conversation, yet today it is one line of grey text or a thin vertical list — slight for a front door. The display serif, the warm paper palette, and staggered entrance motions already appear elsewhere (empty History, onboarding), so a richer welcome would read as native rather than bolted on. Surfacing the current page and a few real starter prompts turns a blank state into an obvious first move, which is exactly the moment new users hesitate.

---

### 2. A glanceable cost chip instead of a buried menu line

**Effort** — Medium

**Area** — Side panel: the header, plus the cost helper it reads from.

**Anchor** — A thread's running cost and token totals currently sit as a non-clickable line at the very top of the header's "More" overflow menu, seen only when that menu is opened. That hidden line is the anchor.

**Hotspot Files**

- `src/sidepanel/components/Header.tsx` (side panel) — builds the overflow menu that hides the cost line.
- `src/lib/cost.ts` (lib) — computes and formats the totals.

**The idea** — Promote the cost to a small, quiet chip that lives in the header or just beneath it and is visible at a glance — a compact "≈ $0.03" with a subtle token glyph, tinted in the muted ink colour so it never shouts. Tapping it opens a small popover with the same breakdown the menu shows now — input and output tokens, cache, request count — and each assistant turn's meta row could reveal that turn's own cost on hover. The chip's number animates when it updates after a reply, echoing the progress-bar and shimmer motions already in the panel.

**Why it's worth it** — Knowing what a thread is worth is a headline promise, but the figure is two taps deep in an overflow menu, so during an actual conversation it is effectively invisible. The totals are already computed and formatted, and the header already carries compact controls, so a persistent chip largely relocates and lightens what exists. Making spend glanceable fits a bring-your-own-key audience that pays per token and wants to feel the meter running in the moment, not reconstruct it afterward.

---

### 3. Timestamps on messages, revealed on hover

**Effort** — Small

**Area** — Side panel: the per-message meta and hover tools.

**Anchor** — Each assistant turn has a meta row (model badge, copy, read-aloud, retry) and each user turn has a hover toolbar, but neither shows when the message was sent. The History list, by contrast, already shows relative times like "2h" and "3d". That missing time inside the thread is the anchor.

**Hotspot Files**

- `src/sidepanel/components/MessageView.tsx` (side panel) — renders the meta and hover tools where a time would sit.
- `src/lib/time.ts` (lib) — already turns a timestamp into a short relative label.

**The idea** — Add a faint relative timestamp to each message that surfaces on hover — tucked into the assistant meta row and the user turn's hover tools — reading "now", "5m", "2h" exactly as History does, and expanding to the full date and time on its own hover or as a tooltip. When a conversation spans separate sittings, a subtle day divider ("Today", "Yesterday") between turns would orient a reader returning to an old thread.

**Why it's worth it** — Conversations persist across days and are reopened from History, yet inside a thread there is no sense of when anything happened. The relative-time helper History relies on is already written and consistent, so bringing it into the thread extends an existing pattern rather than inventing one. Because the time only appears on hover, it answers "when did I ask this?" during review without adding steady visual clutter.

---

### 4. An "Add this page" chip that previews what will be attached

**Effort** — Small

**Area** — Side panel: the context chip above the composer.

**Anchor** — Before a page is attached, the context dock shows a dashed "＋ Add this page" chip; once added it becomes a "Reading · favicon · title" pill. The pre-add dashed chip is the anchor.

**Hotspot Files**

- `src/sidepanel/components/ContextChip.tsx` (side panel) — renders the add chip and the reading pill.
- `src/lib/pagecontext.ts` (lib) — already extracts the title, favicon, word count, excerpt, and a truncated flag.

**The idea** — Enrich the "Add this page" chip so it previews what will be attached before the click: the page's favicon, its title, and a small "~1,200 words" readout from the extracted content, with a faint "clipped" tag when the page is long enough to be trimmed. Hovering could reveal the article's short excerpt. After adding, the same word-count detail rides along into the "Reading" pill so the user keeps a feel for how much context is attached.

**Why it's worth it** — Attaching a page is one of the app's core moves, yet the current pre-add chip says only "Add this page" with no hint of what Briefly actually managed to read — which matters, because extraction can come back partial, empty, or clipped at a length limit. The reader already produces the title, favicon, word count, excerpt, and a truncated flag, and none of it reaches the user at the decision point. Showing it turns a blind "add" into an informed one and sets honest expectations about how much of a long page the model will see.

---

### 5. A collapsible agent transcript that summarizes a finished run

**Effort** — Medium

**Area** — Side panel: the agent step feed.

**Anchor** — An agent turn renders a panel holding a scrolling list of every step it took — read, click, type, select, navigate, screenshot — capped to a fixed height and often quite tall. That long step list is the anchor.

**Hotspot Files**

- `src/sidepanel/components/AgentFeed.tsx` (side panel) — renders the step list and its per-step status and icon.
- `src/sidepanel/panel.css` (side panel) — styles the feed and its scroll region.

**The idea** — Give a finished run a collapsed default: a single summary line — something like "12 steps across 3 tabs" with the run's outcome icon — that expands to the full step list on click. While a task is live the feed stays open and auto-scrolls as it does now; once the task ends it settles into the compact summary so a completed conversation stays readable. The short narration lines the agent emits between actions could nest under an expandable disclosure, keeping the spine of real actions easy to scan.

**Why it's worth it** — An agent task can run to its step limit, so a completed run often leaves a tall, dense feed that dominates the thread and pushes the actual answer far below a wall of past clicks. Each step already carries a status and an icon, so a one-line summary has everything it needs to describe the run at a glance. Collapsing finished runs keeps the full browsing transcript a click away for anyone who wants it, while handing the conversation's focus back to the result.

---

### 6. Read-aloud that lights up the words as it speaks them

**Effort** — Large

**Area** — Side panel: the message body and the read-aloud player.

**Anchor** — Reading a message aloud shows a thin progress bar beneath the turn, advancing by a per-chunk fraction as the audio plays. That progress bar and its fraction are the anchor.

**Hotspot Files**

- `src/sidepanel/components/MessageView.tsx` (side panel) — shows the progress bar under a spoken message.
- `src/lib/tts/player.ts` (lib) — splits a message into ordered chunks and reports how far into playback it is.

**The idea** — Turn the abstract bar into a reading highlight: as the voice speaks, softly highlight the sentence or chunk being read directly in the message text and ease it into view, karaoke-style, so the eye can follow the voice. The play, pause, and stop controls stay; the bar can remain as a slim underline of overall progress. On pause, the highlight holds on the current sentence so the listener sees exactly where they stopped.

**Why it's worth it** — The player already breaks a message into ordered chunks and reports how far playback has reached, so the voice's position within the text is known — it is merely expressed today as a featureless bar detached from the words. Binding that position back to the prose makes listening and reading reinforce each other, which is the whole point of a read-aloud companion, and it gracefully handles long answers where a lone bar gives no sense of place. It draws entirely on progress the player already produces.
