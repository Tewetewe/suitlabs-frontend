// Stylesheet for the in-app guide documents.
//
// Scoped under `.guide-doc` so nothing leaks into the rest of the dashboard.
// Light-only on purpose: globals.css pins the app to light mode.
export const GUIDE_STYLES = `
.guide-doc {
  --paper: transparent;
  --surface: #FFFFFF;
  --surface-2: #EAECF2;
  --ink: #13151B;
  --ink-2: #464C58;
  --ink-3: #6E7585;
  --rule: #D6DAE3;
  --rule-strong: #B6BCC9;
  --accent: #3B3BB5;
  --accent-soft: #E6E6F7;
  --alt: #046C55;
  --good: #046C4E;
  --good-soft: #E0F2EA;
  --warn: #8A5A00;
  --warn-soft: #FBF0DC;
  --crit: #A81D22;
  --crit-soft: #FBE6E6;
  --g-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --g-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --g-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  color: var(--ink);
  font-family: var(--g-sans);
  font-size: 16px;
  line-height: 1.6;
}

.guide-doc *, .guide-doc *::before, .guide-doc *::after { box-sizing: border-box; }

/* ── In-app nav: a plain anchor row, not a sticky bar (the app owns the header) ── */
.guide-doc .bar {
  position: static;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}
.guide-doc .bar-in {
  display: flex;
  align-items: baseline;
  gap: 1.1rem;
  padding: .7rem 1rem;
  overflow-x: auto;
  white-space: nowrap;
}
.guide-doc .bar-name {
  font-family: var(--g-mono);
  font-size: .7rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ink);
  font-weight: 600;
  flex: none;
}
.guide-doc .bar a {
  font-family: var(--g-mono);
  font-size: .7rem;
  letter-spacing: .06em;
  color: var(--ink-3);
  text-decoration: none;
  flex: none;
}
.guide-doc .bar a:hover, .guide-doc .bar a:focus-visible { color: var(--accent); }

.guide-doc .guide-main { max-width: 100%; }
.guide-doc .measure { max-width: 40rem; }

.guide-doc .mast { padding: .5rem 0 1.75rem; border-bottom: 2px solid var(--ink); }
.guide-doc h1 {
  font-family: var(--g-display);
  font-weight: 600;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.04;
  letter-spacing: -.015em;
  text-wrap: balance;
  margin: .5rem 0 .75rem;
  color: var(--ink);
}
.guide-doc .lede { font-size: 1.05rem; color: var(--ink-2); max-width: 36rem; }
.guide-doc .eyebrow {
  font-family: var(--g-mono);
  font-size: .7rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
}

.guide-doc section { padding-top: 2.75rem; scroll-margin-top: 5rem; }
.guide-doc h2 {
  font-family: var(--g-display);
  font-weight: 600;
  font-size: clamp(1.45rem, 3.2vw, 1.95rem);
  line-height: 1.14;
  letter-spacing: -.01em;
  text-wrap: balance;
  margin: .35rem 0 1rem;
  padding-bottom: .55rem;
  border-bottom: 1px solid var(--rule-strong);
  color: var(--ink);
}
.guide-doc h3 {
  font-family: var(--g-sans);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -.005em;
  margin: 1.85rem 0 .55rem;
  color: var(--ink);
}
.guide-doc h4 {
  font-family: var(--g-mono);
  font-size: .7rem;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-weight: 600;
  margin: 1.5rem 0 .5rem;
}
.guide-doc p { margin: 0 0 1rem; }
.guide-doc a { color: var(--accent); }

.guide-doc .cols { display: grid; gap: 1.1rem; grid-template-columns: 1fr; margin: 1.4rem 0; }
@media (min-width: 820px) {
  .guide-doc .cols.two { grid-template-columns: 1fr 1fr; }
  .guide-doc .cols.three { grid-template-columns: repeat(3, 1fr); }
}

.guide-doc .card {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 3px;
  padding: 1.1rem 1.2rem;
}
.guide-doc .card > :last-child { margin-bottom: 0; }
.guide-doc .card p { font-size: .93rem; color: var(--ink-2); }
.guide-doc .card h3 { margin-top: 0; }

.guide-doc ol.steps { list-style: none; counter-reset: s; padding: 0; margin: 1.2rem 0; }
.guide-doc ol.steps > li {
  counter-increment: s;
  position: relative;
  padding: 0 0 1.1rem 3rem;
  margin: 0 0 0 1rem;
  border-left: 1px solid var(--rule);
}
.guide-doc ol.steps > li::before {
  content: counter(s, decimal-leading-zero);
  position: absolute;
  left: -1rem;
  top: 0;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 1px solid var(--rule-strong);
  border-radius: 50%;
  font-family: var(--g-mono);
  font-size: .7rem;
  font-weight: 600;
  color: var(--accent);
}
.guide-doc ol.steps > li:last-child { border-left-color: transparent; padding-bottom: 0; }
.guide-doc ol.steps b { display: block; font-size: .98rem; margin-bottom: .15rem; }
.guide-doc ol.steps span { color: var(--ink-2); font-size: .93rem; }

.guide-doc ul.plain { padding-left: 1.15rem; margin: 0 0 1rem; list-style: disc; }
.guide-doc ul.plain li { margin-bottom: .45rem; color: var(--ink-2); }
.guide-doc ul.plain li b, .guide-doc ul.plain li strong { color: var(--ink); }

.guide-doc .chip {
  display: inline-block;
  font-family: var(--g-mono);
  font-size: .63rem;
  letter-spacing: .09em;
  text-transform: uppercase;
  font-weight: 600;
  padding: .16rem .5rem;
  border-radius: 2px;
  vertical-align: .08em;
  border: 1px solid currentColor;
}
.guide-doc .chip.day { color: var(--accent); }
.guide-doc .chip.wk { color: var(--ink-3); }
.guide-doc .chip.mo { color: var(--warn); }
.guide-doc .chip.yr { color: var(--crit); }
.guide-doc .chip.ev { color: var(--good); }
.guide-doc .chip.adm { color: var(--crit); }
.guide-doc .chip.stf { color: var(--alt); }

.guide-doc .table-wrap {
  overflow-x: auto;
  border: 1px solid var(--rule);
  border-radius: 3px;
  margin: 1.2rem 0;
}
.guide-doc table {
  border-collapse: collapse;
  width: 100%;
  min-width: 34rem;
  background: var(--surface);
}
.guide-doc th, .guide-doc td {
  text-align: left;
  padding: .7rem .9rem;
  border-bottom: 1px solid var(--rule);
  font-size: .9rem;
  vertical-align: top;
}
.guide-doc thead th {
  font-family: var(--g-mono);
  font-size: .66rem;
  letter-spacing: .11em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-weight: 600;
  background: var(--surface-2);
  border-bottom: 1px solid var(--rule-strong);
}
.guide-doc tbody tr:last-child td { border-bottom: 0; }
.guide-doc td.num, .guide-doc th.num { font-variant-numeric: tabular-nums; text-align: right; }
.guide-doc td.mid, .guide-doc th.mid { text-align: center; }
.guide-doc .yes { color: var(--good); font-weight: 700; }
.guide-doc .no { color: var(--ink-3); }
.guide-doc code {
  font-family: var(--g-mono);
  font-size: .86em;
  background: var(--surface-2);
  padding: .08em .35em;
  border-radius: 2px;
}

.guide-doc .flag {
  border: 1px solid var(--rule);
  border-left: 3px solid var(--flag, var(--accent));
  background: var(--surface);
  border-radius: 3px;
  padding: .95rem 1.1rem;
  margin: 1rem 0;
}
.guide-doc .flag > :last-child { margin-bottom: 0; }
.guide-doc .flag .flag-t {
  font-family: var(--g-mono);
  font-size: .66rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--flag, var(--accent));
  display: block;
  margin-bottom: .3rem;
}
.guide-doc .flag.stop { --flag: var(--crit); background: var(--crit-soft); }
.guide-doc .flag.care { --flag: var(--warn); background: var(--warn-soft); }
.guide-doc .flag.ok { --flag: var(--good); background: var(--good-soft); }

.guide-doc figure { margin: 1.75rem 0; }
.guide-doc figure svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  color: var(--ink);
}
.guide-doc .fig-scroll {
  overflow-x: auto;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: var(--surface);
  padding: 1.2rem .75rem;
}
.guide-doc figcaption {
  font-size: .85rem;
  color: var(--ink-3);
  margin-top: .7rem;
  max-width: 40rem;
}
.guide-doc figcaption b { color: var(--ink-2); }

.guide-doc dl.gloss { margin: 1.2rem 0; display: grid; gap: 0; }
.guide-doc dl.gloss > div {
  display: grid;
  gap: .15rem .9rem;
  padding: .75rem 0;
  border-bottom: 1px solid var(--rule);
}
@media (min-width: 700px) {
  .guide-doc dl.gloss > div { grid-template-columns: 12rem 1fr; }
}
.guide-doc dl.gloss dt { font-weight: 700; font-size: .93rem; }
.guide-doc dl.gloss dd { margin: 0; color: var(--ink-2); font-size: .93rem; }

.guide-doc .handoff {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 1.2rem 1.35rem;
  margin: 1.75rem 0;
}
.guide-doc .handoff strong { display: block; font-size: 1.02rem; margin-bottom: .25rem; }
.guide-doc .handoff span { color: var(--ink-2); font-size: .93rem; }
.guide-doc .handoff:hover, .guide-doc .handoff:focus-visible { background: var(--surface); }

.guide-doc .end {
  margin-top: 3.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--ink);
  font-size: .88rem;
  color: var(--ink-3);
}
.guide-doc :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;
