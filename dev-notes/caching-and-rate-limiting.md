# Scaling the agent: caching, context, and step budgeting

A practical guide to running long-horizon agent tasks in Briefly **without** letting cost climb, while raising answer quality. Unlike the audit notes in this folder, this file proposes concrete changes and names the exact knobs and files.

The short version:

1. **Context compaction already turns the cost from quadratic into linear.** The 25-step cap is a second, blunter guard on top of it.
2. **Prompt caching is the biggest untapped lever** — right now only the tools+system prefix is cached; the growing conversation is re-sent at full price every turn. Caching the message prefix cuts the linear *constant* by roughly 4–5×.
3. Once caching flattens per-turn cost, the **fixed 25-step cap should become a cost/progress budget**, so cheap tasks run far longer and expensive ones still stop.

---

## 1. Where the cost actually comes from

The loop lives in `src/sidepanel/agent.ts`. Each turn it calls `buildRequest(...)` (`src/lib/anthropic/params.ts`), which runs the context preflight (`src/lib/anthropic/preflight.ts`) and sends the whole message list again. So the cost of a run is:

```
run cost  ≈  Σ (input tokens re-sent on turn k)  +  Σ (output tokens on turn k)
```

Two mechanisms already bound the input term:

- **Compaction** (`RequestContextSession` in `preflight.ts`) keeps the re-sent history under `DEFAULT_AGENT_INPUT_TOKEN_BUDGET = 32_000` by keeping the last `RECENT_RAW_TOOL_PAIRS = 4` tool exchanges verbatim and folding everything older into a frozen deterministic summary, plus deduping byte-identical large tool results into local artifact references. Without this, turn *k* would carry all *k* prior page snapshots and the run would be **O(n²)**. With it, each turn carries at most ~32k tokens, so the run is **O(n)** — linear in steps.
- **The 25-step cap** (`if (turn > 25)` in `agent.ts`) then bounds *n* itself, which bounds the whole run.

So the user's instinct is right: the cap keeps a run from ballooning. But it does so by cutting long tasks off, and it does nothing about the biggest inefficiency — **every turn re-pays full input price for a window that is almost entirely unchanged from the previous turn.**

A rough Sonnet-5 estimate (promo input $2/M, output $10/M), worst case window always full:

```
uncached: 25 turns × 32k input × $2/M ≈ $1.60 input  (+ output)
```

Most of that 32k is identical turn to turn. That is exactly what prompt caching is for.

---

## 2. Prompt caching — the biggest lever

### What is cached today

In `prepareRequest` (`preflight.ts`):

- The **last system block** gets `cache_control: ephemeral`. Because Anthropic caches the request prefix in the order *tools → system → messages*, this one breakpoint caches the entire **tools + system** block. That part is large (12 agent tools + the system prompt) and perfectly stable, so this is already a real win.
- Agent mode also sets a **request-level** `clean.cache_control = ephemeral`. This is a non-standard top-level field (see the "known gaps" note in the plan) — confirm the API actually honors it; if it does nothing, it is spending one of your four breakpoints for no benefit.
- **Every message-block `cache_control` is stripped** (`cloneBlock` deletes it). So the conversation itself — task, summary, and all the tool results — carries **no cache breakpoint at all** and is re-sent uncached on every turn.

`MAX_CACHE_BREAKPOINTS = 4`, and `cacheBlockCount` currently uses 2 of them (system + top-level). **Two breakpoints are free.**

### The change: incremental caching of the message prefix

Anthropic reads the *longest* cached prefix that ends at a breakpoint and is still warm. For a growing conversation the classic pattern is a **rolling breakpoint on (or near) the last message each turn**: this turn writes a breakpoint at the end; next turn, everything up to that point is a prefix of the new request, so it is read at **0.1× instead of 1×**, and a new breakpoint is written at the new end.

Spend the four breakpoints in **layers**, deepest-stable first, so a cache hit survives even when the newest layers churn:

| # | Breakpoint after… | Stability | Purpose |
|---|---|---|---|
| 1 | tools + system (last system block) | never changes | already present; keep it |
| 2 | the task message + frozen summary | changes only on a re-summarize | caches the compacted "spine" for many turns |
| 3 | the older of the recent raw tool pairs | slides slowly | caches most of the recent window |
| 4 | the newest tool result (rolling) | every turn | the fresh write each turn |

Each turn: 1–3 are read at 0.1×, only 4 is a full-price write. Per-turn input drops from "full 32k" to roughly "0.1 × (stable ~28k) + full × (new ~4k)":

```
cached:  25 turns × (2.8k + 4k) × $2/M ≈ $0.34 input   (≈ 4–5× cheaper)
```

That is the whole game: **the same budget now buys ~100 steps instead of ~25.**

### The precondition: a byte-stable prefix

Caching only helps if the bytes up to a breakpoint are identical to last turn. Two things in the current compaction can break that:

- **Re-summarizing rewrites the spine.** Today the summary is frozen once set and only recomputed when the window still overflows (good), but each recompute invalidates breakpoint 2. Recompute on a **cadence** (e.g., only when the recent window genuinely overflows, and in larger batches) rather than opportunistically, so breakpoint 2 stays warm across long stretches.
- **The sliding window changes bytes at the boundary.** When a pair moves from "raw" into the summary, everything after that point shifts. Keep the summary **append-only** (never re-order or re-key existing entries) so the change is localized and the deeper breakpoints (1–2) survive; only 3–4 churn.

`reduceDuplicates` is already deterministic (artifact refs are `hash:len`), so identical prior turns serialize identically — keep it that way (no timestamps, no run-order in the serialized form).

> Net: stop stripping the *rolling* message marker, add markers at the two stable layers, keep the summary append-only, and confirm/repurpose the top-level agent `cache_control`.

---

## 3. Context compaction — small **and** stable

Compaction (`preflight.ts`) is what keeps the window bounded; the goal is to keep it small without thrashing the cache.

- **Tune the window vs. budget.** `RECENT_RAW_TOOL_PAIRS = 4` and `DEFAULT_AGENT_INPUT_TOKEN_BUDGET = 32_000` are the two dials. A larger raw window gives the model more verbatim recent state (better local reasoning) at higher cost; a smaller budget forces earlier summarizing (cheaper, more lossy). With caching in place you can afford a **larger raw window** (say 6–8 pairs) because the older ones are read at 0.1×.
- **Let the model re-hydrate on demand.** The artifact store already keeps full tool results locally keyed by `artifact:hash:len`, and the summary references them. Add a tiny **`recall_artifact(ref)` tool** so the model can pull back a full older snapshot only when it needs it. This keeps the default window tiny (cheap) while making the *ceiling* of available detail high (quality) — the best of both.
- **Summarize by task structure, not just recency.** The current summary already buckets discoveries, decisions, errors, and remaining work. Preserving *exact* values (URLs, ids, the "CASE-42" style tokens it already protects) is what keeps long runs from drifting — invest here before trimming anything else.

---

## 4. Replace the fixed 25-step cap with a budget + progress stop

Once caching flattens per-turn cost, a flat turn count is the wrong limiter — it stops a cheap 60-step research crawl and permits an expensive 25-step image-heavy loop. Replace it (in `agent.ts`) with three cooperating stops:

1. **A cost/token budget (primary).** You already accumulate `usage` per turn and compute cache-weighted dollars in `src/lib/cost.ts`. Stop when cumulative **effective** input tokens (cache reads counted at 0.1×) or estimated dollars crosses a ceiling. Long, cheap tasks run until they are actually expensive; nothing runs away.
2. **A no-progress detector (quality + safety).** You already hash tool results into artifact refs. If the last *k* snapshots repeat (same URL + same content hash, or a click that changes nothing), the agent is looping — stop, or force a re-plan, instead of burning steps. This catches the failure the 25-cap was really guarding against.
3. **A high hard ceiling (backstop).** Keep an absolute turn ceiling far above 25 (e.g., 100–150) purely as a runaway guard, not as the normal stop.

**Milestone checkpoints** raise quality *and* help caching: every N steps, have the agent emit a short "progress so far / plan for the rest," fold it into the frozen summary, and continue. This is a natural place to re-anchor breakpoint 2, gives long tasks a coherent spine, and gives the user a place to intervene.

---

## 5. Quality levers that don't blow up cost

- **Thinking budget** (`params.ts`): Opus already gets `thinking: adaptive` in agent mode; that trades output tokens for better decisions. Adaptive is the right default — just make sure the cost budget in §4 counts thinking output so a "thinky" run still stops on time.
- **Snapshot richness** (`SNAPSHOT_CAP = 15_000` in `src/content/actuator.ts`): viewport-first is good. Rather than raising the cap globally (cost on every turn), let the model request more detail for a specific region on demand — same philosophy as `recall_artifact`.
- **Tool-call batching**: the loop already handles multiple `tool_use` blocks per turn. Encouraging the model (via the system prompt in `src/lib/agent/prompt.ts`) to read-then-act in one turn where safe reduces round-trips, which reduces both latency and the number of cache writes.

---

## 6. The other caches: read-aloud audio and its rate limit

"Caching" and "rate limiting" also live in the TTS stack; smaller stakes, but worth a pass:

- **Audio cache** (`src/lib/tts/cache.ts`): LRU over a 50 MB cap (`MAX_BYTES`), keyed by `voice|rate|text` hash — already chunk-level, so identical sentences across threads reuse audio. Improvement: evict by **size × age** rather than pure recency so one huge blob can't push out many small warm ones.
- **Client throttle** (`MIN_REQUEST_GAP = 3200` in `src/lib/tts/player.ts`): a fixed 3.2 s gap between freetts calls. Make it **adaptive** — back off on a 429, tighten on clean successes — so first-audio latency drops when the service is healthy.
- **Monthly quota** (`src/lib/tts/quota.ts`, soft 55k / hard 60k chars): `recordChars` does a read-modify-write, and chunk prefetch can run two writes concurrently, so usage can be **undercounted** under overlap. Use an atomic increment (or serialize writes) so the ledger — and the fallback-to-offline-voice decision — stays accurate.

---

## 7. Recommended configuration (the balance)

Ship in this order; each step is independently valuable and the early ones pay for the rest.

1. **Prompt caching (biggest ROI).** Add the layered message breakpoints of §2, keep the summary append-only, verify/repurpose the top-level agent `cache_control`. Expected: ~4–5× lower input cost per run with no behavior change.
2. **Stable-prefix compaction.** Widen `RECENT_RAW_TOOL_PAIRS` to ~6–8 (now cheap because cached), recompute the summary on a cadence, add `recall_artifact`.
3. **Budget-based stopping.** Replace `turn > 25` with a cumulative cost/effective-token budget, keep a hard ceiling ~100–150.
4. **Progress detector + milestones.** Loop detection from the artifact hashes; a milestone summary every N steps that also re-anchors the cache.
5. **Quality + TTS polish.** Adaptive thinking accounted in the budget; adaptive TTS throttle; atomic quota increment.

The combined effect: per-turn input approaches *(0.1 × stable prefix) + (new tool result)*, the run is bounded by real dollars and real progress rather than a fixed count, and the extra headroom is spent on a larger recent window, milestone planning, and on-demand detail — so long-horizon tasks get **cheaper per step and better per step at the same time.**
