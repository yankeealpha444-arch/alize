import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * vision-clip-hub imports parent `../src/lib/*` modules; those files use `@/…` which
 * must resolve to the **parent** app (`../src`), while hub-local `@/…` wins first.
 */
function resolveHubOrParentAlias(hubSrc: string, parentSrc: string): Plugin {
  const tryResolveFile = (dir: string, rel: string): string | undefined => {
    const base = path.join(dir, rel);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mts`,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, "index.ts"),
      path.join(base, "index.tsx"),
    ];
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
      } catch {
        /* ignore */
      }
    }
    return undefined;
  };

  return {
    name: "resolve-hub-or-parent-alias",
    enforce: "pre",
    resolveId(id: string) {
      if (!id.startsWith("@/")) return null;
      const rel = id.slice(2);
      return tryResolveFile(hubSrc, rel) ?? tryResolveFile(parentSrc, rel) ?? null;
    },
  };
}

const hubSrc = path.resolve(__dirname, "src");
const parentSrc = path.resolve(__dirname, "../src");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    resolveHubOrParentAlias(hubSrc, parentSrc),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
