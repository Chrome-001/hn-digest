import { readFile, writeFile, readdir } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Octokit } from "@octokit/rest";

import { fetchTopStories } from "./hn.js";
import { buildDigest, dayKey } from "./digest.js";

interface Config {
  apiBase: string;
  topLimit: number;
  minScore: number;
  outputDir: string;
  ghOwner: string;
  ghRepo: string;
  ghToken: string;
  gitEmail: string;
  gitName: string;
}

function parseConfig(env: NodeJS.ProcessEnv): Config {
  return {
    apiBase: env.HN_API_BASE ?? "https://hacker-news.firebaseio.com/v0",
    topLimit: Number(env.HN_TOP_LIMIT ?? 30),
    minScore: Number(env.HN_MIN_SCORE ?? 50),
    outputDir: env.OUTPUT_DIR ?? "digest",
    ghOwner: env.GH_OWNER ?? "",
    ghRepo: env.GH_REPO ?? "",
    ghToken: env.GH_TOKEN ?? "",
    gitEmail: env.GIT_EMAIL ?? "hn-digest[bot]@users.noreply.github.com",
    gitName: env.GIT_NAME ?? "hn-digest[bot]",
  };
}

async function currentDigestFiles(cfg: Config): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  try {
    const entries = await readdir(cfg.outputDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith(".md")) {
        files[path.join(cfg.outputDir, e.name)] = await readFile(
          path.join(cfg.outputDir, e.name),
          "utf8",
        );
      }
    }
  } catch {
    /* first run — nothing published yet */
  }
  return files;
}

async function main() {
  const cfg = parseConfig(process.env);
  const today = new Date();
  const key = dayKey(today);

  const stories = await fetchTopStories({
    apiBase: cfg.apiBase,
    topLimit: cfg.topLimit,
    minScore: cfg.minScore,
  });
  if (stories.length === 0) {
    throw new Error("no stories above the score threshold");
  }

  const digest = buildDigest(stories, today);
  await mkdir(cfg.outputDir, { recursive: true });
  const fileName = path.join(cfg.outputDir, `${key}.md`);
  await writeFile(fileName, digest);
  await writeFile("latest.md", digest);

  console.log(
    `wrote ${fileName} (${stories.length} stories, top: ${stories[0].title})`,
  );

  if (cfg.ghToken && cfg.ghOwner && cfg.ghRepo) {
    const octokit = new Octokit({ auth: cfg.ghToken });
    const files = await currentDigestFiles(cfg);
    files["latest.md"] = digest;
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: cfg.ghOwner,
      repo: cfg.ghRepo,
      path: fileName,
      message: `digest: ${key}`,
      content: Buffer.from(digest, "utf8").toString("base64"),
      branch: "main",
      committer: { name: cfg.gitName, email: cfg.gitEmail },
      author: { name: cfg.gitName, email: cfg.gitEmail },
    });
    console.log(`published ${data.commit?.sha ?? "?"} to ${cfg.ghOwner}/${cfg.ghRepo}`);
  } else {
    console.log(
      "GH_* not configured — digest written locally only. " +
        "Set GH_TOKEN/GH_OWNER/GH_REPO to auto-publish.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});