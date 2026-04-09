---
name: Three mode separation
description: Public MVP (/p), Founder Dashboard (/dashboard), Builder (/builder) must never mix
type: feature
---
The system has 3 distinct modes that must stay separated:

1. **Public MVP** (`/p`) — customer-facing, NO founder tools, NO dashboard, NO edit suggestions
2. **Founder Dashboard** (`/dashboard` + sidebar pages) — metrics, tests, AI insights, versions
3. **Builder** (`/builder`) — where founder edits the MVP with AI chat bar

Product type detection (`src/lib/productType.ts`) determines MVP flow:
- Tool/AI tool → use first, signup later
- SaaS → signup first, then use
- Marketplace → browse first, then signup
- Landing → read, then email signup

Share links always point to `/p` (public MVP), never to `/builder`.
