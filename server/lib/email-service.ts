import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  return null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[EMAIL PREVIEW] To: ${to}`);
    console.log(`[EMAIL PREVIEW] Subject: ${subject}`);
    console.log(`[EMAIL PREVIEW] Body length: ${html.length} chars`);
    console.log(`[EMAIL PREVIEW] ---`);
    return true;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "Legal Tech Careers <noreply@lawjobs.co>",
      to,
      subject,
      html,
    });
    return true;
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
    return false;
  }
}

export function buildEmailTemplate(content: string, unsubscribeUrl?: string): string {
  const footerUnsubscribe = unsubscribeUrl
    ? `<p style="margin:0"><a href="${unsubscribeUrl}" style="color:#8899aa;text-decoration:underline">Unsubscribe from emails</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Legal Tech Careers</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<tr>
<td style="background-color:#1e293b;padding:20px 24px">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">lawjobs.co</span>
<span style="font-size:12px;color:#94a3b8;margin-left:8px">Legal Tech Careers</span>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:28px 24px">
${content}
</td>
</tr>
<tr>
<td style="background-color:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0">
<p style="margin:0 0 4px;font-size:12px;color:#8899aa">You're receiving this because you have an account on lawjobs.co</p>
${footerUnsubscribe}
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildDigestContent(data: {
  greeting: string;
  newJobsCount: number;
  topJobs: { id: number; title: string; company: string; category: string }[];
  pipelineSummary?: string;
  marketPulse?: { totalJobs: number; trendingSkill: string | null };
}): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://lawjobs.co";

  let jobRows = "";
  for (const job of data.topJobs) {
    jobRows += `
<tr>
<td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
<a href="${baseUrl}/jobs/${job.id}" style="font-size:14px;font-weight:600;color:#1e293b;text-decoration:none">${job.title}</a>
<br><span style="font-size:13px;color:#64748b">${job.company}</span>
<span style="font-size:11px;color:#94a3b8;margin-left:8px">${job.category}</span>
</td>
</tr>`;
  }

  let pipelineSection = "";
  if (data.pipelineSummary) {
    pipelineSection = `
<p style="margin:16px 0 8px;font-size:14px;color:#475569">${data.pipelineSummary}</p>`;
  }

  let marketSection = "";
  if (data.marketPulse) {
    const parts = [`${data.marketPulse.totalJobs} active roles`];
    if (data.marketPulse.trendingSkill) parts.push(`trending skill: ${data.marketPulse.trendingSkill}`);
    marketSection = `
<p style="margin:12px 0;font-size:13px;color:#64748b">Market pulse: ${parts.join(" · ")}</p>`;
  }

  return `
<p style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:600">${data.greeting}</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569">
${data.newJobsCount > 0
    ? `${data.newJobsCount} new role${data.newJobsCount !== 1 ? "s" : ""} matched your profile this week.`
    : "The market was quiet this week — no new matches in your categories."}
</p>
${data.topJobs.length > 0 ? `
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b">Top picks for you</p>
<table width="100%" cellpadding="0" cellspacing="0">${jobRows}</table>
` : ""}
${pipelineSection}
${marketSection}
<p style="margin:24px 0 0">
<a href="${baseUrl}/jobs?sort=newest" style="display:inline-block;padding:10px 20px;background-color:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px">See all new jobs</a>
</p>`;
}

export function buildAlertEmailContent(jobMatches: { id: number; title: string; company: string; location?: string | null }[]): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://lawjobs.co";

  let rows = "";
  for (const job of jobMatches) {
    const loc = job.location ? ` · ${job.location}` : "";
    rows += `
<tr>
<td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
<a href="${baseUrl}/jobs/${job.id}" style="font-size:14px;font-weight:600;color:#1e293b;text-decoration:none">${job.title}</a>
<br><span style="font-size:13px;color:#64748b">${job.company}${loc}</span>
</td>
</tr>`;
  }

  return `
<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e293b">New job alert matches</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569">
${jobMatches.length} new role${jobMatches.length !== 1 ? "s" : ""} matched your alerts.
</p>
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<p style="margin:24px 0 0">
<a href="${baseUrl}/jobs?sort=newest" style="display:inline-block;padding:10px 20px;background-color:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px">View all matches</a>
</p>`;
}
