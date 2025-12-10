#!/usr/bin/env node
import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersionInfo() {
  try {
    const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    const commitDate = execSync("git log -1 --format=%cI").toString().trim();
    const dateObj = new Date(commitDate);
    const formattedDate = dateObj.toISOString().split(".")[0] + "Z";
    return `${formattedDate}-${commitHash}`;
  } catch (error) {
    console.warn("Warning: Could not get git info, using dev version");
    return "dev";
  }
}

const version = getVersionInfo();
const content = `// Auto-generated file - do not edit manually
export const BUILD_VERSION = "${version}";
`;

const outputPath = `${__dirname}/../src/version.ts`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content);

console.log(`Generated version: ${version}`);
