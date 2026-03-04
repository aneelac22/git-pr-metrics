/**
 * Shared types for PR metrics. Provider-agnostic where possible.
 */

export interface RepoConfig {
  provider: string;
  owner: string;
  repo: string;
}

export interface Config {
  repos: RepoConfig[];
  sinceDays?: number;
  /** Cap merged PRs fetched per repo (reduces API calls and load time). */
  maxMergedPrsPerRepo?: number;
}

/** A normalized pull request for metrics (from any provider). */
export interface PullRequestRecord {
  id: string;
  number: number;
  title: string;
  author: string;
  authorLogin: string;
  createdAt: Date;
  mergedAt: Date | null;
  /** Review submissions: who and when (any type: COMMENT, APPROVED, CHANGES_REQUESTED). */
  reviews: { login: string; submittedAt: Date; state: string }[];
  /** When the first review was requested (if available). */
  firstReviewRequestedAt: Date | null;
  /** When each reviewer was first requested (reviewer login -> date). */
  reviewerRequestedAt?: Record<string, Date>;
  /** Inline review comments per user on this PR (user login -> count). */
  reviewCommentsCountByUser?: Record<string, number>;
  /** Lines added in this PR (when provided by provider). */
  additions?: number;
  /** Lines deleted in this PR (when provided by provider). */
  deletions?: number;
  /** Repo identifier for grouping. */
  repoKey: string;
}

/** One row in the per-engineer metrics table. */
export interface PerEngineerRow {
  user: string;
  prsMerged: number;
  prsReviewed: number;
  /** Median time from review request to their first review (ms). */
  responseTimeToReviewRequestsMs: number | null;
  /** Median time from first review to merge for their PRs (ms). */
  timeWaitingOnReviewsMs: number | null;
  /** Median time from PR open to first review for their PRs (ms). */
  waitTimeToFirstReviewMs: number | null;
  /** Average review cycles (review submissions) on PRs they authored. */
  reviewCyclesUntilMergeAuthored: number | null;
  /** Average review submissions they made per PR they reviewed. */
  reviewCyclesAsReviewer: number | null;
  /** Average comments left per PR they reviewed (review submissions + inline comments). */
  commentsLeftWhileReviewing: number | null;
  /** Average comments received per PR they authored (from others). */
  commentsReceivedWhileReviewing: number | null;
  /** Total lines added across PRs they authored. */
  totalLinesAdded: number;
  /** Total lines deleted across PRs they authored. */
  totalLinesDeleted: number;
}

/** Per-repo metrics. */
export interface RepoMetrics {
  repoKey: string;
  totalMerged: number;
  /** Milliseconds from PR open to first review (median). */
  waitTimeToFirstReviewMs: number | null;
  /** Milliseconds from first review request to first review (median); or open→first review if no request. */
  reviewResponseTimeMs: number | null;
  /** Average number of review submissions per PR before merge. */
  reviewCyclesUntilMerge: number;
  /** PRs merged per engineer (login -> count). */
  mergedPerEngineer: Record<string, number>;
  /** Number of PRs reviewed per engineer (login -> count). */
  reviewedPerEngineer: Record<string, number>;
  /** Per-engineer table for this repo only. */
  perEngineerTable: PerEngineerRow[];
}

/** Aggregated metrics across all repos. */
export interface AggregatedMetrics {
  repos: RepoMetrics[];
  aggregated: {
    totalMerged: number;
    waitTimeToFirstReviewMs: number | null;
    reviewResponseTimeMs: number | null;
    reviewCyclesUntilMerge: number;
    mergedPerEngineer: Record<string, number>;
    reviewedPerEngineer: Record<string, number>;
  };
  /** Per-user table: User, PRs merged, PRs reviewed, response time, time waiting on reviews, wait to first review, review cycles (authored + as reviewer). */
  perEngineerTable: PerEngineerRow[];
}
