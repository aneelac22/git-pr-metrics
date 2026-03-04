import type {
  PullRequestRecord,
  RepoMetrics,
  AggregatedMetrics,
  PerEngineerRow,
} from "../types.js";

export function computeRepoMetrics(records: PullRequestRecord[], repoKey: string): RepoMetrics {
  const merged = records.filter((r) => r.mergedAt != null);
  const totalMerged = merged.length;

  const waitTimesMs: number[] = [];
  const responseTimesMs: number[] = [];

  for (const pr of merged) {
    const created = pr.createdAt.getTime();
    const reviews = pr.reviews.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
    const firstReview = reviews[0];
    if (firstReview) {
      waitTimesMs.push(firstReview.submittedAt.getTime() - created);
      const requestAt = pr.firstReviewRequestedAt
        ? pr.firstReviewRequestedAt.getTime()
        : created;
      responseTimesMs.push(firstReview.submittedAt.getTime() - requestAt);
    }
  }

  const waitTimeToFirstReviewMs =
    waitTimesMs.length > 0 ? median(waitTimesMs) : null;
  const reviewResponseTimeMs =
    responseTimesMs.length > 0 ? median(responseTimesMs) : null;

  const totalReviewCycles = merged.reduce((sum, pr) => sum + pr.reviews.length, 0);
  const reviewCyclesUntilMerge =
    totalMerged > 0 ? totalReviewCycles / totalMerged : 0;

  const mergedPerEngineer: Record<string, number> = {};
  for (const pr of merged) {
    const login = pr.authorLogin;
    mergedPerEngineer[login] = (mergedPerEngineer[login] ?? 0) + 1;
  }

  const reviewedPerEngineer: Record<string, number> = {};
  const prsReviewedByUser = new Map<string, Set<string>>();
  for (const pr of merged) {
    for (const r of pr.reviews) {
      let set = prsReviewedByUser.get(r.login);
      if (!set) {
        set = new Set();
        prsReviewedByUser.set(r.login, set);
      }
      set.add(pr.id);
    }
  }
  for (const [login, set] of prsReviewedByUser) {
    reviewedPerEngineer[login] = set.size;
  }

  const perEngineerTable = computePerEngineerTable(records);

  return {
    repoKey,
    totalMerged,
    waitTimeToFirstReviewMs,
    reviewResponseTimeMs,
    reviewCyclesUntilMerge,
    mergedPerEngineer,
    reviewedPerEngineer,
    perEngineerTable,
  };
}

export function aggregateMetrics(reposMetrics: RepoMetrics[]): AggregatedMetrics {
  const totalMerged = reposMetrics.reduce((s, r) => s + r.totalMerged, 0);

  const waitTimes: number[] = [];
  const responseTimes: number[] = [];
  let totalCycles = 0;
  let totalMergedForCycles = 0;
  const mergedPerEngineer: Record<string, number> = {};
  const reviewedPerEngineer: Record<string, number> = {};

  for (const m of reposMetrics) {
    if (m.waitTimeToFirstReviewMs != null) waitTimes.push(m.waitTimeToFirstReviewMs);
    if (m.reviewResponseTimeMs != null) responseTimes.push(m.reviewResponseTimeMs);
    totalCycles += m.totalMerged * m.reviewCyclesUntilMerge;
    totalMergedForCycles += m.totalMerged;
    for (const [login, count] of Object.entries(m.mergedPerEngineer)) {
      mergedPerEngineer[login] = (mergedPerEngineer[login] ?? 0) + count;
    }
    for (const [login, count] of Object.entries(m.reviewedPerEngineer)) {
      reviewedPerEngineer[login] = (reviewedPerEngineer[login] ?? 0) + count;
    }
  }

  return {
    repos: reposMetrics,
    aggregated: {
      totalMerged,
      waitTimeToFirstReviewMs: waitTimes.length > 0 ? median(waitTimes) : null,
      reviewResponseTimeMs: responseTimes.length > 0 ? median(responseTimes) : null,
      reviewCyclesUntilMerge: totalMergedForCycles > 0 ? totalCycles / totalMergedForCycles : 0,
      mergedPerEngineer,
      reviewedPerEngineer,
    },
    perEngineerTable: [],
  };
}

/** Logins to exclude from the per-engineer table (e.g. bots). */
const EXCLUDED_ENGINEERS = new Set(["sourcery-ai[bot]"]);

/** Build per-engineer table from merged PR records (all repos combined). */
export function computePerEngineerTable(
  records: PullRequestRecord[]
): PerEngineerRow[] {
  const merged = records.filter((r) => r.mergedAt != null);
  const users = new Set<string>();
  for (const pr of merged) {
    if (!EXCLUDED_ENGINEERS.has(pr.authorLogin)) users.add(pr.authorLogin);
    for (const r of pr.reviews) {
      if (!EXCLUDED_ENGINEERS.has(r.login)) users.add(r.login);
    }
  }

  const rows: PerEngineerRow[] = [];

  for (const user of users) {
    const asAuthor = merged.filter((p) => p.authorLogin === user);
    const prsMerged = asAuthor.length;

    const prsReviewedSet = new Set<string>();
    const responseTimesMs: number[] = [];
    for (const pr of merged) {
      const reviewerReviews = pr.reviews
        .filter((r) => r.login === user)
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
      if (reviewerReviews.length === 0) continue;
      prsReviewedSet.add(pr.id);
      const requestedAt =
        pr.reviewerRequestedAt?.[user] ??
        pr.firstReviewRequestedAt ??
        pr.createdAt;
      responseTimesMs.push(
        reviewerReviews[0].submittedAt.getTime() - requestedAt.getTime()
      );
    }
    const prsReviewed = prsReviewedSet.size;

    const waitTimeToFirstReviewMs: number[] = [];
    const timeWaitingOnReviewsMs: number[] = [];
    const cyclesAuthoredPerPr: number[] = [];
    for (const pr of asAuthor) {
      const reviews = pr.reviews.sort(
        (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
      );
      const firstReview = reviews[0];
      if (firstReview) {
        waitTimeToFirstReviewMs.push(
          firstReview.submittedAt.getTime() - pr.createdAt.getTime()
        );
        if (pr.mergedAt) {
          timeWaitingOnReviewsMs.push(
            pr.mergedAt.getTime() - firstReview.submittedAt.getTime()
          );
        }
      }
      cyclesAuthoredPerPr.push(pr.reviews.length);
    }

    const cyclesAsReviewerPerPr: number[] = [];
    const commentsLeftPerPr: number[] = [];
    for (const pr of merged) {
      const myReviews = pr.reviews.filter((r) => r.login === user).length;
      if (myReviews > 0) {
        cyclesAsReviewerPerPr.push(myReviews);
        commentsLeftPerPr.push(myReviews + (pr.reviewCommentsCountByUser?.[user] ?? 0));
      }
    }

    const commentsReceivedPerPr: number[] = [];
    for (const pr of asAuthor) {
      const myReviews = pr.reviews.filter((r) => r.login === user).length;
      const othersReviews = pr.reviews.length - myReviews;
      const othersInline = Object.entries(pr.reviewCommentsCountByUser ?? {}).reduce(
        (s, [u, c]) => (u === user ? s : s + c),
        0
      );
      commentsReceivedPerPr.push(othersReviews + othersInline);
    }

    const totalLinesAdded = asAuthor.reduce((s, pr) => s + (pr.additions ?? 0), 0);
    const totalLinesDeleted = asAuthor.reduce((s, pr) => s + (pr.deletions ?? 0), 0);

    rows.push({
      user,
      prsMerged,
      prsReviewed,
      responseTimeToReviewRequestsMs:
        responseTimesMs.length > 0 ? median(responseTimesMs) : null,
      timeWaitingOnReviewsMs:
        timeWaitingOnReviewsMs.length > 0 ? median(timeWaitingOnReviewsMs) : null,
      waitTimeToFirstReviewMs:
        waitTimeToFirstReviewMs.length > 0 ? median(waitTimeToFirstReviewMs) : null,
      reviewCyclesUntilMergeAuthored:
        cyclesAuthoredPerPr.length > 0 ? average(cyclesAuthoredPerPr) : null,
      reviewCyclesAsReviewer:
        cyclesAsReviewerPerPr.length > 0 ? average(cyclesAsReviewerPerPr) : null,
      commentsLeftWhileReviewing:
        commentsLeftPerPr.length > 0 ? average(commentsLeftPerPr) : null,
      commentsReceivedWhileReviewing:
        commentsReceivedPerPr.length > 0 ? average(commentsReceivedPerPr) : null,
      totalLinesAdded,
      totalLinesDeleted,
    });
  }

  rows.sort((a, b) => {
    const totalA = a.prsMerged + a.prsReviewed;
    const totalB = b.prsMerged + b.prsReviewed;
    return totalB - totalA;
  });
  return rows;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}
