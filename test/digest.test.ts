import { test } from "node:test";
import assert from "node:assert/strict";

import { dayKey, rankLabel, buildDigest } from "../src/digest.js";
import type { Story } from "../src/hn.js";

function story(over: Partial<Story> & { id: number }): Story {
  return {
    type: "story",
    title: "T",
    url: "https://example.com",
    by: "pg",
    score: 100,
    descendants: 10,
    time: 0,
    ...over,
  };
}

test("dayKey formats zero-padded dates", () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(dayKey(new Date(2026, 10, 3)), "2026-11-03");
});

test("rankLabel awards medals, then numbers", () => {
  assert.equal(rankLabel(0), "🥇");
  assert.equal(rankLabel(1), "🥈");
  assert.equal(rankLabel(2), "🥉");
  assert.equal(rankLabel(9), "#10");
});

test("buildDigest includes ranked stories with links", () => {
  const digest = buildDigest(
    [
      story({ id: 1, title: "First", score: 500 }),
      story({ id: 2, title: "Second", score: 250, url: undefined }),
    ],
    new Date(2026, 1, 20),
  );
  assert.match(digest, /Hacker News Daily Digest — 2026-02-20/);
  assert.match(digest, /1\. \*\*First\*\*/);
  assert.match(digest, /500 pts · \d+ comments/);
  assert.match(digest, /news\.ycombinator\.com\/item\?id=2/);
  assert.match(digest, /🥇/);
});