# Alizé UI Prompt Library

Reusable **section** and **component** prompts for building MVPs that read as **polished products**, not one-off generators. Mix and match by product type; paste blocks into Cursor when implementing or refining UI.

---

## How to use this library

1. **Pick only the blocks you need** for the MVP’s single primary job. Fewer sections = clearer story.
2. **Do not overload pages** — one hero, one primary input path, one results surface, optional metrics + trust.
3. **Maintain one clear main action** per screen (upload, generate, compare, approve, export, etc.).
4. **Keep outputs product-shaped**: labeled, scannable, with hierarchy — not a dump of raw text or generic cards.
5. **Stack order (typical)**: Identity → Input → Results → Metrics/insights → Workflow nudges → Trust → Footer.

---

## Premium style rules (apply to every block)

- **Visual**: Clean surfaces, generous spacing, one accent color, subtle borders or soft shadows — not noisy gradients everywhere.
- **Hierarchy**: One dominant headline; body text muted; numbers and labels crisp.
- **Imagery**: Reserve room for thumbnails, previews, or charts; use placeholders that look intentional (aspect ratios, not gray boxes only).
- **Tone**: Confident, concise, product copy — not tutorial voice or marketing fluff in primary UI.
- **Density**: Minimal clutter; group related controls; avoid duplicate CTAs.

---

## Archetype legend

| Tag | Meaning |
|-----|---------|
| `dashboard` | Ongoing monitoring, KPIs, trends |
| `tool` | Single-job utility, input → output |
| `marketplace` | Discovery, listings, transactions |
| `generator` | Creates variants (copy, hooks, images) |
| `assistant` | Guided, conversational or stepwise help |
| `media/clipper` | Upload/process media, clips, previews |

---

# A. Product identity

## A1 — Hero header

| Field | Content |
|-------|---------|
| **Name** | Hero header |
| **What it is for** | Primary product name and value in one glance. |
| **Where to use** | Top of landing, app shell, MVP preview above the fold. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Design a hero header for an Alizé MVP: one H1 product name (short), optional eyebrow label above it, max two lines. Use strong typographic hierarchy (font weight and size contrast), generous top padding, and align left on desktop / centered on mobile. No clutter—no more than one secondary line below the title unless it is the official subtitle block. Premium startup aesthetic: calm background, single accent for emphasis only.
```

---

## A2 — Product subtitle

| Field | Content |
|-------|---------|
| **Name** | Product subtitle |
| **What it is for** | One sentence clarifying who it’s for and what outcome they get. |
| **Where to use** | Directly under hero; can repeat in meta areas. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Add a product subtitle: one sentence, max ~120 characters, muted text color, comfortable line height. It must state audience + outcome (e.g. “for creators who need X without Y”). No buzzword soup; readable at a glance under the hero title. Premium, minimal—no icons required unless they clarify meaning.
```

---

## A3 — Product badge row

| Field | Content |
|-------|---------|
| **Name** | Product badge row |
| **What it is for** | Quick trust and positioning chips (e.g. “Beta”, “AI”, “No signup”). |
| **Where to use** | Below subtitle or beside hero on wide layouts. |
| **Archetypes** | tool, generator, assistant, media/clipper |

**Cursor-ready prompt:**

```
Add a horizontal row of small badges/pills (3–5 max): short labels only, subtle border or soft fill, consistent height and radius. Use for status (Beta), tech (AI-assisted), or policy (No card required). Do not duplicate the subtitle; chips are scannable labels only. Tight spacing, aligned with hero grid.
```

---

## A4 — Audience / outcome strip

| Field | Content |
|-------|---------|
| **Name** | Audience/outcome strip |
| **What it is for** | Three micro-points: who, pain, win — in one compact strip. |
| **Where to use** | Between hero and primary input; optional on public pages. |
| **Archetypes** | tool, generator, assistant, marketplace, media/clipper |

**Cursor-ready prompt:**

```
Add a slim strip with three columns (stack on mobile): each column has a 3–5 word label and one short supporting line. Themes: (1) who it’s for, (2) the friction removed, (3) the measurable outcome. Use icons only if minimal (single stroke). Light divider or subtle background band—premium, not marketing landing clutter.
```

---

## A5 — Brand promise block

| Field | Content |
|-------|---------|
| **Name** | Brand promise block |
| **What it is for** | Short manifesto: what Alizé (or the product) guarantees. |
| **Where to use** | Mid-page or above footer on marketing-style MVP shells. |
| **Archetypes** | marketplace, assistant, generator |

**Cursor-ready prompt:**

```
Insert a brand promise block: short heading + 2–3 sentences max, inside a rounded card with soft border. Tone: confident, specific—what the user can rely on (speed, quality bar, privacy stance). No testimonials here—this is promise, not proof. Clean typography, one subtle accent line or icon optional.
```

---

# B. Input / upload

## B6 — Text input area

| Field | Content |
|-------|---------|
| **Name** | Text input area |
| **What it is for** | Primary multi-line user content for tools and generators. |
| **Where to use** | Center column of tool MVPs; assistant first step. |
| **Archetypes** | tool, generator, assistant |

**Cursor-ready prompt:**

```
Build a primary text input area: labeled field with helper text below (one line). Rounded-xl, clear focus ring, placeholder that shows an example—not lorem ipsum. Min height for 3–5 lines; optional character hint. Single primary button aligned with the field (right or full-width on mobile). Premium form styling—no raw browser defaults.
```

---

## B7 — File upload area

| Field | Content |
|-------|---------|
| **Name** | File upload area |
| **What it is for** | Generic file pick with constraints and reassurance. |
| **Where to use** | Tools that accept documents, CSV, images. |
| **Archetypes** | tool, generator, media/clipper |

**Cursor-ready prompt:**

```
Create a file upload module: dashed border dropzone, “Choose file” secondary action, accepted formats and max size in muted microcopy. Show selected file name state with remove control. Accessible focus states; compact height—does not dominate the page. Clean card container; error state inline below.
```

---

## B8 — Video upload area

| Field | Content |
|-------|---------|
| **Name** | Video upload area |
| **What it is for** | Video-specific upload with format hints and preview hook. |
| **Where to use** | Clipper, editor, analyzer MVPs. |
| **Archetypes** | media/clipper, tool |

**Cursor-ready prompt:**

```
Design a video upload section: prominent aspect-ratio preview placeholder (16:9) inside the dropzone, labels for MP4/MOV/etc., max duration or size note. Primary CTA “Upload video” inside the zone. After selection, show filename + duration placeholder. Style: product UI, not generic form—rounded-2xl, subtle shadow optional.
```

---

## B9 — Drag and drop zone

| Field | Content |
|-------|---------|
| **Name** | Drag and drop zone |
| **What it is for** | Explicit DnD affordance with keyboard-accessible fallback. |
| **Where to use** | Any upload-first flow. |
| **Archetypes** | tool, media/clipper, generator |

**Cursor-ready prompt:**

```
Implement a drag-and-drop zone: visible “Drop files here” state, hover/active border accent, and a persistent “or click to browse” link for accessibility. Support focus-visible outline for keyboard users. Keep copy short; show constraints as a single muted line. Premium minimal—no heavy illustrations.
```

---

## B10 — URL input block

| Field | Content |
|-------|---------|
| **Name** | URL input block |
| **What it is for** | Paste a link (video, article, product page). |
| **Where to use** | Importers, bookmarking tools, clip-from-URL flows. |
| **Archetypes** | tool, assistant, media/clipper |

**Cursor-ready prompt:**

```
Add a URL input block: single-line field with https placeholder, inline validation styling (invalid URL), and a primary “Import” or “Fetch” button. Helper: what domains work. Paste-friendly (large hit target). Clean inline layout on desktop; stacked on mobile.
```

---

## B11 — Search bar

| Field | Content |
|-------|---------|
| **Name** | Search bar |
| **What it is for** | Query within listings, catalog, or history. |
| **Where to use** | Marketplace, dashboard with entities. |
| **Archetypes** | marketplace, dashboard |

**Cursor-ready prompt:**

```
Add a search bar: full-width on mobile, max-width container on desktop, magnifier icon inside field, clear button when text present. Placeholder describes what’s searchable. Rounded-full or rounded-xl consistent with design system. Subtle border; focus ring visible.
```

---

## B12 — Multi-step intake

| Field | Content |
|-------|---------|
| **Name** | Multi-step intake |
| **What it is for** | Wizard-style collection without overwhelming one screen. |
| **Where to use** | Assistant onboarding, complex tools. |
| **Archetypes** | assistant, tool |

**Cursor-ready prompt:**

```
Build a multi-step intake: show step label “Step X of Y”, one question or field group per step, Back/Continue footer. Progress is linear; do not hide required fields on later steps. Spacing is calm; primary CTA only on Continue. Premium card layout; no sidebar clutter.
```

---

## B13 — Quick option chips

| Field | Content |
|-------|---------|
| **Name** | Quick option chips |
| **What it is for** | Fast presets (tone, length, platform). |
| **Where to use** | Above or beside main input in generators. |
| **Archetypes** | generator, assistant, media/clipper |

**Cursor-ready prompt:**

```
Add quick option chips: horizontal wrap, single-select or multi-select per spec, selected state clearly distinct (fill + border). Labels are 1–3 words. Optional “Reset” text button. Compact vertical rhythm—chips never taller than one line of text. Accessible: role=button or proper radio group semantics.
```

---

## B14 — Filters bar

| Field | Content |
|-------|---------|
| **Name** | Filters bar |
| **What it is for** | Narrow results (date, category, sort). |
| **Where to use** | Results pages, dashboards, marketplace browse. |
| **Archetypes** | dashboard, marketplace, tool |

**Cursor-ready prompt:**

```
Create a filters bar: horizontal on desktop (wrap on small screens), each filter a compact control (select or popover). Show active filter count or “Clear all” when applicable. Sticky optional below header. Visual weight lighter than primary CTA—filters support scanning, not competing with main action.
```

---

## B15 — Settings panel

| Field | Content |
|-------|---------|
| **Name** | Settings panel |
| **What it is for** | Advanced options without blocking the default path. |
| **Where to use** | Collapsible section or slide-over in tools. |
| **Archetypes** | tool, dashboard, generator, assistant |

**Cursor-ready prompt:**

```
Add a settings panel: collapsed by default with “Advanced” or gear affordance. Inside: grouped toggles, selects, and short descriptions. Save applies to next run; show subtle confirmation toast or inline “Saved”. No duplicate primary actions—settings never replace the main workflow CTA.
```

---

# C. Results / outputs

## C16 — Results grid

| Field | Content |
|-------|---------|
| **Name** | Results grid |
| **What it is for** | Scan many items (cards) in a responsive grid. |
| **Where to use** | Outputs, templates, assets. |
| **Archetypes** | generator, media/clipper, marketplace, tool |

**Cursor-ready prompt:**

```
Lay out a results grid: responsive columns (1/2/3), consistent card height per row or masonry only if needed. Each cell: title, key metadata line, one primary action. Use gap-4+, subtle card border, hover lift optional. Empty state points to input—see empty state prompt if needed.
```

---

## C17 — Results list

| Field | Content |
|-------|---------|
| **Name** | Results list |
| **What it is for** | Dense, comparable rows (text-heavy). |
| **Where to use** | Ranked ideas, logs, exports preview. |
| **Archetypes** | dashboard, tool, generator |

**Cursor-ready prompt:**

```
Build a results list: rows with leading icon or thumbnail, primary label, secondary metadata, trailing action or chevron. Dividers or zebra optional—keep contrast subtle. Row height comfortable for touch; keyboard focus visible. Premium list—aligned baselines, no random font sizes.
```

---

## C18 — Clip cards

| Field | Content |
|-------|---------|
| **Name** | Clip cards |
| **What it is for** | Video clip previews with duration and scores. |
| **Where to use** | Media/clipper MVPs. |
| **Archetypes** | media/clipper |

**Cursor-ready prompt:**

```
Design clip cards: 16:9 thumbnail area (gradient or frame placeholder), title or auto-label, duration, score or “viral %” as mock metric, two actions: Use / Export. Rounded-2xl card, shadow-sm. Hierarchy: thumbnail → score → actions. Feels like a real clipping product, not a generic gallery.
```

---

## C19 — Image cards

| Field | Content |
|-------|---------|
| **Name** | Image cards |
| **What it is for** | Thumbnails for generated or uploaded images. |
| **Where to use** | Image tools, ad creative, thumbnails. |
| **Archetypes** | generator, tool, marketplace |

**Cursor-ready prompt:**

```
Create image cards: fixed aspect (square or 4:5), image placeholder with subtle border, caption below (2 lines max ellipsis), badge for variant name. Hover: light overlay with “Preview” or “Select”. Consistent card radius; no stretched images—use object-cover in spec.
```

---

## C20 — Hook cards

| Field | Content |
|-------|---------|
| **Name** | Hook cards |
| **What it is for** | Short copy variants (headlines, hooks). |
| **Where to use** | Social copy generators. |
| **Archetypes** | generator |

**Cursor-ready prompt:**

```
Implement hook cards: large readable hook text (2–4 lines), small label for angle or platform, actions Copy and Use. Card padding generous; typography is the hero—no tiny body copy. Selected state clear if user picks one winner. Premium editorial feel, not chat bubbles.
```

---

## C21 — Caption output cards

| Field | Content |
|-------|---------|
| **Name** | Caption output cards |
| **What it is for** | Longer post text with optional hashtags line. |
| **Where to use** | Caption generators, schedulers. |
| **Archetypes** | generator, assistant |

**Cursor-ready prompt:**

```
Add caption output cards: body text block with line breaks preserved, separate muted line for hashtags/CTA. Primary “Copy caption” sticky in card footer or top-right icon. Character count optional. Looks like a finished post draft, not a code block—readable width max ~65ch.
```

---

## C22 — Comparison table

| Field | Content |
|-------|---------|
| **Name** | Comparison table |
| **What it is for** | Side-by-side metrics or variants. |
| **Where to use** | Pricing, A/B, competitor tools. |
| **Archetypes** | tool, dashboard, marketplace |

**Cursor-ready prompt:**

```
Build a comparison table: first column is row labels, subsequent columns are options. Sticky header row on scroll optional. Zebra or row dividers; align numbers right. Highlight recommended column with subtle background. Mobile: horizontal scroll with shadow hint or stack as cards—choose one pattern and document it.
```

---

## C23 — Ranked output list

| Field | Content |
|-------|---------|
| **Name** | Ranked output list |
| **What it is for** | Ordered list with rank, score, and rationale snippet. |
| **Where to use** | “Best option” tools, evaluators. |
| **Archetypes** | tool, generator, assistant |

**Cursor-ready prompt:**

```
Create a ranked list: rank number or medal styling for top 3, each row shows title, score, one-line why. Expand optional for detail. Visual hierarchy emphasizes #1 without breaking accessibility (not color-only). Clean spacing; rank column fixed width.
```

---

## C24 — Before / after block

| Field | Content |
|-------|---------|
| **Name** | Before/after block |
| **What it is for** | Show transformation (copy, image, metrics). |
| **Where to use** | Rewriters, optimizers, editors. |
| **Archetypes** | tool, generator, media/clipper |

**Cursor-ready prompt:**

```
Design a before/after block: two panels labeled Before / After, equal width on desktop, stacked on mobile. Divider or slider optional for images. Typography contrast shows improvement—after panel slightly emphasized. Subtle captions; no gimmicky animations required—clarity first.
```

---

## C25 — Selected item preview

| Field | Content |
|-------|---------|
| **Name** | Selected item preview |
| **What it is for** | Focused preview of one chosen result. |
| **Where to use** | After selection from grid/list. |
| **Archetypes** | tool, generator, media/clipper, marketplace |

**Cursor-ready prompt:**

```
Add a selected item preview panel: shows large preview area (image/video/text) plus metadata column (duration, size, score). Primary actions repeated here (Export, Copy). Breadcrumb or “Back to results” for context. Feels like a detail page slice embedded in the flow—premium spacing.
```

---

# D. Metrics / analytics

## D26 — KPI cards row

| Field | Content |
|-------|---------|
| **Name** | KPI cards row |
| **What it is for** | 3–4 headline numbers with labels. |
| **Where to use** | Dashboards, performance summaries. |
| **Archetypes** | dashboard, media/clipper, marketplace |

**Cursor-ready prompt:**

```
Lay out a KPI row: 3–4 cards, each with small uppercase label, large number (tabular nums), optional delta in green/red muted. Equal card height; grid on desktop, stack on mobile. No chart inside—numbers only. Subtle card border; plenty of whitespace—premium analytics strip.
```

---

## D27 — Line chart section

| Field | Content |
|-------|---------|
| **Name** | Line chart section |
| **What it is for** | Trend over time (mock data OK). |
| **Where to use** | Dashboard, growth MVPs. |
| **Archetypes** | dashboard |

**Cursor-ready prompt:**

```
Add a line chart section: title + date range selector optional, chart area with calm grid lines, single or dual series max for clarity. Legend minimal; tooltips on hover. Container height fixed; padding inside card. Use mock data with realistic labels—feels like a product analytics module, not a demo chart explosion.
```

---

## D28 — Bar chart section

| Field | Content |
|-------|---------|
| **Name** | Bar chart section |
| **What it is for** | Category comparison (platforms, variants). |
| **Where to use** | Breakdowns, A/B summaries. |
| **Archetypes** | dashboard, tool |

**Cursor-ready prompt:**

```
Create a bar chart block: horizontal bars preferred for long labels, sorted descending. Show axis labels and units. Card container; title states what is compared. Limit categories to ≤8 for readability. Mock data OK—labels must be plausible (Instagram, TikTok, etc.).
```

---

## D29 — Engagement breakdown

| Field | Content |
|-------|---------|
| **Name** | Engagement breakdown |
| **What it is for** | Shares of likes, comments, saves, shares. |
| **Where to use** | Social analytics MVPs. |
| **Archetypes** | dashboard, media/clipper |

**Cursor-ready prompt:**

```
Design an engagement breakdown: donut or stacked bar with legend, percentages summing to 100%. Short insight line below (“Saves up vs last week”—mock). Color palette restrained (4 segments max). Accessible: pattern or labels—not color alone for segments.
```

---

## D30 — Performance summary

| Field | Content |
|-------|---------|
| **Name** | Performance summary |
| **What it is for** | Narrative + key stats in one card. |
| **Where to use** | Top of analytics views. |
| **Archetypes** | dashboard, generator |

**Cursor-ready prompt:**

```
Build a performance summary card: 2–3 sentence narrative in body weight + 2 inline stats bolded OR a mini KPI pair beside text. One CTA optional (“View details”). Tone analytical, not hype. Single card—do not duplicate KPI row content verbatim if both exist; complement instead.
```

---

## D31 — Trend insight card

| Field | Content |
|-------|---------|
| **Name** | Trend insight card |
| **What it is for** | Single insight tied to a trend (up/down). |
| **Where to use** | Next to charts or in feed of insights. |
| **Archetypes** | dashboard |

**Cursor-ready prompt:**

```
Add a trend insight card: icon + headline (“Engagement trending up”) + one sentence cause + period label. Optional sparkline miniature. Muted card background; border-l accent in brand color for emphasis. One insight only per card—scannable.
```

---

## D32 — Top performer card

| Field | Content |
|-------|---------|
| **Name** | Top performer card |
| **What it is for** | Highlights best asset or clip with thumbnail. |
| **Where to use** | Clipper, content analytics. |
| **Archetypes** | media/clipper, dashboard |

**Cursor-ready prompt:**

```
Create a top performer card: thumbnail left, title + metric right, badge “Top this week”. Single primary action “Open” or “Reuse style”. Compact height; feels editorial. Mock metric must look realistic (CTR, saves, score %).
```

---

## D33 — Improvement score card

| Field | Content |
|-------|---------|
| **Name** | Improvement score card |
| **What it is for** | Before→after score or grade lift. |
| **Where to use** | Optimizers, graders. |
| **Archetypes** | tool, generator |

**Cursor-ready prompt:**

```
Design an improvement score card: large score or letter grade, sublabel “vs last version”, arrow up/down. Short bullet what changed (mock). Avoid cluttering with multiple scores—one primary metric. Clean circular progress or simple bar optional—pick one style and stay consistent.
```

---

## D34 — Leaderboard block

| Field | Content |
|-------|---------|
| **Name** | Leaderboard block |
| **What it is for** | Ranked users, assets, or variants. |
| **Where to use** | Community, contests, internal benchmarks. |
| **Archetypes** | marketplace, dashboard |

**Cursor-ready prompt:**

```
Implement a leaderboard: top 5–10 rows, rank, name/title, score, optional avatar placeholder. Highlight top 3 subtly. Footer link “See full leaderboard” if truncated. Fair, neutral styling—no gamification noise unless product requires it.
```

---

## D35 — Activity timeline

| Field | Content |
|-------|---------|
| **Name** | Activity timeline |
| **What it is for** | Chronological events (exports, uploads, publishes). |
| **Where to use** | Account activity, project history. |
| **Archetypes** | dashboard, assistant |

**Cursor-ready prompt:**

```
Add an activity timeline: vertical line with nodes, each node has timestamp, verb + object (“Exported clip — Summer promo”), optional status pill. Max 8 visible with “Show more”. Spacing regular; timestamps muted. Premium minimal—no chat UI metaphors.
```

---

# E. AI / insight / learning

## E36 — AI insights panel

| Field | Content |
|-------|---------|
| **Name** | AI insights panel |
| **What it is for** | Curated bullets explaining what the model noticed. |
| **Where to use** | After results in AI-heavy tools. |
| **Archetypes** | assistant, generator, tool, media/clipper |

**Cursor-ready prompt:**

```
Build an AI insights panel: section title “Insights”, 3–5 bullets max, each one sentence, concrete (not “AI analyzed your data”). Optional confidence note at bottom. Card with soft border; icon optional per bullet—keep light. Tone: helpful analyst, not marketing.
```

---

## E37 — Recommendation cards

| Field | Content |
|-------|---------|
| **Name** | Recommendation cards |
| **What it is for** | Actionable suggestions as discrete cards. |
| **Where to use** | Next steps after generation. |
| **Archetypes** | assistant, generator, dashboard |

**Cursor-ready prompt:**

```
Create recommendation cards: each card title + one-line rationale + primary action (“Apply”). Max 3 cards visible; horizontal scroll on mobile optional. Selected card state if user applies one. Feels like product suggestions, not a blog list—tight vertical rhythm.
```

---

## E38 — Learning loop section

| Field | Content |
|-------|---------|
| **Name** | Learning loop section |
| **What it is for** | Shows system improves from feedback (mock). |
| **Where to use** | Settings, end of flow, trust areas. |
| **Archetypes** | assistant, generator |

**Cursor-ready prompt:**

```
Add a learning loop section: heading “How it gets smarter”, three steps with icons (Feedback → Patterns → Better outputs). Short line each. Reassuring, not technical. Single column; numbers or connectors optional. Premium onboarding aesthetic—no stock illustrations required.
```

---

## E39 — Why this was chosen block

| Field | Content |
|-------|---------|
| **Name** | Why this was chosen block |
| **What it is for** | Transparency for ranked or selected output. |
| **Where to use** | Under winner in ranked lists. |
| **Archetypes** | tool, assistant, generator |

**Cursor-ready prompt:**

```
Insert a “Why this was chosen” block: collapsible default expanded for top result. 2–4 bullets referencing observable signals (pace, clarity, keyword match—mock labels). Calm background; no jargon like “embedding”. Helps trust without exposing raw scores unless needed.
```

---

## E40 — Confidence / score block

| Field | Content |
|-------|---------|
| **Name** | Confidence/score block |
| **What it is for** | Single confidence % or score with label. |
| **Where to use** | Next to outputs, in preview. |
| **Archetypes** | tool, generator, assistant |

**Cursor-ready prompt:**

```
Design a confidence block: label “Confidence” or “Match score”, large percentage or 0–100, short explainer (“Based on your inputs and goals”). Optional thin progress bar. Never use red/green alone—pair with text. Compact—fits beside output without dominating.
```

---

## E41 — Pattern detection card

| Field | Content |
|-------|---------|
| **Name** | Pattern detection card |
| **What it is for** | “We noticed X across your clips/posts.” |
| **Where to use** | Analytics, clipper, dashboard. |
| **Archetypes** | dashboard, media/clipper |

**Cursor-ready prompt:**

```
Add a pattern detection card: headline pattern name (“Hooks under 7s perform better”), evidence line with mock sample size, one suggested experiment. Badge “Pattern” optional. Feels like analytics product insight—not a generic tip widget.
```

---

## E42 — Suggested next step block

| Field | Content |
|-------|---------|
| **Name** | Suggested next step block |
| **What it is for** | One primary recommended action after task completion. |
| **Where to use** | Bottom of results, completion states. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Create a suggested next step block: single CTA button + one sentence why (“Export top clips to schedule”). Secondary text link optional (“Skip”). Visually separated with top border or inset card. Only one main button—no competing primary actions.
```

---

## E43 — Optimization tips panel

| Field | Content |
|-------|---------|
| **Name** | Optimization tips panel |
| **What it is for** | Short list of improvements user can apply. |
| **Where to use** | Beside scores, in editors. |
| **Archetypes** | tool, generator, media/clipper |

**Cursor-ready prompt:**

```
Build an optimization tips panel: title “Ways to improve”, numbered tips (3 max), each with “Apply” micro-action if relevant or read-only. Tips are specific (“Tighten first 2 seconds”) not vague. Compact list; no walls of text—premium checklist feel.
```

---

## E44 — Best performer explanation

| Field | Content |
|-------|---------|
| **Name** | Best performer explanation |
| **What it is for** | Explains why the top variant won. |
| **Where to use** | A/B, ranking tools. |
| **Archetypes** | tool, dashboard, generator |

**Cursor-ready prompt:**

```
Add a best performer explanation: references the winning item by name, 2–3 bullets comparing to runner-up on concrete dimensions (mock). Optional small comparison mini-table. Tone neutral and educational—helps user learn for next run.
```

---

## E45 — Feedback-to-learning section

| Field | Content |
|-------|---------|
| **Name** | Feedback-to-learning section |
| **What it is for** | Explains how thumbs up/down improves future outputs. |
| **Where to use** | Near feedback controls. |
| **Archetypes** | assistant, generator |

**Cursor-ready prompt:**

```
Add a feedback-to-learning section: short copy “Your feedback tunes recommendations”, privacy-safe statement, link “Learn more” optional. Placed adjacent to Yes/No or star control—does not replace the control. Minimal height; trust-building microcopy only.
```

---

# F. Workflow / product steps

## F46 — Stepper section

| Field | Content |
|-------|---------|
| **Name** | Stepper section |
| **What it is for** | Horizontal steps with labels for multi-stage flows. |
| **Where to use** | Wizards, publish pipelines. |
| **Archetypes** | assistant, tool, marketplace |

**Cursor-ready prompt:**

```
Implement a stepper: 3–5 steps with labels, current step emphasized, completed steps checkmarked or filled. Clickable only if spec allows going back. Responsive: scroll horizontal on small screens. Clean line connectors—premium SaaS stepper, not a form wizard cartoon.
```

---

## F47 — Progress indicator

| Field | Content |
|-------|---------|
| **Name** | Progress indicator |
| **What it is for** | Percent or bar for long-running tasks. |
| **Where to use** | Upload, processing, batch jobs. |
| **Archetypes** | tool, media/clipper, generator |

**Cursor-ready prompt:**

```
Add a progress indicator: determinate bar with percentage OR indeterminate with stage label (“Transcoding…”). Cancel optional if safe. Below bar: elapsed time mock optional. Accessible: aria-valuenow when determinate. Calm colors—no flashing animation.
```

---

## F48 — Current stage card

| Field | Content |
|-------|---------|
| **Name** | Current stage card |
| **What it is for** | Explains what is happening now in a pipeline. |
| **Where to use** | Processing UIs, assistant flows. |
| **Archetypes** | assistant, media/clipper |

**Cursor-ready prompt:**

```
Design a current stage card: title is stage name, one sentence description, optional ETA range (mock). Icon left; card full-width below header. Updates copy when stage changes—single focus, no log dump here (use timeline for history).
```

---

## F49 — Action checklist

| Field | Content |
|-------|---------|
| **Name** | Action checklist |
| **What it is for** | Ordered tasks user must complete. |
| **Where to use** | Setup, launch checklists. |
| **Archetypes** | assistant, dashboard, marketplace |

**Cursor-ready prompt:**

```
Create an action checklist: checkboxes with labels, disabled items if locked with tooltip reason. Progress subtext (“2 of 5 done”). Strikethrough completed optional. Primary CTA at bottom when all required done. Clean spacing—feels like a launch checklist in Notion/Linear style, minimal chrome.
```

---

## F50 — Completion state

| Field | Content |
|-------|---------|
| **Name** | Completion state |
| **What it is for** | Clear success after task finishes. |
| **Where to use** | End of flows. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Add a completion state: success icon or subtle check, headline “Done” variant specific to task, one line summary, primary next action (“View results” / “Download”). Avoid confetti unless brand demands—premium products use restraint. Optional secondary link “Start over”.
```

---

## F51 — Next step CTA block

| Field | Content |
|-------|---------|
| **Name** | Next step CTA block |
| **What it is for** | Prominent continuation after partial success. |
| **Where to use** | Between stages; bottom of partial results. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Build a next step CTA block: full-width inset card, short headline, supporting line, one primary button. Example: “Ready to publish?” → “Connect account”. Visually distinct from page chrome but not garish—single column, centered text on mobile.
```

---

## F52 — Review and approve block

| Field | Content |
|-------|---------|
| **Name** | Review and approve block |
| **What it is for** | Final confirmation before irreversible action. |
| **Where to use** | Publish, spend, send. |
| **Archetypes** | marketplace, assistant, tool |

**Cursor-ready prompt:**

```
Add review and approve: summary bullets of what will happen, checkbox “I understand”, Approve disabled until checked. Secondary Cancel. Destructive styling only if action is destructive—otherwise neutral primary. Feels like Stripe/Linear confirmation discipline.
```

---

## F53 — Export / share block

| Field | Content |
|-------|---------|
| **Name** | Export/share block |
| **What it is for** | Export formats and share links. |
| **Where to use** | After results; asset tools. |
| **Archetypes** | tool, generator, media/clipper |

**Cursor-ready prompt:**

```
Create an export/share block: buttons for CSV, PNG, Copy link—only what’s relevant; max 4 actions. Optional “Share to…” icons with tooltips. Helper text for file naming pattern. Layout: horizontal button group with consistent height—premium toolbar, not a junk drawer of icons.
```

---

## F54 — Feedback buttons

| Field | Content |
|-------|---------|
| **Name** | Feedback buttons |
| **What it is for** | Thumbs, stars, or binary helpful/not. |
| **Where to use** | Under outputs, after completion. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Add feedback buttons: question “Was this helpful?” with Yes/No or 5-star per spec. Subtle; not blocking navigation. Thank-you state replaces controls after submit. Accessible names on buttons; focus styles visible. Pair with feedback-to-learning microcopy if present—do not duplicate long text.
```

---

## F55 — Empty state / no data state

| Field | Content |
|-------|---------|
| **Name** | Empty state |
| **What it is for** | Guides user when no results yet. |
| **Where to use** | Lists, dashboards, grids. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Design an empty state: illustration optional (simple geometric), headline “No clips yet” style, one sentence what to do, primary CTA to the input/upload. No dead ends—always a path forward. Centered in container; muted palette; friendly but premium tone.
```

---

# G. Trust / polish

## G56 — Social proof strip

| Field | Content |
|-------|---------|
| **Name** | Social proof strip |
| **What it is for** | Logos or “Used by” line without full case study. |
| **Where to use** | Below hero or above footer. |
| **Archetypes** | marketplace, generator, assistant |

**Cursor-ready prompt:**

```
Add a social proof strip: label “Trusted by teams at” or similar, 4–6 monochrome logo placeholders in a row (grayscale, even height). No fake brand names unless provided—use “Logo” placeholders. Subtle opacity; does not compete with hero. Optional single stat beside logos if space allows.
```

---

## G57 — Testimonials block

| Field | Content |
|-------|---------|
| **Name** | Testimonials block |
| **What it is for** | 2–3 quotes with name and role. |
| **Where to use** | Marketing sections of MVP shells. |
| **Archetypes** | marketplace, assistant, generator |

**Cursor-ready prompt:**

```
Build a testimonials block: 2–3 cards, each quote ≤2 sentences, name + role + optional avatar placeholder. Grid on desktop; carousel optional on mobile with dots. Quotes in readable size; role in muted small text. Premium editorial—no star rating clutter unless product is reviews.
```

---

## G58 — FAQ block

| Field | Content |
|-------|---------|
| **Name** | FAQ block |
| **What it is for** | Collapsible Q&A for objections. |
| **Where to use** | Pre-footer, help surfaces. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Create an FAQ block: accordion, 5–7 items, question as trigger, answer concise (2–4 sentences). First item open by default optional. Focus styles and keyboard nav for accordion. Section title “FAQ”; spacing airy—feels like Stripe docs FAQ, not a wiki page.
```

---

## G59 — Footer CTA

| Field | Content |
|-------|---------|
| **Name** | Footer CTA |
| **What it is for** | Final conversion nudge before site footer. |
| **Where to use** | Bottom of long pages. |
| **Archetypes** | marketplace, generator, assistant |

**Cursor-ready prompt:**

```
Add a footer CTA band: full-width subtle background contrast, heading + one line value, single primary button, optional email field if waitlist. Padding generous; content max-width centered. One action only—do not stack multiple competing CTAs here.
```

---

## G60 — Clean footer

| Field | Content |
|-------|---------|
| **Name** | Clean footer |
| **What it is for** | Links, legal, copyright — minimal. |
| **Where to use** | Page bottom. |
| **Archetypes** | All |

**Cursor-ready prompt:**

```
Design a clean footer: single row on desktop (links left, legal right) or stacked centered on mobile. Links: Privacy, Terms, Contact—text only, muted. Copyright line with year. No newsletter duplication if already in footer CTA. Plenty of padding; hairline top border—premium and quiet.
```

---

## Appendix — Quick archetype → block map (suggestions)

| Archetype | Often-use blocks |
|-----------|------------------|
| **dashboard** | A1–A2, D26–D31, D34–D35, E36–E37, F55, G58–G60 |
| **tool** | A1–A2, B6–B10, B13–B15, C16–C18, C22, D26, E36, E40, F47–F50, F53–F55 |
| **marketplace** | A1–A4, B11–B12, B14, C16–C17, C19, C22, D26, D34, G56–G57, G59–G60 |
| **generator** | A1–A3, B6, B13, C20–C21, C23, D33, E36–E37, E42–E45, F50–F51, F54 |
| **assistant** | A2, A5, B12, B15, E36–E39, E45, F46–F49, F52, F54–F55 |
| **media/clipper** | A1–A2, B8–B9, C18, C25, D26, D29, D32, E41, E43, F47–F48, F53, F55 |

---

*End of library — 60 prompts. Version with your design tokens when implementing.*
