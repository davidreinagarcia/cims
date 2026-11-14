import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Emits /sw.js from src/pwa/sw.js with the list of built files to precache (T-41).
 * Hashed asset names change with their content, so the list doubles as the cache version.
 */
function serviceWorker(): Plugin {
  return {
    name: "cims-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const shell = ["/", "/index.html", ...readdirSync("public").map((f) => `/${f}`), ...Object.keys(bundle).map((f) => `/${f}`)];
      // Precache only what a visitor needs: skip the SW itself, generated INDEX files, legacy .woff and font
      // subsets for scripts we do not use (anything else loads from the network when asked).
      const wanted = (f: string) =>
        f !== "/sw.js" && !f.endsWith("INDEX.md") && !f.endsWith(".woff") && (!f.endsWith(".woff2") || f.includes("-latin-"));
      const unique = [...new Set(shell)].filter(wanted).sort();
      const version = createHash("sha1").update(JSON.stringify(unique)).digest("hex").slice(0, 10);
      const source = readFileSync("src/pwa/sw.js", "utf8")
        .replace("__VERSION__", version)
        .replace("__SHELL__", JSON.stringify(unique));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
});
