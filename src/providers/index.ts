import type { PRMetricsProvider } from "./types.js";
import { createGitHubProvider } from "./github.js";

const providers = new Map<string, PRMetricsProvider>();

export function registerProvider(provider: PRMetricsProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): PRMetricsProvider | undefined {
  return providers.get(name);
}

/** Register default providers. GitHub is always registered (token optional; use for private repos and higher rate limits). */
export function registerDefaultProviders(env: Record<string, string | undefined>): void {
  registerProvider(createGitHubProvider(env.GITHUB_TOKEN));
}

export type { PRMetricsProvider } from "./types.js";
