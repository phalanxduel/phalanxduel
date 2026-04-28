import { ServerClient } from 'postmark';

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'support@phalanxduel.com';

const client = POSTMARK_SERVER_TOKEN ? new ServerClient(POSTMARK_SERVER_TOKEN) : null;

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const uiBaseUrl = process.env.UI_BASE_URL || 'http://localhost:5173';
  const resetLink = `${uiBaseUrl}/reset-password?token=${resetToken}`;

  if (!client) {
    console.warn(
      `[Mailer] POSTMARK_SERVER_TOKEN not set. Skipped sending password reset to ${email}. Link: ${resetLink}`,
    );
    return;
  }

  try {
    await client.sendEmail({
      From: FROM_EMAIL,
      To: email,
      Subject: 'Phalanx Duel - Password Reset',
      HtmlBody: `
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your Phalanx Duel account.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request a password reset, please ignore this email or contact support.</p>
      `,
      TextBody: `You recently requested to reset your password for your Phalanx Duel account.\n\nGo to this link to reset your password: ${resetLink}\n\nIf you did not request a password reset, please ignore this email.`,
    });
    console.info(`[Mailer] Password reset email sent successfully to ${email}`);
  } catch (err) {
    console.error(`[Mailer] Failed to send password reset email to ${email}`, err);
    throw new Error('Failed to send email', { cause: err });
  }
}
