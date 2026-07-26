// src/fetchNews.js
// Fetches recent headlines from a curated list of major international news
// RSS feeds. Feeds are fetched SEQUENTIALLY with a short delay and a
// retry-with-backoff between requests -- firing several requests at the
// same host at once was observed (on the sibling Bangladesh agent, same
// code pattern) to trigger transient 503s from Google News' own rate
// limiting, so this spreads the load out instead of hammering any one host.
//
// Note: this agent intentionally excludes Bangladesh- and Canada-focused
// national outlets, since those are already covered by the sibling
// bangladesh-news-ai-agent and canadian-news-ai-agent projects. Filtering
// out Bangladesh/Canada-specific stories from these globally-focused wire
// sources happens in the summarization prompt (src/summarize.js).

const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; WorldNewsAgent/1.0; +https://github.com/mahabub2016)",
  },
});

const FEEDS = [
  { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" },
  { name: "Google News - World", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en" },
];

const DELAY_BETWEEN_FEEDS_MS = 1500;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFeedWithRetry(feed) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items || []).map((item) => ({
        title: (item.title || "").trim(),
        link: item.link || "",
        pubDate: item.pubDate ? new Date(item.pubDate) : null,
        snippet: (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim(),
        source: feed.name,
      }));
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[fetchNews] "${feed.name}" failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message} -- retrying in ${backoff}ms`
        );
        await sleep(backoff);
      }
    }
  }
  console.warn(`[fetchNews] Giving up on "${feed.name}" (${feed.url}) after ${MAX_RETRIES + 1} attempts: ${lastErr.message}`);
  return [];
}

async function fetchAllNews(limit = 50) {
  const allItems = [];
  for (let i = 0; i < FEEDS.length; i++) {
    const items = await fetchFeedWithRetry(FEEDS[i]);
    allItems.push(...items);
    if (i < FEEDS.length - 1) {
      await sleep(DELAY_BETWEEN_FEEDS_MS);
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    if (!item.title) continue;
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  deduped.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

  const result = deduped.slice(0, limit);

  const MIN_CANDIDATES = 5;
  if (result.length < MIN_CANDIDATES) {
    throw new Error(
      `Only ${result.length} candidate headline(s) were collected (need at least ${MIN_CANDIDATES}). ` +
        `This usually means most/all RSS feeds failed or were rate-limited this run -- see the [fetchNews] warnings above for details. Aborting rather than sending a near-empty digest.`
    );
  }

  return result;
}

module.exports = { fetchAllNews, FEEDS };
