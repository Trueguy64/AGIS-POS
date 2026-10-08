import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Load ./.env if it exists. Never overrides variables already set (tests, Render). Never throws when the file is missing. */
export function loadEnv(file = ".env") {
  let text: string;
  try { text = readFileSync(file, "utf8"); } catch { return; }
  for (const [k, v] of Object.entries(parseEnv(text))) if (process.env[k] === undefined) process.env[k] = v;
}
