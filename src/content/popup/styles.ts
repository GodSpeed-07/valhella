export const POPUP_CSS = `
:host {
  all: initial;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.wrap {
  position: fixed;
  z-index: 2147483646;
  font-family: 'Briefly Grotesk', 'Helvetica Neue', Arial, sans-serif;
  --paper: #fcfaf4;
  --paper-2: #f1ece0;
  --ink: #201b14;
  --ink-2: #5f574a;
  --ink-3: #8a8071;
  --line: #e3dbc9;
  --accent: #b8430f;
  --accent-ink: #fff6ec;
  --accent-soft: #f4e0cd;
  --accent-soft-ink: #8a320b;
  --danger: #b3362b;
  --shadow: 0 4px 14px rgba(46, 34, 17, 0.13), 0 14px 40px rgba(46, 34, 17, 0.16);
  color: var(--ink);
}

.wrap[data-dark='true'] {
  --paper: #221d17;
  --paper-2: #191510;
  --ink: #ede5d6;
  --ink-2: #b0a695;
  --ink-3: #7e7566;
  --line: #3a3227;
  --accent: #e86a33;
  --accent-ink: #2a1206;
  --accent-soft: #3a2213;
  --accent-soft-ink: #f0a377;
  --danger: #e07862;
  --shadow: 0 4px 14px rgba(0, 0, 0, 0.42), 0 16px 44px rgba(0, 0, 0, 0.5);
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.pill {
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: 480px;
  flex-wrap: wrap;
  padding: 4px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow);
  animation: pill-in 140ms cubic-bezier(0.32, 1.36, 0.4, 1);
}

@keyframes pill-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.pill.out,
.card.out {
  animation: pop-out 100ms ease-in forwards;
}

@keyframes pop-out {
  to {
    opacity: 0;
    transform: translateY(2px) scale(0.97);
  }
}

.mark {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  flex: none;
  margin: 0 3px 0 4px;
}

.act {
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 550;
  line-height: 1;
  color: var(--ink-2);
  white-space: nowrap;
  transition: background 120ms, color 120ms;
}

.act:hover {
  background: var(--accent-soft);
  color: var(--accent-soft-ink);
}

.act.ask {
  color: var(--accent);
}

.dots {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
}

.dots:hover {
  background: var(--paper-2);
  color: var(--ink);
}

.mini-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 4px;
  z-index: 2;
}

.mini-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 9px;
  font-size: 12.5px;
  border-radius: 7px;
  color: var(--ink);
}

.mini-item:hover {
  background: var(--paper-2);
}

.card {
  width: min(420px, calc(100vw - 24px));
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: pill-in 150ms cubic-bezier(0.32, 1.36, 0.4, 1);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 8px 8px 12px;
  border-bottom: 1px solid var(--line);
}

.card-title {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}

.icon-btn:hover {
  background: var(--paper-2);
  color: var(--ink);
}

.card-body {
  padding: 11px 13px;
  font-size: 13px;
  line-height: 1.55;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.card-q {
  font-size: 12px;
  color: var(--ink-3);
  padding: 9px 13px 0;
  font-style: italic;
}

.md p, .md ul, .md ol, .md pre, .md blockquote, .md table, .md h1, .md h2, .md h3 {
  margin-bottom: 8px;
}

.md > :last-child {
  margin-bottom: 0;
}

.md ul, .md ol {
  padding-left: 20px;
}

.md li {
  margin: 2px 0;
}

.md h1, .md h2, .md h3 {
  font-size: 13.5px;
  font-weight: 650;
}

.md code {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11.5px;
  background: var(--paper-2);
  padding: 1px 4px;
  border-radius: 4px;
}

.md pre {
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 11px;
  overflow-x: auto;
}

.md pre code {
  background: none;
  padding: 0;
}

.md a {
  color: var(--accent);
}

.md blockquote {
  border-left: 3px solid var(--line);
  padding-left: 10px;
  color: var(--ink-2);
}

.caret {
  display: inline-block;
  width: 6px;
  height: 12px;
  margin-left: 2px;
  border-radius: 2px;
  background: var(--accent);
  animation: blink 1.1s steps(2, start) infinite;
  vertical-align: -2px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.waiting {
  color: var(--ink-3);
  font-size: 12.5px;
}

.err {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--danger);
}

.err button {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 7px;
  background: var(--paper-2);
  color: var(--ink);
  font-size: 12px;
  font-weight: 550;
}

.card-foot {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-top: 1px solid var(--line);
}

.foot-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 550;
  color: var(--ink-2);
}

.foot-btn:hover {
  background: var(--paper-2);
  color: var(--ink);
}

.foot-btn.primary {
  color: var(--accent);
}

.foot-btn.primary:hover {
  background: var(--accent-soft);
  color: var(--accent-soft-ink);
}

.foot-spacer {
  flex: 1;
}

.ask-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
}

.ask-input {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  border-radius: 9px;
  padding: 7px 10px;
  font-size: 13px;
  outline: none;
}

.ask-input:focus {
  border-color: var(--accent);
}

.ask-send {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ask-send:disabled {
  opacity: 0.4;
}

svg {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .pill, .card, .caret, .pill.out, .card.out {
    animation: none;
  }
}
`
