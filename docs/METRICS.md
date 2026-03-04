# How to read PR metrics

This guide explains what each metric means and how to interpret the numbers.

---

## Summary metrics (repo or “All repos”)

These apply to the selected repo or to all repos combined.

### Total PRs merged

**What it is:** Count of pull requests that were merged in the time window (or all time if no `sinceDays`).

**How to read it:** Raw throughput. Use it to compare activity across repos or time periods, or to sanity-check that the data range is what you expect.

---

### Wait time to first review

**What it is:** Median time from when a PR was opened until someone submitted the first review (comment, approval, or request changes).

**How to read it:**
- **Lower** = PRs get a first look sooner. Good for unblocking authors and keeping PRs from going stale.
- **Higher** = PRs sit longer before anyone reviews. Can mean review capacity is tight, PRs are not prioritized, or reviewers are overloaded.

Use this to spot bottlenecks: if the number is high, focus on review capacity, triage, or expectations (e.g. “first review within X hours”).

---

### Review response time

**What it is:** Median time from when a review was first requested (e.g. “Review requested” on GitHub) until the first review was submitted. If there was no explicit “review requested” event, it falls back to “PR open → first review.”

**How to read it:**
- **Lower** = Requested reviewers respond quickly.
- **Higher** = There’s delay between asking for review and getting it. Can indicate overload, unclear ownership, or that people aren’t checking review requests.

Use it together with “Wait time to first review”: if both are high, the main issue is time-to-first-review; if only response time is high, the issue may be how quickly requested reviewers react.

---

### Review cycles until merge (repo-level)

**What it is:** Average number of review *submissions* (each comment, approval, or “request changes” counts as one) on merged PRs.

**How to read it:**
- **Low (e.g. 1–2)** = Most PRs get a small number of review actions before merge (e.g. one round of review and approve).
- **Higher** = More back-and-forth: more comments, re-requests, or multiple reviewers. Can mean thorough review, or that PRs need many iterations.

There’s no single “right” value—it depends on your process. Use it to see how much review activity your merged PRs typically get and to notice trends (e.g. cycles creeping up might mean more rework or stricter review).

---

## Per-engineer table

Each row is one person. Metrics are computed from PRs in the selected repo(s).

### User

GitHub (or provider) login of the person. Anyone who either authored at least one merged PR or submitted at least one review in the window appears in the table.

---

### PRs merged

**What it is:** Number of merged PRs where this person is the **author**.

**How to read it:** Output as an author. High relative to the team can mean they’re shipping a lot; low can mean they’re focused elsewhere (e.g. more reviewing, different kind of work, or part-time). Use in context of team size and role.

---

### PRs reviewed

**What it is:** Number of **distinct** PRs on which this person submitted at least one review (comment, approval, or request changes).

**How to read it:** Review load and participation. Compare across the team to see who’s doing more review work. Very low might mean they’re not in the review rotation or are focused on other work.

---

### Response time to review requests (median)

**What it is:** For each PR this person reviewed, we take “when they were requested to review” (or PR open if unknown) and “when they submitted their first review.” The metric is the **median** of those response times for this person.

**How to read it:**
- **Lower** = They tend to respond quickly when asked to review.
- **Higher** = Longer delay before they start reviewing. Can be context (complex PRs, other priorities) or capacity.

Use it to see who’s fast to pick up review requests and to spot people who might need support or different expectations.

---

### Time waiting on reviews (median)

**What it is:** For each merged PR this person **authored**, we take “time from first review submitted to merge.” The metric is the **median** of those for this person.

**How to read it:** How long *their* PRs sit after the first review before being merged. Low = quick from first review to merge (few rounds or fast approvals). High = more rounds, rework, or delay after the first review. Complements “Wait time to first review” (which is open → first review).

---

### Wait time to first review (median)

**What it is:** For each merged PR this person **authored**, time from PR open to the first review submitted. The metric is the **median** for this person.

**How to read it:** How long *their* PRs wait for a first look. Low = their PRs get attention quickly. High = their PRs sit longer before anyone reviews; might be timing, size of PR, or review capacity.

---

### Review cycles (authored) (avg)

**What it is:** For PRs this person **authored** and merged: the **average** number of review submissions (by anyone) on those PRs. So: *average number of review actions on their merged PRs*.

**How to read it:**
- **Lower** = Their PRs tend to get fewer review actions before merge (e.g. one approve and go).
- **Higher** = More comments, re-requests, or iterations. Can mean thorough review, or that their PRs often need rework.

Use it to see how much review feedback each author typically gets, not to judge “good/bad” in isolation—some teams want more cycles.

---

### Review cycles (as reviewer) (avg)

**What it is:** For each PR this person **reviewed**: count how many review submissions they made (e.g. one comment + one approve = 2). The metric is the **average** of those counts across the PRs they reviewed. So: *average number of review actions they do per PR they review*.

**How to read it:**
- **~1** = They usually submit one review per PR (e.g. single approve or single “request changes”).
- **Higher** = They often do multiple passes (e.g. comment, then approve after changes). Can mean thoroughness or that PRs need several rounds.

Use it to see review style (single shot vs. multiple interactions per PR).

---

### Comments left while reviewing (avg per PR)

**What it is:** For each PR this person **reviewed**, we count comments they left (review submissions + inline comments). The metric is the **average** of those counts. So: *average number of comments they leave per PR they review*.

**How to read it:** Average depth of feedback they give as a reviewer. Higher = they tend to write more comments per PR. Use with “PRs reviewed” to see depth (e.g. many comments on few PRs vs. few comments on many PRs).

---

### Comments received while reviewing (avg per PR)

**What it is:** For each PR this person **authored**, we count comments they received from others (review submissions + inline comments). The metric is the **average** of those counts. So: *average number of comments they get per PR they authored*.

**How to read it:** Average amount of feedback their PRs get. Higher = their PRs tend to get more review activity from others. Use with “PRs merged” to see how comment-heavy their PRs tend to be (e.g. lots of back-and-forth vs. quick approvals).

---

### Lines added / Lines deleted

**What it is:** **Total** lines added and **total** lines deleted across all merged PRs this person **authored**. Comes from the provider’s diff stats (e.g. GitHub’s PR `additions` and `deletions`).

**How to read it:** Volume of code change they’ve merged. Use with “PRs merged” to compare scale (e.g. many small PRs vs. fewer large ones). Not a quality metric—depends on type of work and style.

---

## Putting it together

- **Throughput:** Total PRs merged, PRs merged per engineer, PRs reviewed per engineer.
- **Code volume:** Lines added, Lines deleted (totals for PRs they authored).
- **Speed:** Wait time to first review, Review response time, Time waiting on reviews (per author).
- **Review depth / back-and-forth:** Review cycles (repo), Review cycles (authored), Review cycles (as reviewer)—all average per PR where applicable.
- **Comment volume (avg per PR):** Comments left while reviewing, Comments received while reviewing.

Use the repo dropdown to compare repos or look at “All repos” for a team view. For individuals, the per-engineer table separates *author* metrics (their PRs) from *reviewer* metrics (PRs they reviewed), so you can see both sides of their contribution.
