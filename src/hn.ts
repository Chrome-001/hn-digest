export interface Story {
  id: number;
  type: string;
  title: string;
  url?: string;
  text?: string;
  by: string;
  score: number;
  descendants: number;
  time: number;
}

export interface FetchOptions {
  apiBase: string;
  topLimit: number;
  minScore: number;
  concurrency?: number;
}

export async function fetchTopStoryIds(apiBase: string): Promise<number[]> {
  const res = await fetch(`${apiBase}/topstories.json`);
  if (!res.ok) {
    throw new Error(`HN /topstories.json responded ${res.status}`);
  }
  return res.json() as Promise<number[]>;
}

export async function fetchItem(apiBase: string, id: number): Promise<Story> {
  const res = await fetch(`${apiBase}/item/${id}.json`);
  if (!res.ok) {
    throw new Error(`HN /item/${id}.json responded ${res.status}`);
  }
  return res.json() as Promise<Story>;
}

async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx]);
    }
  };
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}

export async function fetchTopStories(opts: FetchOptions): Promise<Story[]> {
  const ids = await fetchTopStoryIds(opts.apiBase);
  const stories = await pool(
    ids.slice(0, opts.topLimit),
    opts.concurrency ?? 8,
    (id) => fetchItem(opts.apiBase, id),
  );
  return stories
    .filter((s) => s?.type === "story" && typeof s.title === "string")
    .filter((s) => s.score >= opts.minScore)
    .sort((a, b) => b.score - a.score);
}