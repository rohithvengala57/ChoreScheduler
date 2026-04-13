import nodemailer from "nodemailer";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function createTransport() {
  // Production: use SMTP env vars
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Development fallback: log to console (no actual email)
  return null;
}

export async function sendInviteEmail(to: string, token: string, householdName: string) {
  const link = `${BASE_URL}/join?token=${token}`;
  const html = `
    <h2>You've been invited to join <strong>${householdName}</strong> on Chore Scheduler!</h2>
    <p>Click the link below to accept your invitation and create your account:</p>
    <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
    <p>Or copy this link: ${link}</p>
    <p>This invite link is single-use. If you did not expect this email, you can ignore it.</p>
  `;

  const transport = createTransport();
  if (!transport) {
    // Dev mode — just print the link so it can be used manually
    console.info(`\n📧 INVITE EMAIL (dev — not sent)\n  To: ${to}\n  Link: ${link}\n`);
    return { link };
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || "noreply@chorescheduler.app",
    to,
    subject: `You're invited to join ${householdName} on Chore Scheduler`,
    html,
  });
  return { link };
}
