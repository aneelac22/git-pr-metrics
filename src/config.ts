import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type { Config } from "./types.js";

const DEFAULT_PATH = "config/repos.yaml";

export function loadConfig(configPath?: string): Config {
  const path = configPath ?? join(process.cwd(), DEFAULT_PATH);
  const raw = readFileSync(path, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.repos)) {
    throw new Error(`Invalid config at ${path}: expected { repos: [...] }`);
  }
  const repos = (parsed.repos as Array<Record<string, string>>).map((r) => ({
    provider: String(r.provider ?? "github"),
    owner: String(r.owner),
    repo: String(r.repo),
  }));
  const sinceDays =
    typeof parsed.sinceDays === "number" ? parsed.sinceDays : undefined;
  const maxMergedPrsPerRepo =
    typeof parsed.maxMergedPrsPerRepo === "number" ? parsed.maxMergedPrsPerRepo : undefined;
  return { repos, sinceDays, maxMergedPrsPerRepo };
}
