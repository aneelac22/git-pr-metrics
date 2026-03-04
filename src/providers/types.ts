import type { PullRequestRecord, RepoConfig } from "../types.js";

/**
 * A provider fetches PR and review data for a single repo.
 * Implement this to plug in GitHub, GitLab, etc.
 */
export interface PRMetricsProvider {
  readonly name: string;

  /**
   * Fetch merged PRs (and their reviews) for the given repo.
   * @param sinceDays - Limit to PRs merged in the last N days.
   * @param options - Optional maxMerged cap per repo to reduce API usage.
   */
  fetchMergedPRs(
    config: RepoConfig,
    sinceDays?: number,
    options?: { maxMerged?: number }
  ): Promise<PullRequestRecord[]>;
}
