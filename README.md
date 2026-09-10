# Hacker News daily digest, on a cron.

Fetches the top stories from the official Hacker News API, ranks them by points,
turns them into a clean markdown report, and — when configured — auto-commits and
pushes the report to a GitHub repo (like this one) every day.

```
hn-digest/
├── src/
│   ├── index.ts            # orchestration: config, fetch, write, publish
│   ├── hn.ts               # HN API client (paged fetch, bounded concurrency)
│   └── digest.ts           # markdown rendering
├── test/digest.test.ts     # node:test unit tests
├── .github/workflows/digest.yml   # daily 07:00 UTC schedule
└── latest.md               # auto-updated (sample)
```

## What it does (per run)

1. Hits `https://hacker-news.firebaseio.com/v0/topstories.json`.
2. Fetches the details of the top N stories (concurrency-limited to avoid
   hammering the API endpoint).
3. Drops anything below a score threshold, sorts by **points**, ranks them.
4. Writes `digest/YYYY-MM-DD.md` and refreshes `latest.md`.
5. If `GH_TOKEN`/`GH_OWNER`/`GH_REPO` are set, publishes the files straight to a
   GitHub repo via the REST API — no local git required.

## Quickstart

```bash
npm install

# local-only run (writes ./digest and ./latest.md)
npm run digest

# auto-publish run
export GH_TOKEN=ghp_xxx GH_OWNER=Chrome-001 GH_REPO=hn-digest
npm run digest
```

Tune the output:

```bash
HN_TOP_LIMIT=50       # how many top stories to pull
HN_MIN_SCORE=100      # ignore anything under 100 points
OUTPUT_DIR=reports    # where to write the dated reports
```

## Sample row

```
1. **Show HN: An open-source geospatial engine in Rust** — 🥇 [512 pts · 214 comments]
   (<https://github.com/…> | discuss · by asdfx)
```

## Schedule options

- **GitHub Actions**: the repo ships `daily-digest` at `0 7 * * *` UTC.
- **Local cron**:

  ```
  0 7 * * * cd /srv/hn-digest && GH_TOKEN=… GH_OWNER=… GH_REPO=… /usr/bin/node --run digest
  ```

- Works fine on any runnner/container; only needs outbound HTTPS.

## Notes

- The HN firebase API is unauthenticated (public) with generous rate limits —
  no keys required. GitHub publishing needs a token with `contents: write` on
  the target repo. In Actions, that's the built-in `GITHUB_TOKEN`.
- Concurrency is capped (default 8) so `npm start` respects HN's endpoints.

## Tests

```bash
npm test
npm run typecheck
```

## Support

Enjoying this digest? A coffee keeps the bot checking the front page every day.

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-blue?logo=paypal)](https://paypal.me/chrome001)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/chrome001)