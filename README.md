# World News AI Agent

Runs automatically every morning at **7:00 AM EST/EDT** (auto-adjusts for
daylight saving) via GitHub Actions. It pulls fresh headlines from five
major international news sources, asks Claude to pick the **top 10** most
significant world stories -- **excluding anything primarily about
Bangladesh or Canada**, since those already have their own dedicated
digests -- and write a tight 2-3 sentence summary for each in English (with
a "Read more" link back to the original article), then emails the digest to
**ai.token.mahabub@gmail.com**.

This is the third sibling project alongside the
[Bangladesh News AI Agent](../bangladesh-news-ai-agent) and the
[Canadian News AI Agent](../canadian-news-ai-agent) -- same architecture,
same setup process, different sources/scope.

## How it works

```
src/fetchNews.js   -> pulls & merges RSS feeds (BBC World News, Al Jazeera,
                       The Guardian World, NPR World, Google News World),
                       dedupes, sorts by date
src/summarize.js   -> sends candidates to Claude (Anthropic API), which picks
                       the top 10 -- explicitly excluding Bangladesh/Canada
                       stories -- and returns 2-3 sentence summaries by index
src/sendEmail.js   -> renders an HTML email and sends it via Gmail SMTP
src/index.js        -> orchestrates the three steps above
.github/workflows/daily-digest.yml -> cron job that runs it every morning
```

**How the Bangladesh/Canada exclusion works:** rather than filtering feeds
(which would also exclude legitimate international stories that happen to
mention Bangladesh or Canada in passing), the instruction lives in the
summarization prompt: Claude is told these two countries already have
dedicated daily digests and to skip any candidate primarily about them,
picking the next-best genuinely international story instead. This is more
reliable than keyword-filtering the RSS feed text, which would risk
false-positives (e.g. a story about a G7 summit that happens to mention
Canada as one of several members).

**Note on the summarizer:** Claude references each pick by candidate index
rather than retyping the title/link, to avoid the response getting cut off
mid-JSON on long aggregator URLs (a real failure mode hit and fixed during
testing of the Bangladesh agent).

## How the 7:00 AM EST/EDT schedule works

Same auto-switching approach as the other two agents: the workflow fires at
**both** `11:00 UTC` and `12:00 UTC` daily, and a "Check local time" step
computes the actual hour in `America/New_York`, skipping every step except
on the trigger that actually corresponds to 7:00 AM local time. No manual
adjustment needed across the DST switch. Manually running it from the
**Actions** tab always runs regardless of the time check.

## One-time setup

### 1. Create the GitHub repo and push the code

Create an empty repo named `world-news-ai-agent` under
[github.com/mahabub2016](https://github.com/mahabub2016) (don't initialize
it with a README), then on the empty repo's page click **"uploading an
existing file"** and drag in everything from this folder -- including the
hidden `.github` folder.

If any files land in the wrong place, `Add file -> Create new file` lets
you type a full path like `src/fetchNews.js` directly into the filename
box (GitHub auto-creates folders as you type each `/`), then paste the
content and commit.

### 2. Reuse your existing Anthropic API key and Gmail App Password

Both are already set up from the Bangladesh/Canadian agents and aren't tied
to a specific repo -- you just need to add them as secrets in this new repo
too (step 3).

### 3. Add repository secrets

In this repo: **Settings -> Secrets and variables -> Actions -> New
repository secret**. Add:

| Secret name           | Value                                              |
|------------------------|-----------------------------------------------------|
| `ANTHROPIC_API_KEY`    | Your Anthropic API key                              |
| `GMAIL_USER`           | The Gmail address that will send the email          |
| `GMAIL_APP_PASSWORD`   | The 16-character app password                       |
| `DIGEST_RECIPIENT`     | `ai.token.mahabub@gmail.com` (optional -- already the default) |

### 4. Test it before trusting tomorrow's run

**Actions** tab -> **World News Daily Digest** -> **Run workflow** dropdown
-> green **Run workflow** button. This bypasses the time check and runs
immediately.

## Running it locally (optional)

```bash
npm install
cp .env.example .env   # then fill in your real keys in .env
npm start
```

## Customizing

- **Change the schedule:** edit the `cron` lines and/or the target hour
  (`"07"`) in the "Check local time" step of
  `.github/workflows/daily-digest.yml`.
- **Add/remove news sources:** edit the `FEEDS` array in `src/fetchNews.js`.
- **Change story count, tone, or the exclusion list:** edit the prompt in
  `src/summarize.js`.
- **Change recipient:** update the `DIGEST_RECIPIENT` secret, or edit the
  default in `src/sendEmail.js`.
