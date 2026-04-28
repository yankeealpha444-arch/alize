# v1-stable-video-mvp Recovery Note

## Goal
Stable Video MVP behavior:
- `/`, `/clips`, `/link-clipper` render `LinkClipperMvp`
- Frontend deploys from `vision-clip-hub`
- No auto worker trigger on job creation
- User can paste link, create job, and see queued/processing/failed/completed state in UI

## Required Deploy Settings (Vercel)
- Root Directory: `vision-clip-hub`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## SPA Routing Fallback
`vision-clip-hub/vercel.json` must include:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

## Restore Checklist
1. Checkout tag `v1-stable-video-mvp`.
2. Verify routes in `vision-clip-hub/src/App.tsx` point `/`, `/clips`, `/link-clipper` to `LinkClipperMvp`.
3. Verify `src/lib/mvp/videoClipperBackend.ts` does not call `triggerAutoWorkerTick` after URL job creation.
4. Run:
   - `cd vision-clip-hub`
   - `npm install`
   - `npm run build`
5. Confirm `vision-clip-hub/dist/index.html` exists.
