import { Octokit } from "octokit";
import type { RepoConfig } from "../types.js";
import type { PullRequestRecord } from "../types.js";
import type { PRMetricsProvider } from "./types.js";

const PER_PAGE = 100;
const CONCURRENCY = 6;

/** Create GitHub provider. Token optional: use for private repos and higher rate limits; omit for public repos only. */
export function createGitHubProvider(token?: string): PRMetricsProvider {
  const octokit = token ? new Octokit({ auth: token }) : new Octokit();

  return {
    name: "github",

    async fetchMergedPRs(
      config: RepoConfig,
      sinceDays?: number,
      options?: { maxMerged?: number }
    ): Promise<PullRequestRecord[]> {
      const { owner, repo } = config;
      const repoKey = `${owner}/${repo}`;
      const since = sinceDays
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
        : null;
      const maxMerged = options?.maxMerged ?? Infinity;

      const toFetch: Array<Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"][0]> = [];
      let page = 1;

      while (toFetch.length < maxMerged) {
        let pulls: Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"];
        try {
          const res = await octokit.rest.pulls.list({
            owner,
            repo,
            state: "closed",
            sort: "updated",
            direction: "desc",
            per_page: PER_PAGE,
            page,
          });
          pulls = res.data;
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status;
          const message = err instanceof Error ? err.message : String(err);
          if (status === 404 || message.includes("404") || message.includes("Not Found")) {
            throw new Error(
              `Repo not found or no access: ${owner}/${repo}. Check owner and repo name. For private repos, set GITHUB_TOKEN with repo scope.`
            );
          }
          throw err;
        }
        if (!pulls.length) break;
        for (const pr of pulls) {
          if (!pr.merged_at) continue;
          if (since && new Date(pr.merged_at) < since) continue;
          toFetch.push(pr);
          if (toFetch.length >= maxMerged) break;
        }
        if (pulls.length < PER_PAGE || toFetch.length >= maxMerged) break;
        page++;
      }

      const merged: PullRequestRecord[] = [];
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const batch = toFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (pr) => {
            const mergedAt = new Date(pr.merged_at!);
            const author = pr.user?.login ?? "unknown";
            const [reviews, timeline, reviewCommentsCountByUser, prDetails] = await Promise.all([
              fetchReviews(octokit, owner, repo, pr.number),
              fetchReviewRequestTimeline(octokit, owner, repo, pr.number),
              fetchReviewCommentsCountByUser(octokit, owner, repo, pr.number),
              octokit.rest.pulls.get({ owner, repo, pull_number: pr.number }),
            ]);
            const additions = prDetails.data.additions ?? 0;
            const deletions = prDetails.data.deletions ?? 0;
            return {
              id: String(pr.id),
              number: pr.number,
              title: pr.title ?? "",
              author: pr.user?.login ?? author,
              authorLogin: author,
              createdAt: new Date(pr.created_at),
              mergedAt,
              readyForReviewAt: timeline.firstReadyForReviewAt,
              reviews,
              firstReviewRequestedAt: timeline.firstReviewRequestedAt,
              reviewerRequestedAt: timeline.reviewerRequestedAt,
              reviewCommentsCountByUser,
              additions,
              deletions,
              repoKey,
            } as PullRequestRecord;
          })
        );
        merged.push(...results);
      }

      return merged;
    },
  };
}

async function fetchReviews(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{ login: string; submittedAt: Date; state: string }[]> {
  const out: { login: string; submittedAt: Date; state: string }[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });
    for (const r of data) {
      if (r.user?.login && r.submitted_at)
        out.push({
          login: r.user.login,
          submittedAt: new Date(r.submitted_at),
          state: r.state ?? "COMMENT",
        });
    }
    if (data.length < 100) break;
    page++;
  }

  return out;
}

interface ReviewRequestTimeline {
  firstReviewRequestedAt: Date | null;
  reviewerRequestedAt: Record<string, Date>;
  /** Earliest `ready_for_review` timeline event (draft → ready), if any. */
  firstReadyForReviewAt: Date | null;
}

async function fetchReviewRequestTimeline(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ReviewRequestTimeline> {
  const { data } = await octokit.rest.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });

  let firstReviewRequestedAt: Date | null = null;
  let firstReadyForReviewAt: Date | null = null;
  const reviewerRequestedAt: Record<string, Date> = {};

  for (const event of data) {
    if ("created_at" in event) {
      const createdAt = new Date((event as { created_at: string }).created_at);
      if (event.event === "ready_for_review") {
        if (firstReadyForReviewAt == null || createdAt < firstReadyForReviewAt) {
          firstReadyForReviewAt = createdAt;
        }
      }
    }
    if (event.event !== "review_requested" || !("created_at" in event)) continue;
    const createdAt = new Date((event as { created_at: string }).created_at);
    if (firstReviewRequestedAt == null) firstReviewRequestedAt = createdAt;
    const requested = event as { requested_reviewer?: { login?: string } };
    const login = requested.requested_reviewer?.login;
    if (login && reviewerRequestedAt[login] == null) reviewerRequestedAt[login] = createdAt;
  }

  return { firstReviewRequestedAt, reviewerRequestedAt, firstReadyForReviewAt };
}

async function fetchReviewCommentsCountByUser(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<Record<string, number>> {
  const countByUser: Record<string, number> = {};
  let page = 1;

  while (true) {
    const { data } = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });
    for (const c of data) {
      const login = c.user?.login;
      if (login) countByUser[login] = (countByUser[login] ?? 0) + 1;
    }
    if (data.length < 100) break;
    page++;
  }

  return countByUser;
}
