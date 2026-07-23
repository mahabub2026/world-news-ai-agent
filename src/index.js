// src/index.js
// Entry point: fetch -> summarize (Claude) -> email.
// Run locally with `npm start` (after setting up .env), or automatically
// every morning via the GitHub Actions workflow in .github/workflows/.

require("dotenv").config();

const { fetchAllNews } = require("./fetchNews");
const { summarizeTopStories } = require("./summarize");
const { sendDigestEmail } = require("./sendEmail");

async function main() {
  console.log("[1/3] Fetching world news from RSS feeds...");
  const candidates = await fetchAllNews(50);
  console.log(`      Collected ${candidates.length} candidate headlines.`);

  console.log("[2/3] Asking Claude to pick and summarize the top 10 stories (excluding Bangladesh/Canada)...");
  const stories = await summarizeTopStories(candidates);
  console.log(`      Got ${stories.length} summarized stories.`);

  console.log("[3/3] Sending digest email...");
  await sendDigestEmail(stories);
  console.log("      Email sent successfully.");

  console.log("Done.");
}

main().catch((err) => {
  console.error("World News AI Agent failed:", err);
  process.exit(1);
});
