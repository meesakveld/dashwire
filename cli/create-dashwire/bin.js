#!/usr/bin/env node
import { intro, text, outro } from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirnameSafe();
function dirnameSafe() {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

async function main() {
  intro("⚡ Create Dashwire Project");

  const args = process.argv.slice(2);
  const isYes = args.includes("--yes") || args.includes("-y");

  let projectName = "my-dashwire";
  if (!isYes) {
    const res = await text({
      message: "Project name:",
      initialValue: "my-dashwire",
      validate: (value) => (value.trim() ? undefined : "Project name is required"),
    });
    if (typeof res === "symbol") {
      outro("Cancelled.");
      process.exit(0);
    }
    projectName = res;
  }

  const targetDir = path.join(process.cwd(), projectName);
  const templateDir = path.join(__dirname, "templates/base");

  if (!fs.existsSync(templateDir)) {
    console.error(`Error: Template directory not found at ${templateDir}`);
    process.exit(1);
  }

  fs.cpSync(templateDir, targetDir, { recursive: true });

  // Create default .env file
  fs.writeFileSync(
    path.join(targetDir, ".env"),
    "PORT=4000\nDASHWIRE_DB_PATH=./dashwire.db\nJWT_SECRET=super-secret-dashwire-key\n"
  );

  outro(
    `Success! Created Dashwire project in ${targetDir}\n\nNext steps:\n  cd ${projectName}\n  pnpm install\n  pnpm dev\n\nOr for VPS deployment:\n  docker compose up -d`
  );
}

main().catch(console.error);
