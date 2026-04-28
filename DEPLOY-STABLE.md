# Stable Deploy Workflow (Video MVP)

This workflow keeps the stable Video MVP immutable and deployable.

## Rules (Do Not Break)
- Never retag or mutate `v1-stable-video-mvp`.
- Do not change UI structure during stable deploy operations.
- Do not enable/modify worker automation in stable deploy flow.
- Deploy from `vision-clip-hub` only.

## Required Vercel Settings
- Root Directory: `vision-clip-hub`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## One Command Stable Check
Run from repo root:

```bash
node scripts/check-stable-video-mvp.mjs
```

What it does:
1. Installs dependencies in `vision-clip-hub`
2. Builds `vision-clip-hub`
3. Verifies `vision-clip-hub/dist/index.html` exists
4. Verifies routes `"/"`, `"/clips"`, and `"/link-clipper"` render `LinkClipperMvp`
5. Prints PASS or FAIL and exits non-zero on failure

## CI Guardrail
GitHub Actions workflow:
- `.github/workflows/stable-video-mvp.yml`
- Trigger: push to `main`
- Runs `npm install` and `npm run build` in `vision-clip-hub`
- Fails clearly if build fails

## Cursor / Agent Instruction
When asked to "run stable deploy check", execute:

```bash
node scripts/check-stable-video-mvp.mjs
```
