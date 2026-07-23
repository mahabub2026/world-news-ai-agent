// src/fetchNews.js
// Fetches recent headlines from a curated list of major international news
// RSS feeds. Every feed is fetched independently and wrapped in a try/catch
// so a single dead/blocked feed never crashes the whole run.
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

async function fetchFeed(feed) {
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
    console.warn(`[fetchNews] Skipping "${feed.name}" (${feed.url}): ${err.message}`);
    return [];
  }
}

async function fetchAllNews(limit = 50) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const allItems = results.flat();

  if (allItems.length === 0) {
    throw new Error(
      "No news items were fetched from any source. All RSS feeds failed or returned empty."
    );
  }

  // Dedupe: different feeds sometimes carry the same wire story with a
  // near-identical title. Normalize and drop repeats, keeping the first seen.
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

  return deduped.slice(0, limit);
}

module.exports = { fetchAllNews, FEEDS };
