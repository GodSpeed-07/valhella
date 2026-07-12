# Quality-of-Life

Small, targeted refinements to behavior that already works. Nothing here is a new feature; each is a real rough edge in an existing flow, with the underlying reason it grates. Ordered from most to least keenly felt.

---

### 1. The page in front of you can't be read until you reload it

**Effort** — Medium

**Area** — The page-context reader (lib) and the extension's content-script declaration. The concept is the "Reading this page" context the panel attaches to a question.

**Where it shows up** — The moment right after install. The welcome tour ends with "Open Briefly," the user turns to the page they already had open, and tries to ask about it — and the context chip reads "Can't read this tab — try reloading it" instead of offering the page. The very first thing a newcomer naturally attempts, asking about the page in front of them, quietly fails, with nothing but a small line of text to explain why. The same friction returns for any tab that was already open before Briefly was installed, updated, or re-enabled.

**Hotspot Files**

- `src/lib/pagecontext.ts` (lib) — asks the current tab for its readable content and reports failure.
- `public/manifest.json` (extension config) — declares the content script that does the reading.

**The rough edge** — The user wants to ask Briefly about the page they are on. To read a page, Briefly talks to a small helper script that Chrome places into pages. That helper is only placed into pages that load after the extension is installed or updated. Tabs that were already open — including the exact tab someone was reading when they installed Briefly — have no helper yet, so the read fails until that tab is reloaded. It bites hardest at first use, right after onboarding, which is precisely when a new user is deciding whether the tool works.

**Why it falls short today** — The reader asks the active tab's helper for the page and, when nothing answers, marks the tab unreadable and shows a reload hint. The extension declares its helper to run on pages going forward but takes no step to reach into tabs that were already open, so those tabs stay unreadable until reloaded. There is no in-panel action that places the helper on demand or offers the reload for the user; noticing the small message and reloading is left entirely to them.

---

### 2. The on-page answer card disappears the instant the page scrolls

**Effort** — Small

**Area** — The content-script selection popup. The concept is the answer "card" that streams a quick-action result on top of the page.

**Where it shows up** — After highlighting text and choosing an action — Summarize, Explain, Ask Briefly — a small card opens over the page and streams the answer. A nudge of the scroll wheel, a tap of the spacebar, a bit of trackpad momentum, or resizing the window makes the card vanish mid-answer, and the streaming reply is discarded. The user is left with nothing and has to reselect the text and run the action again.

**Hotspot Files**

- `src/content/popup/index.ts` (content script) — decides when the popup opens and when it is dismissed.

**The rough edge** — The user is reading a streaming answer in the on-page card and scrolls, either to keep reading the page underneath or just by reflex. The card is meant to close when they click elsewhere or press Escape, but it also closes on any page scroll and on any window resize — including while it is still streaming an answer. It bites hardest on longer answers, which take more time to finish and so give an accidental scroll more chances to kill them.

**Why it falls short today** — The popup treats scrolling and resizing as reasons to dismiss. That suits the tiny action pill that pops up at a selection, but it is too aggressive for the answer card, which the user needs to sit still while they read. Dismissing the card also tears down the request feeding it, so the partial answer is thrown away rather than paused or preserved. The same close-on-scroll rule is applied to both the small pill and the full answer card, with no distinction between them.

---

### 3. The running cost quietly leaves out web-search charges

**Effort** — Small

**Area** — The cost-accounting helper and the model catalog (lib). The concept is the "≈ $X" figure shown for a conversation.

**Where it shows up** — In the side panel's header overflow menu, which reports a thread's estimated cost alongside its token totals. For any thread where the model searched the web — which is the default — the figure comes in lower than the real charge, so a cost-conscious user is quietly given a number that is too small.

**Hotspot Files**

- `src/lib/cost.ts` (lib) — computes the dollar figure from token usage.
- `src/lib/models.ts` (lib) — the model catalog the math draws its prices from.

**The rough edge** — The user wants an honest read on what a conversation cost; the tool is pitched as letting you always know what a thread is worth. The displayed figure adds up the model's input, output, and cache token prices, but never the separate per-search charge that live web search adds on top. Web search is enabled by default, so most threads that answer with citations under-report their true cost. It bites hardest on research-heavy conversations with many searches, where the missing per-search charges pile up.

**Why it falls short today** — The cost math covers only the token categories carried in the model's price list; there is no term at all for the web-search tool's own charge. The catalog it reads from lists token prices but no search price, and search activity never feeds into the total. So the figure is accurate for token spend yet silently short by the search surcharge whenever the answer leaned on search.

---

### 4. Searching history rereads every stored message on each keystroke

**Effort** — Medium

**Area** — The History view (side panel) and the local database (lib). The concept is full-text search across saved conversations.

**Where it shows up** — In the History screen's search box. Typing a query that titles alone don't match makes Briefly read through the body text of every stored message looking for hits. For someone with a large archive, each keystroke stutters and the results list feels slow to settle, turning a quick lookup into a wait.

**Hotspot Files**

- `src/sidepanel/views/History.tsx` (side panel) — runs the search on each keystroke.
- `src/lib/db.ts` (lib) — defines what the database can look up quickly.

**The rough edge** — The user is trying to find an old conversation by a word they remember from inside it. Search matches titles first, then, to catch matches in the body, walks the full text of every message in the database. Because there is no text index to jump straight to matches, the work scales with the size of the whole archive rather than the number of results. It bites hardest for heavy users — the people most likely to rely on search — and gets steadily worse as their history grows.

**Why it falls short today** — The database indexes conversations and messages by identity and time, but not by their text, so a body search has no shortcut and must scan every message in turn. The search also runs on each debounced keystroke, so the full scan repeats as the query is typed. The larger the history, the more text every keystroke rereads.

---

### 5. The jump-to-bottom shortcut only exists while a reply is streaming

**Effort** — Small

**Area** — The thread view (side panel). The concept is the floating "Latest" button that scrolls back down to the newest message.

**Where it shows up** — When reading back through a finished conversation. Scrolling up to reread an earlier answer leaves no quick way back to the bottom, because the "Latest" shortcut that would carry them there is shown only while a reply is actively streaming. In a long, completed thread the only way down is to scroll the whole way by hand.

**Hotspot Files**

- `src/sidepanel/components/Thread.tsx` (side panel) — decides when the "Latest" button is shown.

**The rough edge** — The user scrolls up in a settled conversation to check something, then wants to return to the bottom where they left off. The convenient jump control does exist, but it is gated on a reply being in progress, so it never appears once the thread is idle. It bites hardest in long threads, where the manual scroll back down is longest and a one-tap shortcut would help most.

**Why it falls short today** — The jump control appears only when two things are true at once: the user is scrolled away from the bottom, and a reply is streaming. The streaming requirement means a finished conversation never offers it — even though the "scrolled away from the bottom" situation it is meant to solve is just as real when the thread is idle.

---

### 6. Finished agent tasks still say they are "Acting in your browser"

**Effort** — Small

**Area** — The agent feed component (side panel). The concept is the header sitting above an agent turn's list of steps.

**Where it shows up** — Looking at a past agent task, whether the one that just wrapped up or an older one reopened from History. Its list of steps is still topped by "Acting in your browser," worded in the present tense as if the agent were still at work, though it stopped long ago. Completed work reads as though it is still happening.

**Hotspot Files**

- `src/sidepanel/components/AgentFeed.tsx` (side panel) — renders the header over the step list.

**The rough edge** — The user is reviewing what an agent did, after it finished. The panel keeps the same present-tense "Acting in your browser" heading for a completed turn as for a live one; the only thing that changes is that the Stop button goes away. With no past-tense wording for a done task, a finished run and a running one look almost identical at a glance. It bites when scanning History, where every agent turn is finished yet each still claims to be acting right now.

**Why it falls short today** — The feed's header text is fixed and does not change when the task is no longer running; the one piece of state that does vary is whether the Stop button is present. So the wording stays in the present tense whether the turn is live this second or was completed days ago.
