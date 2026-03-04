import { loadConfig } from "./config.js";
import { getProvider } from "./providers/index.js";
import {
  computeRepoMetrics,
  aggregateMetrics,
  computePerEngineerTable,
} from "./metrics/calculator.js";
import type { AggregatedMetrics } from "./types.js";
import type { Config } from "./types.js";
import type { PullRequestRecord } from "./types.js";
import { registerDefaultProviders } from "./providers/index.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { result: AggregatedMetrics; ts: number }>();

function cacheKey(config: Config): string {
  return JSON.stringify({
    repos: config.repos.map((r) => `${r.provider}:${r.owner}/${r.repo}`).sort(),
    sinceDays: config.sinceDays,
    maxMergedPrsPerRepo: config.maxMergedPrsPerRepo,
  });
}

export async function runMetrics(
  configPath?: string,
  options?: { skipCache?: boolean }
): Promise<AggregatedMetrics> {
  const config = loadConfig(configPath);
  if (!options?.skipCache) {
    const key = cacheKey(config);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.result;
  }

  registerDefaultProviders(process.env as Record<string, string | undefined>);

  const allRepoMetrics: import("./types.js").RepoMetrics[] = [];
  const allRecords: PullRequestRecord[] = [];

  const fetchOptions =
    config.maxMergedPrsPerRepo != null
      ? { maxMerged: config.maxMergedPrsPerRepo }
      : undefined;

  for (const repoConfig of config.repos) {
    const provider = getProvider(repoConfig.provider);
    if (!provider) {
      const hint =
        repoConfig.provider === "github"
          ? " Set GITHUB_TOKEN in .env to enable GitHub."
          : "";
      console.error(
        `Unknown or unconfigured provider "${repoConfig.provider}" for ${repoConfig.owner}/${repoConfig.repo}; skip.${hint}`
      );
      continue;
    }

    const records = await provider.fetchMergedPRs(
      repoConfig,
      config.sinceDays,
      fetchOptions
    );
    const repoKey = `${repoConfig.owner}/${repoConfig.repo}`;
    allRepoMetrics.push(computeRepoMetrics(records, repoKey));
    allRecords.push(...records);
  }

  const result = aggregateMetrics(allRepoMetrics);
  result.perEngineerTable = computePerEngineerTable(allRecords);

  if (!options?.skipCache) {
    cache.set(cacheKey(config), { result, ts: Date.now() });
  }
  return result;
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms < 86400_000) return `${(ms / 3600_000).toFixed(1)}h`;
  return `${(ms / 86400_000).toFixed(1)}d`;
}
