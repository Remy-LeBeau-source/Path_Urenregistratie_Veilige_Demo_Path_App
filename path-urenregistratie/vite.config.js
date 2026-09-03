import { defineConfig } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function includeLocalDemoScript() {
  return {
    name: "include-local-demo-script",
    // Vite verplaatst en hasht manifest.php standaard naar assets/manifest-XXXX.php.
    // Daardoor wees __DIR__ in dat bestand naar de assets-map en kon manifest.php
    // ../server/config.local.php niet meer vinden -- de omgeving viel dan altijd
    // terug op "production" en de op het beginscherm geplaatste TEST-app heette
    // gewoon "Path Uren". We houden manifest.php daarom onbewerkt in de webroot.
    writeBundle(options) {
      // Zet de manifest-verwijzing terug naar de onbewerkte manifest.php in de
      // webroot (Vite herschrijft hem naar de gehashte assets/manifest-XXXX.php).
      const outDir = options.dir || fileURLToPath(new URL("./dist", import.meta.url));
      const indexPath = `${outDir}/index.html`;
      const html = readFileSync(indexPath, "utf8");
      const fixed = html.replace(/href="[^"]*\/?manifest-[^"]*\.php"/i, 'href="manifest.php"');
      if (fixed !== html) {
        writeFileSync(indexPath, fixed);
      }
    },
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (/^assets\/manifest-.*\.php$/i.test(fileName)) {
          delete bundle[fileName];
        }
      }
      this.emitFile({
        type: "asset",
        fileName: "manifest.php",
        source: readFileSync(new URL("./manifest.php", import.meta.url), "utf8")
      });
      // Statische productie-fallback: wordt niet meer vanuit index.html
      // gelinkt, maar moet wel opvraagbaar blijven op de live site.
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: readFileSync(new URL("./manifest.webmanifest", import.meta.url), "utf8")
      });
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
    open: true,
    allowedHosts: ["terminal.local"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
