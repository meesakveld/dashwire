#!/usr/bin/env node
// Decides which npm packages need a release: a package is released when the
// version in its package.json is not on npm yet. Also checks that a
// package-lock.json (if present) carries the same version in `version` and
// `packages[""].version`.
//
// Prints a JSON array of { dir, name, version, tag } for the publish matrix.
// Used by .github/workflows/publish-npm.yml; run locally to preview:
//
//   node scripts/npm-release-plan.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Publish order: dependencies first.
const PACKAGES = ["core", "sdk", "react-ui", "server"];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function isPublished(name, version) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return out !== "";
  } catch (err) {
    if (/E404|404 Not Found|is not in this registry/.test(String(err.stderr))) return false;
    throw err;
  }
}

const errors = [];
const releases = [];

for (const dir of PACKAGES) {
  const pkgDir = join("packages", dir);
  const manifest = readJson(join(pkgDir, "package.json"));
  if (manifest.private) continue;

  const { name, version } = manifest;
  const lockPath = join(pkgDir, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = readJson(lockPath);
    const rootVersion = lock.packages?.[""]?.version;
    if (lock.version !== version || rootVersion !== version) {
      errors.push(
        `${lockPath}: version ${lock.version} / packages[""].version ${rootVersion} ` +
          `do not match package.json (${version}). Run \`npm install --package-lock-only\` in ${pkgDir}.`,
      );
      continue;
    }
  }

  const published = isPublished(name, version);
  console.error(`${name}@${version}: ${published ? "already on npm" : "new version, will be released"}`);
  if (!published) releases.push({ dir: pkgDir, name, version, tag: `${dir}-v${version}` });
}

if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

console.log(JSON.stringify(releases));
