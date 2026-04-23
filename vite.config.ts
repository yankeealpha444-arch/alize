import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Single `@/` resolver: main app uses `./src`, files under `vision-clip-hub/` use `./vision-clip-hub/src`.
 * (Replacing `alias: { "@": ./src }` alone would steal `@/` from nested hub modules.)
 */
function dualAtAlias(): Plugin {
  const mainSrc = path.resolve(__dirname, "src");
  const hubSrc = path.resolve(__dirname, "vision-clip-hub", "src");
  return {
    name: "dual-at-alias",
    enforce: "pre",
    async resolveId(id, importer) {
      if (!id.startsWith("@/")) return null;
      const norm = importer?.replace(/\\/g, "/") ?? "";
      const root = norm.includes("/vision-clip-hub/") ? hubSrc : mainSrc;
      const absolute = path.join(root, id.slice(2));
      const resolved = await this.resolve(absolute, importer, { skipSelf: true });
      return resolved?.id ?? null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Use localhost (not "::") so the browser URL, dev server, and HMR WebSocket
    // resolve to the same host:port. "::" can yield mismatched WS targets when Vite
    // falls back to another port (e.g. page on :8082 while WS still targets :8080).
    host: "localhost",
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
      // Do not set hmr.port — HMR uses the same port as the HTTP dev server after
      // conflict resolution (8080 → 8081 → 8082 …).
    },
  },
  plugins: [dualAtAlias(), react(), mode === "development" && componentTagger()].filter(Boolean),
}));
