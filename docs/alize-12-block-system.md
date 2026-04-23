# Alizé 12-Block UI System

**Purpose:** A universal UI foundation so MVPs can be assembled from the same high-quality blocks while **remaining product-specific** through copy, density, ordering, and visual emphasis—not identical layouts.

**Core rule:** Same block vocabulary; **different** block choices, wording, hierarchy, and spacing per product type. Do not ship “one template with different text.”

---

## Supported product types

| Type | Typical user job |
|------|------------------|
| `dashboard` | Monitor, compare, decide over time |
| `tool` | Do one job: input → output |
| `marketplace` | Discover, filter, act on listings |
| `generator` | Create variants from a prompt or constraints |
| `assistant` | Guided, multi-step help or transformation |
| `media / clipper` | Upload/process media; clips, previews, exports |
| `analytics` | Read metrics, trends, and explanations |
| `landing / concept` | Understand value; single conversion path |

---

## Global system rules (premium, not generic)

1. **6–8 blocks** on most pages. Rarely exceed 9; never stack all 12 on one screen.
2. **One primary action** per view: one obvious CTA or one obvious input path—not competing primaries.
3. **Do not overload** with sections: if a block doesn’t earn its space, drop it.
4. **Adapt labels and copy** to the domain (e.g. “Listings” vs “Clips” vs “Runs”).
5. **Strong hierarchy:** one hero; body text muted; numbers and actions crisp.
6. **Spacing:** generous vertical rhythm; group related blocks in cards or bands.
7. **Framing:** prefer product language (“Runs”, “Exports”, “Workspace”) over raw AI jargon (“prompt”, “generate” unless the product is explicitly a generator).
8. **Outputs:** structured, labeled, scannable—never a single undifferentiated text blob unless the product is purely a writer.

---

## The 12 core blocks

### Block 1 — Hero Header

| Field | Content |
|-------|---------|
| **Purpose** | Clear product identity: name, outcome line, optional supporting sentence. |
| **When to use** | Almost every MVP shell; first screen of a flow. |
| **When NOT to use** | Dense analytics-only embeds; modal tools; or when a parent layout already supplies global chrome (then use a **compact title strip** instead of a full hero). |
| **Adapt by type** | **Dashboard:** emphasize scope (“Acme — Marketing”). **Tool:** name + one outcome. **Marketplace:** name + discovery promise. **Generator:** name + what gets created. **Assistant:** name + “how we help” in one line. **Media/clipper:** name + throughput/outcome. **Analytics:** name + report period. **Landing:** name + bold value; shorter body. |
| **Content style** | Short headline; outcome line is a **verb + outcome** where possible. |
| **Layout style** | Left-aligned hero for app-like; centered acceptable on landing. Eyebrow optional. |

---

### Block 2 — Main Action Block

| **Purpose** | The single thing the user should do **now**—one primary CTA with minimal distraction. |
| **When to use** | Tool, generator, assistant steps, landing conversion, or any screen with a single next move. |
| **When NOT to use** | Pure browse dashboards (discovery is the action—use search + grid). Pure analytics read-only (optional soft CTA only). |
| **Adapt by type** | **Tool:** “Run analysis”, “Calculate”. **Generator:** “Generate”, “Create variants”. **Assistant:** “Continue”, “Get plan”. **Landing:** “Join waitlist”, “Book demo”. **Dashboard:** optional “Add integration” as secondary—avoid if KPIs are the focus. |
| **Content style** | One sentence max above CTA; no feature lists here. |
| **Layout style** | Inset card or full-width band; primary button visually dominant. |

---

### Block 3 — Input / Upload Area

| **Purpose** | Collect input: text, file, video, URL, or search—clear instruction + affordance. |
| **When to use** | Whenever the product needs user material or query to proceed. |
| **When NOT to use** | Read-only dashboards with no user input on that view; or when parent provides global search only. |
| **Adapt by type** | **Tool:** single focused field or upload. **Marketplace:** search + filters (may split filters to a separate bar). **Generator:** prompt + constraints. **Assistant:** step-specific fields. **Media/clipper:** video upload + format hints. **Analytics:** date range or property selector. **Landing:** email only—keep tiny. |
| **Content style** | Instruction is imperative or question; constraints (size, format) in one muted line. |
| **Layout style** | One primary control per row on mobile; generous hit targets. |

---

### Block 4 — Results Grid

| **Purpose** | Visual scan of **multiple** outputs (3–6 cards typical). |
| **When to use** | Multiple comparable items: clips, listings, variants, reports. |
| **When NOT to use** | Single deterministic output (use **Result Card** alone or a **single result panel**). Empty data (use **Empty State**). |
| **Adapt by type** | **Marketplace:** listing cards. **Generator:** variant cards. **Media/clipper:** clip grid. **Dashboard:** may use grid for “entities” or defer to charts. |
| **Content style** | Section title states what the items are (“Top clips”, “Matching listings”). |
| **Layout style** | Responsive 1/2/3 columns; consistent card height per row when possible. |

---

### Block 5 — Result Card

| **Purpose** | One output unit: preview, title, tag/score, primary action. |
| **When to use** | Any list/grid item; can stand alone for single-result tools. |
| **When NOT to use** | When output is purely numeric (use KPI + chart instead). |
| **Adapt by type** | **Tool:** result + “Copy / Apply”. **Marketplace:** image + price + CTA. **Generator:** text preview + “Use”. **Media/clipper:** thumbnail + duration + score. |
| **Content style** | Title is concrete; avoid “Result 1”. Tags are domain labels (“High intent”, “9:16”). |
| **Layout style** | Thumbnail top or leading; actions at bottom or trailing edge. |

---

### Block 6 — KPI Metrics Row

| **Purpose** | Credibility and orientation: 3–4 headline numbers with labels. |
| **When to use** | Dashboard, analytics, media products with performance story; marketplaces for GMV/users if relevant. |
| **When NOT to use** | Pure single-shot tools with no ongoing metrics; landing unless a **proof strip** variant (keep 2–3 stats max). |
| **Adapt by type** | **Dashboard:** North Star + health metrics. **Marketplace:** liquidity, trust, conversion. **Media/clipper:** views, saves, engagement. **Analytics:** rate, volume, change. **Landing:** social proof numbers—tighter visual weight. |
| **Content style** | Short labels; tabular numbers; optional delta (“+12%”). |
| **Layout style** | Equal-width cards; align baselines; avoid chart junk inside KPI cards. |

---

### Block 7 — Performance Chart

| **Purpose** | Trend or comparison over time (line) or across categories (bar). |
| **When to use** | Time series or breakdown is central to the story. |
| **When NOT to use** | Static one-off tools; or when KPI row already suffices—don’t duplicate the same metric. |
| **Adapt by type** | **Dashboard / analytics:** primary. **Media/clipper:** reach/saves over time. **Marketplace:** demand or category mix (bar). **Tool:** optional “before/after” as alternative to time series. |
| **Content style** | Chart title states the metric and period; axis labels minimal. |
| **Layout style** | Fixed height container; single series default; dual series only if clearly differentiated. |

---

### Block 8 — AI Insights Panel

| **Purpose** | Short, actionable interpretations (2–3 cards)—what to change next. |
| **When to use** | When “why” or “what next” adds value: generators, analytics, media, assistant. |
| **When NOT to use** | Strict calculators with deterministic output and no interpretation; or when insights would duplicate chart titles. |
| **Adapt by type** | **Generator:** style/tone suggestions. **Analytics:** drivers and anomalies. **Assistant:** prioritized recommendations. **Media/clipper:** editing and pacing tips. **Landing:** only if product is AI-native and proof needs explanation—otherwise skip. |
| **Content style** | Each insight = **one** action-oriented sentence; no essays. |
| **Layout style** | Small cards or list; icon optional; avoid chat bubbles. |

---

### Block 9 — Learning Loop Section

| **Purpose** | Explain improvement over time: **Input → Output → Feedback → Improvement**. |
| **When to use** | Products that get better with use, feedback, or data (assistant, media, some dashboards). |
| **When NOT to use** | One-shot calculators; simple marketplaces; pure landing unless educating a novel loop. |
| **Adapt by type** | **Assistant:** emphasize conversation + memory. **Media/clipper:** uploads + model updates. **Dashboard:** data in → decisions out. |
| **Content style** | Four short labels + microcopy; no hype. |
| **Layout style** | Horizontal stepper on desktop; vertical on mobile. |

---

### Block 10 — Next Step CTA

| **Purpose** | After the core action: export, share, improve, publish, compare—**one row of clear options** (still one **primary** among them). |
| **When to use** | Most flows that produce an artifact or state change. |
| **When NOT to use** | When the only next step is obvious in the **Main Action Block**; avoid duplicate CTAs. |
| **Adapt by type** | **Tool:** export/copy. **Generator:** refine or regenerate. **Marketplace:** contact / save. **Media/clipper:** export pack / schedule. **Analytics:** subscribe / alert. |
| **Content style** | 2–3 actions max visible; more in overflow menu. |
| **Layout style** | Button group or split primary + secondary links. |

---

### Block 11 — Feedback Block

| **Purpose** | Lightweight capture: helpful or not; optional micro-reason. |
| **When to use** | Generators, assistants, tools, analytics experiments—when learning signal matters. |
| **When NOT to use** | Landing primary conversion (use one CTA); overcrowded bottoms—merge with Next Step if needed. |
| **Adapt by type** | **Generator / assistant:** after output. **Analytics:** after insight. **Tool:** after run. |
| **Content style** | One question; binary or 5-star per product norms. |
| **Layout style** | Small; below results; non-blocking. |

---

### Block 12 — Empty State

| **Purpose** | First-use or no-data: friendly message, instruction, **one** CTA to fix the empty condition. |
| **When to use** | Any list/grid/chart that can be empty; onboarding. |
| **When NOT to use** | Never show empty **and** a full results grid on the same dataset—pick one. |
| **Adapt by type** | **Marketplace:** “No matches—adjust search”. **Media/clipper:** “Upload a video”. **Dashboard:** “Connect source”. **Tool:** “Add input to run”. |
| **Content style** | Specific, not generic (“Nothing here”). |
| **Layout style** | Centered in section; illustration optional and minimal. |

---

## Selection system: recommended block sets by product type

**Rule:** Pick **6–8 blocks** from the recommended set for a single page. Order follows typical flow: **Identity → Act → Input → Output → Metrics → Intelligence → Guidance → Feedback → Empty handling**.

Legend: **Bold** = almost always; *italic* = common; (optional) = use when needed.

### A. Dashboard

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **KPI Metrics Row**, **Performance Chart** |
| Often | *AI Insights Panel*, *Next Step CTA* |
| Sometimes | **Learning Loop Section**, **Empty State** (no connections / no data) |

**Typical 7-block page:** Hero → KPI → Chart → Insights → Learning loop → Next step → Empty (inline in chart/list).

---

### B. Tool

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Main Action Block**, **Input / Upload Area** |
| Often | **Result Card** or small **Results Grid** (if multiple outputs), **Next Step CTA**, **Feedback Block** |
| Sometimes | **Empty State** (no input yet) |

**Typical 7-block page:** Hero → Main action → Input → Result(s) → Next step → Feedback → Empty (before first run).

---

### C. Marketplace

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Input / Upload Area** (search), **Results Grid**, **Result Card** |
| Often | **Next Step CTA**, **Empty State** |
| Sometimes | **KPI Metrics Row** (liquidity/trust strip) |

**Typical 7-block page:** Hero → Search/input → Grid of result cards → KPI strip (optional) → Next step → Empty.

---

### D. Generator

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Main Action Block**, **Input / Upload Area**, **Results Grid** or output cards |
| Often | **AI Insights Panel**, **Feedback Block**, **Next Step CTA** |
| Sometimes | **Empty State** (no generations yet) |

**Typical 8-block page:** Hero → Main action → Input → Results grid → Insights → Feedback → Next step → Empty.

---

### E. Assistant

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Main Action Block**, **Input / Upload Area** (step-shaped) |
| Often | **AI Insights Panel**, **Learning Loop Section**, **Next Step CTA**, **Feedback Block** |
| Sometimes | **Empty State** |

**Typical 8-block page:** Hero → Main action → Step input → Insights → Learning loop → Next step → Feedback → Empty.

---

### F. Media / clipper

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Input / Upload Area** (video), **Results Grid**, **Result Card**, **KPI Metrics Row**, **Performance Chart** |
| Often | **AI Insights Panel**, **Learning Loop Section**, **Next Step CTA** |
| Sometimes | **Empty State**, **Feedback Block** |

**Note:** This type is dense—**omit chart or KPI** if the page feels heavy; cap at 8 blocks.

---

### G. Analytics

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **KPI Metrics Row**, **Performance Chart** |
| Often | **AI Insights Panel**, **Next Step CTA** |
| Sometimes | **Learning Loop Section**, **Feedback Block** (experiment), **Empty State** |

**Typical 7-block page:** Hero → KPI → Chart → Insights → Learning loop or Feedback → Next step → Empty.

---

### H. Landing / concept page

| Priority | Blocks |
|----------|--------|
| Core | **Hero Header**, **Main Action Block** |
| Often | KPI or **proof strip** (use **KPI Metrics Row** in compact 2–3 stat form), **Next Step CTA** |
| Sometimes | **AI Insights Panel** (only if explaining an AI mechanism), **Empty State** as gentle fallback for logged-out preview areas |

**Typical 6-block page:** Hero → Main CTA → Proof strip → Optional insight → Next step → Empty (for optional interactive demo shell).

---

## Product-type adaptation: example page structures

Structures show **order** and **representative copy**. Swap blocks per rules above.

### Dashboard

1. **Hero** — “Revenue Command Center” / “See what’s driving growth this week.”
2. **KPI row** — MRR, active accounts, churn, expansion.
3. **Chart** — Revenue or usage trend.
4. **AI Insights** — “Expansion concentrated in EU enterprise.”
5. **Learning loop** — Data in → Signals → Actions → Better forecasts.
6. **Next step** — “Create alert”, “Export board.”
7. **Empty** — “Connect Stripe to see revenue” (inline in chart area).

### Tool

1. **Hero** — “CSV Normalizer” / “Clean messy files in one pass.”
2. **Main action** — Primary: “Run on this file.”
3. **Input** — Drag/drop CSV.
4. **Result card** — Preview table + download.
5. **Feedback** — Helpful?
6. **Next step** — “Download”, “Run another.”
7. **Empty** — “Drop a file to preview.”

### Marketplace

1. **Hero** — “Vintage Audio Swap” / “Find gear from trusted sellers.”
2. **Input** — Search + category chips.
3. **Results grid** — Listing cards.
4. **KPI strip** (optional) — Active listings, median sale time.
5. **Next step** — “List an item”, “Save search.”
6. **Empty** — “No results—broaden filters.”

### Generator

1. **Hero** — “Ad Headline Lab” / “10 variants from one brief.”
2. **Main action** — “Generate headlines.”
3. **Input** — Product + audience + tone.
4. **Results grid** — Headline cards with scores.
5. **AI Insights** — “Shorter lines won in your niche.”
6. **Feedback** — Thumbs on batch.
7. **Next step** — “Copy set”, “Refine constraints.”
8. **Empty** — “Add a brief to generate.”

### Assistant

1. **Hero** — “Onboarding Copilot” / “Turn goals into a rollout plan.”
2. **Main action** — “Continue setup.”
3. **Input** — Step 2 fields (team size, tools).
4. **AI Insights** — “Prioritize SSO before integrations.”
5. **Learning loop** — Goals → Plan → Feedback → Better plans.
6. **Next step** — “Share plan”, “Book review.”
7. **Feedback** — Was this step useful?
8. **Empty** — “Start by describing your team.”

### Media / clipper

1. **Hero** — “AI Video Clipper” / “More reach from every long video.”
2. **Input** — Video upload.
3. **Empty OR results** — Empty until upload; then **results grid** of clip cards.
4. **KPI row** — Views, saves, engagement, growth.
5. **Chart** — Reach over time.
6. **AI Insights** — Pacing, retention, saves.
7. **Learning loop** — Upload → Clips → Feedback → Better cuts.
8. **Next step** — Export pack, share, improve ranking.

### Analytics

1. **Hero** — “Campaign Pulse” / “Last 30 days at a glance.”
2. **KPI row** — Spend, CPA, ROAS, conversions.
3. **Chart** — CPA trend.
4. **AI Insights** — “Creative fatigue on Set B.”
5. **Next step** — “Pause ad set”, “Export report.”
6. **Feedback** — Was this insight useful?
7. **Empty** — “No spend data—connect ad account.”

### Landing / concept

1. **Hero** — Product name + outcome + proof line.
2. **Main action** — “Join waitlist” / “Get early access.”
3. **Proof strip** — 2–3 stats or logos (KPI row variant).
4. **Next step** — Secondary link to docs or demo.
5. **Empty** (optional) — Demo sandbox “Try a sample dataset.”

---

## Implementation guidance (for Alizé-generated MVPs)

### 1. Data model (conceptual)

- **`MvpProductType`** — one of the 8 types above.
- **`MvpBlockId`** — `hero` | `main_action` | `input` | `results_grid` | `result_card` | `kpi_row` | `chart` | `ai_insights` | `learning_loop` | `next_step` | `feedback` | `empty_state`.
- **`MvpPageSpec`** — ordered list of 6–8 `MvpBlockId` + per-block **variant** (e.g. `input:video_upload`, `chart:line`) + **copy tokens** (product name, outcome, domain labels).

### 2. Selection algorithm (human or codegen)

1. Classify idea → **product type** (rules + overrides).
2. Load **recommended set** for that type from the tables above.
3. Remove blocks that don’t apply (e.g. no time series → drop chart).
4. Enforce **6–8** blocks; merge **Next step + Feedback** into one section if needed.
5. Assign **copy tier**: headline tone, CTA verbs, KPI labels from domain glossary—not generic.

### 3. Differentiation checklist (avoid identical MVPs)

- [ ] Hero **outcome line** is domain-specific.
- [ ] Primary CTA verb matches the job (Upload vs Run vs Search vs Export).
- [ ] Result cards show **domain fields** (duration vs price vs score vs headline).
- [ ] KPI labels match the business (not “Metric 1/2/3”).
- [ ] Chart title names the **actual series** and period.
- [ ] Insights reference **plausible** drivers for that product class.
- [ ] Empty state names the **exact** fix (connect X, upload Y, widen Z).

### 4. File / code organization (future)

- `src/lib/mvp/blocks/` — presentational primitives: `HeroBlock`, `KpiRowBlock`, etc., styled once.
- `src/lib/mvp/assemblePage.ts` — maps `MvpPageSpec` → React tree (or JSON for AI).
- Product-specific pages **compose** primitives; they do not fork CSS per MVP.

### 5. What this document does **not** prescribe

- Exact colors, fonts, or component library details (use existing design system).
- One global layout template—**order and presence** change by type.

---

## Quick reference: block → product types (default fit)

| Block | Best fit |
|-------|-----------|
| Hero | All |
| Main action | tool, generator, assistant, landing |
| Input | tool, marketplace, generator, assistant, media, analytics (filters), landing (minimal) |
| Results grid | marketplace, generator, media |
| Result card | tool (single/multi), marketplace, generator, media |
| KPI row | dashboard, media, analytics, marketplace (sometimes), landing (proof) |
| Chart | dashboard, analytics, media (often), marketplace (sometimes) |
| AI insights | generator, assistant, analytics, media, dashboard |
| Learning loop | assistant, media, dashboard (sometimes) |
| Next step | All except some dashboards (optional) |
| Feedback | tool, generator, assistant, analytics (sometimes) |
| Empty state | All that show data-dependent UI |

---

*Internal Alizé spec — version with your `MvpProductType` enum and block registry when implementing.*
