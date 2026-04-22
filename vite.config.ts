import type { OutputBundle, OutputChunk } from "rollup";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function bundleAnalysisPlugin(): Plugin {
  return {
    name: "bundle-analysis-report",
    generateBundle(_options: unknown, bundle: OutputBundle) {
      const chunks = Object.values(bundle)
        .filter((asset): asset is OutputChunk => asset.type === "chunk")
        .map((chunk) => ({
          file: chunk.fileName,
          bytes: Buffer.byteLength(chunk.code),
          imports: chunk.imports,
          dynamicImports: chunk.dynamicImports,
          modules: Object.keys(chunk.modules).sort()
        }))
        .sort((a, b) => b.bytes - a.bytes);

      const report = {
        generatedAt: new Date().toISOString(),
        totalJsBytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0),
        chunks
      };

      this.emitFile({
        type: "asset",
        fileName: "bundle-report.json",
        source: JSON.stringify(report, null, 2)
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), bundleAnalysisPlugin()],
  build: {
    target: "es2020",
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/p5/")) {
            return "vendor-p5";
          }

          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }

          if (id.includes("node_modules/gif.js.optimized/")) {
            return "vendor-gif";
          }

          if (
            id.includes("/public/legacy/analysis/") ||
            id.includes("\\public\\legacy\\analysis\\") ||
            id.includes("/public/legacy/edge/") ||
            id.includes("\\public\\legacy\\edge\\") ||
            id.includes("/public/legacy/path/") ||
            id.includes("\\public\\legacy\\path\\")
          ) {
            return "legacy-algorithms";
          }

          if (id.includes("/public/legacy/export/") || id.includes("\\public\\legacy\\export\\")) {
            return "legacy-export";
          }
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
