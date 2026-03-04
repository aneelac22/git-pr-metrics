#!/usr/bin/env node
import "dotenv/config";
import { runMetrics, formatDuration } from "./runner.js";

const configPath = process.argv[2];

runMetrics(configPath, { skipCache: true })
  .then((metrics) => {
    const out: Record<string, unknown> = {
      aggregated: {
        totalPullRequestsMerged: metrics.aggregated.totalMerged,
        waitTimeToFirstReview: metrics.aggregated.waitTimeToFirstReviewMs
          ? formatDuration(metrics.aggregated.waitTimeToFirstReviewMs)
          : null,
        reviewResponseTime: metrics.aggregated.reviewResponseTimeMs
          ? formatDuration(metrics.aggregated.reviewResponseTimeMs)
          : null,
        reviewCyclesUntilMerge: Math.round(metrics.aggregated.reviewCyclesUntilMerge * 10) / 10,
        mergedPerEngineer: metrics.aggregated.mergedPerEngineer,
        reviewedPerEngineer: metrics.aggregated.reviewedPerEngineer,
      },
      byRepo: metrics.repos.map((r) => ({
        repo: r.repoKey,
        totalMerged: r.totalMerged,
        waitTimeToFirstReview: r.waitTimeToFirstReviewMs
          ? formatDuration(r.waitTimeToFirstReviewMs)
          : null,
        reviewResponseTime: r.reviewResponseTimeMs
          ? formatDuration(r.reviewResponseTimeMs)
          : null,
        reviewCyclesUntilMerge: Math.round(r.reviewCyclesUntilMerge * 10) / 10,
        mergedPerEngineer: r.mergedPerEngineer,
        reviewedPerEngineer: r.reviewedPerEngineer,
      })),
      perEngineerTable: metrics.perEngineerTable.map((row) => ({
        user: row.user,
        prsMerged: row.prsMerged,
        prsReviewed: row.prsReviewed,
        responseTimeToReviewRequests:
          row.responseTimeToReviewRequestsMs != null
            ? formatDuration(row.responseTimeToReviewRequestsMs)
            : null,
        timeWaitingOnReviews:
          row.timeWaitingOnReviewsMs != null
            ? formatDuration(row.timeWaitingOnReviewsMs)
            : null,
        waitTimeToFirstReview:
          row.waitTimeToFirstReviewMs != null
            ? formatDuration(row.waitTimeToFirstReviewMs)
            : null,
        reviewCyclesUntilMergeAuthored:
          row.reviewCyclesUntilMergeAuthored != null
            ? Math.round(row.reviewCyclesUntilMergeAuthored * 10) / 10
            : null,
        reviewCyclesAsReviewer:
          row.reviewCyclesAsReviewer != null
            ? Math.round(row.reviewCyclesAsReviewer * 10) / 10
            : null,
        commentsLeftWhileReviewing:
          row.commentsLeftWhileReviewing != null
            ? Math.round(row.commentsLeftWhileReviewing * 10) / 10
            : null,
        commentsReceivedWhileReviewing:
          row.commentsReceivedWhileReviewing != null
            ? Math.round(row.commentsReceivedWhileReviewing * 10) / 10
            : null,
        totalLinesAdded: row.totalLinesAdded ?? 0,
        totalLinesDeleted: row.totalLinesDeleted ?? 0,
      })),
    };
    console.log(JSON.stringify(out, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
