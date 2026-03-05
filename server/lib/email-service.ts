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
  isPro?: boolean;
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

  let proInsightsSection = "";
  if (data.isPro) {
    proInsightsSection = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
<tr><td style="background-color:#f0f4ff;padding:14px 16px">
<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e293b">Your Pro Insights</p>
<p style="margin:0;font-size:13px;color:#475569">Salary trends, skills demand, and employer benchmarks updated this week.</p>
<p style="margin:10px 0 0"><a href="${baseUrl}/market-intelligence" style="font-size:13px;font-weight:600;color:#3b82f6;text-decoration:none">View Market Intelligence &rarr;</a></p>
</td></tr>
</table>`;
  }

  let proUpsellSection = "";
  if (!data.isPro) {
    proUpsellSection = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:20px">
<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#ffffff">Get more from your career search</p>
<p style="margin:0 0 14px;font-size:13px;color:#cbd5e1;line-height:1.5">Unlock salary insights, custom job alerts, full career diagnostics, and unlimited searches with Pro.</p>
<a href="${baseUrl}/pricing" style="display:inline-block;padding:9px 18px;background-color:#3b82f6;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:5px">Upgrade to Pro</a>
</td></tr>
</table>`;
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
${proInsightsSection}
${proUpsellSection}
<p style="margin:24px 0 0">
<a href="${baseUrl}/jobs?sort=newest" style="display:inline-block;padding:10px 20px;background-color:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px">See all new jobs</a>
</p>`;
}

export function buildProUpgradeEmailContent(firstName: string): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://lawjobs.co";

  return `
<p style="margin:0 0 16px;font-size:20px;color:#1e293b;font-weight:700">Congratulations, ${firstName}!</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569">
Your Pro membership is now active. You've unlocked the full power of Legal Tech Careers.
</p>
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b">Here's what's now available to you:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">
<span style="color:#1e293b;font-weight:600">Unlimited searches</span> — no caps on job browsing or filtering
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">
<span style="color:#1e293b;font-weight:600">Job alerts</span> — get notified instantly when new roles match your criteria
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">
<span style="color:#1e293b;font-weight:600">Salary data</span> — see compensation ranges across legal tech roles
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">
<span style="color:#1e293b;font-weight:600">Full diagnostic reports</span> — comprehensive career readiness analysis
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569">
<span style="color:#1e293b;font-weight:600">Market intelligence</span> — trends, hiring signals, and opportunity insights
</td>
</tr>
</table>
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b">Get started:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
<tr>
<td style="padding:4px 0">
<a href="${baseUrl}/alerts" style="display:inline-block;padding:10px 20px;background-color:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px">Set Up Job Alerts</a>
</td>
</tr>
<tr>
<td style="padding:4px 0">
<a href="${baseUrl}/market-intelligence" style="display:inline-block;padding:10px 20px;background-color:#ffffff;color:#1e293b;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;border:1px solid #cbd5e1">View Market Intelligence</a>
</td>
</tr>
<tr>
<td style="padding:4px 0">
<a href="${baseUrl}/diagnostic" style="display:inline-block;padding:10px 20px;background-color:#ffffff;color:#1e293b;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;border:1px solid #cbd5e1">Run Full Diagnostic</a>
</td>
</tr>
</table>
<p style="margin:16px 0 0;font-size:13px;color:#64748b">
Thank you for supporting Legal Tech Careers. We're committed to helping you find the perfect role.
</p>`;
}

export function buildWelcomeEmailContent(firstName: string | null): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://lawjobs.co";

  const greeting = firstName ? `Hi ${firstName},` : "Welcome,";

  return `
<p style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:600">${greeting}</p>
<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6">
Welcome to Legal Tech Careers &mdash; your career command center for legal tech. We curate the best roles at the intersection of law and technology so you can find your next opportunity faster.
</p>

<p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e293b">Get started in 3 steps:</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background-color:#1e293b;color:#ffffff;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;line-height:32px">1</td>
<td style="padding-left:12px">
<a href="${baseUrl}/diagnostic" style="font-size:14px;font-weight:600;color:#1e293b;text-decoration:none">Run Career Diagnostic</a>
<br><span style="font-size:13px;color:#64748b">Get a personalized career readiness report</span>
</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background-color:#1e293b;color:#ffffff;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;line-height:32px">2</td>
<td style="padding-left:12px">
<a href="${baseUrl}/jobs" style="font-size:14px;font-weight:600;color:#1e293b;text-decoration:none">Browse Jobs</a>
<br><span style="font-size:13px;color:#64748b">Explore curated legal tech roles</span>
</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:12px 0">
<table cellpadding="0" cellspacing="0"><tr>
<td style="width:32px;height:32px;background-color:#1e293b;color:#ffffff;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;line-height:32px">3</td>
<td style="padding-left:12px">
<a href="${baseUrl}/resumes" style="font-size:14px;font-weight:600;color:#1e293b;text-decoration:none">Upload Resume</a>
<br><span style="font-size:13px;color:#64748b">Get matched to jobs that fit your background</span>
</td>
</tr></table>
</td>
</tr>
</table>

<p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5">
We'll send you a weekly digest of roles matching your interests. You can adjust your email preferences anytime from your account settings.
</p>

<p style="margin:24px 0 0">
<a href="${baseUrl}/jobs" style="display:inline-block;padding:10px 20px;background-color:#1e293b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px">Start Exploring</a>
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
