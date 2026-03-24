# git-pr-metrics

Pluggable Pull Request metrics for your team’s repos. Tracks:

1. **Total Pull requests merged**
2. **Review response time** — time from first “review requested” to first review (median)
3. **Wait time to first review** — time from PR open to first review (median)
4. **Review cycles** — per repo: average review submissions per merged PR; per engineer: **Review cycles (authored)** = average submissions on PRs they merged, **Review cycles (as reviewer)** = average submissions they made per PR they reviewed
5. **Pull requests merged per engineer**
6. **Number of PRs reviewed per engineer**
7. **Comments left while reviewing** (per engineer: average per PR they reviewed)
8. **Comments received while reviewing** (per engineer: average per PR they authored)
9. **Lines added / Lines deleted** (per engineer: total across PRs they authored)

Repos are **pluggable**: add or remove entries in config; each repo can use a supported provider (e.g. GitHub).

**[How to read these metrics](docs/METRICS.md)** — definitions, how each metric is calculated, and how to interpret the numbers.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure repos**

   Copy the example config and add your team’s repositories:

   ```bash
   cp config/repos.example.yaml config/repos.yaml
   ```

   Edit `config/repos.yaml`:

   ```yaml
   repos:
     - provider: github
       owner: your-org
       repo: your-repo
     - provider: github
       owner: your-org
       repo: another-repo

   # Optional: only PRs merged in the last N days
   sinceDays: 90

   # Optional: cap merged PRs per repo (reduces API calls and load time)
   # maxMergedPrsPerRepo: 100
   ```

3. **GitHub token** (optional)

   **Public repos** work without a token (subject to GitHub’s unauthenticated rate limit).

   For **private repos** or higher rate limits, create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope, then:

   ```bash
   cp .env.example .env
   # Edit .env and set GITHUB_TOKEN=ghp_...
   ```

## Usage

**CLI (JSON output)**

```bash
npm run build
npm run metrics
```

Or with a custom config path:

```bash
node dist/cli.js /path/to/repos.yaml
```

**Web dashboard**

```bash
npm run build
npm run dashboard
```

Open [http://localhost:3000](http://localhost:3000). The dashboard shows aggregated metrics and line charts for **PRs merged per month**, **median days ready-for-review → merge**, and **average review cycles until merge** (UTC merge months), plus per-repo breakdown.

**Hot reload (development)**

```bash
npm run dev
```

Runs the dashboard with hot reloading: watches `src/` and `public/`, rebuilds and restarts the server on change, and reloads the browser. Open the app at [http://localhost:3001](http://localhost:3001) (Browser-Sync proxy).

## Performance

- **Concurrent fetches:** The GitHub provider fetches details for several PRs in parallel (default 6 at a time), which speeds up the first load.
- **Cache:** The dashboard caches metrics in memory for 5 minutes. Reloading the page or switching repos uses the cache; call `/api/metrics?refresh=1` to force a fresh fetch.
- **Cap PRs per repo:** Set `maxMergedPrsPerRepo: 100` (or another number) in `repos.yaml` to limit how many merged PRs are fetched per repo. This reduces API calls and load time for large repos.

## Troubleshooting

**"Repo not found or no access" (404)**  
GitHub returns 404 when the repo doesn’t exist or your token can’t access it. Check:

- **Owner and repo** in `repos.yaml` (e.g. `owner: my-org`, `repo: my-repo` — no leading slash or `github.com`).
- **Private repos:** set `GITHUB_TOKEN` in `.env` with **repo** scope.
- **Org repos:** the token user must have access to the org/repo.
- Token not expired or revoked.

## Adding more repos

Edit `config/repos.yaml` and add more entries under `repos`. Only providers you have configured (e.g. `GITHUB_TOKEN` for `github`) will be used; others are skipped with a warning.

## Adding a new provider (e.g. GitLab)

1. Implement `PRMetricsProvider` in `src/providers/` (see `src/providers/types.ts` and `src/providers/github.ts`).
2. Register it in `src/providers/index.ts` (e.g. when an env var like `GITLAB_TOKEN` is set).
3. Use `provider: gitlab` (or your name) in `repos.yaml` with the fields your provider expects (e.g. `owner`/`repo` or `projectId`).

## License

GPL-3.0-or-later (see [LICENSE](LICENSE)).
