import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const vendorDir = path.join(repoRoot, "public", "vendor");

const vendorCopies = [
  {
    from: path.join(repoRoot, "node_modules", "p5", "lib", "p5.min.js"),
    to: path.join(vendorDir, "p5.min.js")
  },
  {
    from: path.join(repoRoot, "node_modules", "gif.js.optimized", "dist", "gif.js"),
    to: path.join(vendorDir, "gif.js")
  },
  {
    from: path.join(repoRoot, "node_modules", "gif.js.optimized", "dist", "gif.worker.js"),
    to: path.join(vendorDir, "gif.worker.js")
  }
];

await mkdir(vendorDir, { recursive: true });

await Promise.all(
  vendorCopies.map(({ from, to }) => {
    return copyFile(from, to);
  })
);
