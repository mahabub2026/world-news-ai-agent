// src/sendEmail.js
// Builds and sends the daily digest email via Gmail SMTP (using an app
// password, not the real Gmail password).

const nodemailer = require("nodemailer");

const RECIPIENT = process.env.DIGEST_RECIPIENT || "ai.token.mahabub@gmail.com";

function formatDateForSubject() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(stories, dateStr) {
  const rows = stories
    .map((s, i) => {
      const title = escapeHtml(s.title || "Untitled");
      const summary = escapeHtml(s.summary || "");
      const source = escapeHtml(s.source || "");
      const link = s.link || "#";
      return `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #e5e5e5;">
            <div style="font-size:12px;letter-spacing:.04em;color:#1a5cb0;font-weight:600;text-transform:uppercase;margin-bottom:4px;">
              ${i + 1}. ${source}
            </div>
            <div style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:6px;line-height:1.3;">
              ${title}
            </div>
            <div style="font-size:14px;color:#3d3d3d;line-height:1.55;margin-bottom:8px;">
              ${summary}
            </div>
            <a href="${link}" style="font-size:13px;color:#1a5cb0;text-decoration:none;font-weight:600;">
              Read more &rarr;
            </a>
          </td>
        </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#1a5cb0;padding:24px 28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;">🌍 World News Digest</div>
                <div style="color:#d6e6fb;font-size:13px;margin-top:4px;">${dateStr}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 4px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px;font-size:11px;color:#999;">
                Generated automatically every morning by your World News AI Agent (Claude + GitHub Actions). Bangladesh and Canadian news are intentionally excluded here -- see your separate daily digests for those. Summaries are AI-generated from public RSS headlines and may not capture every nuance -- follow the links for full stories.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildPlainText(stories, dateStr) {
  const lines = stories.map((s, i) => {
    return `${i + 1}. ${s.title} (${s.source})\n${s.summary}\nRead more: ${s.link}\n`;
  });
  return `World News Digest -- ${dateStr}\n\n${lines.join("\n")}`;
}

async function sendDigestEmail(stories) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variable / secret.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const dateStr = formatDateForSubject();

  await transporter.sendMail({
    from: `"World News AI Agent" <${user}>`,
    to: RECIPIENT,
    subject: `🌍 World News Digest -- ${dateStr}`,
    text: buildPlainText(stories, dateStr),
    html: buildHtml(stories, dateStr),
  });
}

module.exports = { sendDigestEmail };
