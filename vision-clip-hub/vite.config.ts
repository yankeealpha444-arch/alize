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
const hubNodeModules = path.resolve(__dirname, "node_modules");

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
    /** Parent `../src` imports must share the same React + Query + Router instances as the hub bundle. */
    alias: {
      react: path.join(hubNodeModules, "react"),
      "react-dom": path.join(hubNodeModules, "react-dom"),
      "react/jsx-runtime": path.join(hubNodeModules, "react", "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.join(hubNodeModules, "react", "jsx-dev-runtime.js"),
      "@tanstack/react-query": path.join(hubNodeModules, "@tanstack", "react-query"),
      "@tanstack/query-core": path.join(hubNodeModules, "@tanstack", "query-core"),
      /** Without this, parent `../src` files (e.g. Sidebar `Link`) can resolve a second copy of RR → null Router context / basename crash. */
      "react-router": path.join(hubNodeModules, "react-router"),
      "react-router-dom": path.join(hubNodeModules, "react-router-dom"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "react-router",
      "react-router-dom",
    ],
  },
}));
