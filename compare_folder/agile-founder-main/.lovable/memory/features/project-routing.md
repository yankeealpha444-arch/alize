---
name: Project-scoped routing
description: All founder routes use :projectId param, data is scoped per project
type: feature
---
All founder routes now use `:projectId` URL param:
- `/dashboard/:projectId`, `/tests/:projectId`, `/builder/:projectId`, etc.
- `/p/:projectId` for public MVP (user view)
- Legacy routes (`/dashboard`) redirect to `/dashboard/default`

Data layer (`projectData.ts`) stores per-project data with key `alize_project_{projectId}`.

AppLayout sidebar includes Founder/User View toggle.
- Founder View = sidebar + all founder tools
- User View = opens `/p/:projectId` in new tab (clean, no founder tools)

`useProjectId()` hook extracts projectId from URL params.
`generateProjectId(idea)` creates a slug from the idea text.
