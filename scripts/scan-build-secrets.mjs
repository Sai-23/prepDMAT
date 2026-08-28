import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import process from "node:process";

const buildDirectory = ".next";
const envFile = ".env.local";

process.loadEnvFile(envFile);

const privateNames = readFileSync(envFile, "utf8")
  .split(/\r?\n/)
  .map((line) => line.slice(0, line.indexOf("=")))
  .filter((name) =>
    name
    && !name.startsWith("NEXT_PUBLIC_")
    && (process.env[name]?.length ?? 0) >= 12,
  );

const files = [];
function collectFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "cache") collectFiles(path);
    else files.push(path);
  }
}
collectFiles(buildDirectory);

const genericPatterns = [
  /sk_live_[0-9A-Za-z]+/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const textExtensions = new Set([
  ".css", ".html", ".js", ".json", ".map", ".mjs", ".nft", ".txt",
]);
let genericMatchFiles = 0;
const exactMatches = Object.fromEntries(privateNames.map((name) => [name, 0]));

for (const file of files) {
  if (!textExtensions.has(extname(file))) continue;
  if (statSync(file).size > 50 * 1024 * 1024) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (genericPatterns.some((pattern) => pattern.test(content))) {
    genericMatchFiles += 1;
  }
  for (const name of privateNames) {
    if (content.includes(process.env[name])) exactMatches[name] += 1;
  }
}

console.log(JSON.stringify({
  scannedFiles: files.length,
  genericMatchFiles,
  exactPrivateEnvironmentValueMatches: exactMatches,
}, null, 2));

if (
  genericMatchFiles > 0
  || Object.values(exactMatches).some((count) => count > 0)
) {
  process.exitCode = 1;
}
