import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

function includeLocalDemoScript() {
  return {
    name: "include-local-demo-script",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "assets/app.js",
        source: readFileSync(new URL("./assets/app.js", import.meta.url), "utf8")
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/jspdf.umd.min.js",
        source: readFileSync(new URL("./assets/jspdf.umd.min.js", import.meta.url), "utf8")
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/invoice-fonts.js",
        source: readFileSync(new URL("./assets/invoice-fonts.js", import.meta.url), "utf8")
      });
    }
  };
}

export default defineConfig({
  plugins: [includeLocalDemoScript()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
