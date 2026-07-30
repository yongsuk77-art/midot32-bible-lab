import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const output = join(root, ".worker-dist");
const generated = join(root, "worker", "generated-assets.ts");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8"
};

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

const files = await listFiles(dist);
const assets = {};
for (const file of files) {
  const urlPath = `/${relative(dist, file).split(sep).join("/")}`;
  const contentType = contentTypes[extname(file).toLowerCase()] || "application/octet-stream";
  assets[urlPath] = {
    contentType,
    base64: (await readFile(file)).toString("base64")
  };
}

const placeholder =
  "// This file is temporarily replaced during the Worker build.\n" +
  "export const ASSETS: Record<string, { contentType: string; base64: string }> = {};\n";

try {
  await writeFile(
    generated,
    `// Generated temporarily by scripts/build-worker.mjs.\nexport const ASSETS: Record<string, { contentType: string; base64: string }> = ${JSON.stringify(assets)};\n`,
    "utf8"
  );
  await mkdir(output, { recursive: true });
  await build({
    entryPoints: [join(root, "worker", "index.ts")],
    outfile: join(output, "worker.mjs"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: true,
    legalComments: "none"
  });
} finally {
  await writeFile(generated, placeholder, "utf8");
}

console.log(`Bundled ${files.length} web assets into .worker-dist/worker.mjs`);
