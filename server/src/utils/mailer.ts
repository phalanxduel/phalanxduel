/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { ServerClient } from 'postmark';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<void>;
}

/**
 * Production provider using Postmark.
 */
class PostmarkEmailProvider implements EmailProvider {
  private client: ServerClient;

  constructor() {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (!token) {
      throw new Error('POSTMARK_SERVER_TOKEN is required for PostmarkEmailProvider');
    }
    this.client = new ServerClient(token);
  }

  async send({ to, subject, html, text }: EmailOptions): Promise<void> {
    const from = process.env.MAIL_FROM ?? 'Phalanx Duel <noreply@phalanxduel.com>';
    const replyTo = process.env.SUPPORT_EMAIL ?? 'Phalanx Duel Support <support@phalanxduel.com>';

    await this.client.sendEmail({
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      ReplyTo: replyTo,
      MessageStream: 'outbound',
    });
  }
}

/**
 * Development provider that logs to console instead of sending.
 */
class LogProvider implements EmailProvider {
  async send({ to, subject, text }: EmailOptions): Promise<void> {
    console.info('---------------------------------------');
    console.info('[Mailer] DEV MODE - Email Logged');
    console.info(`[To]:      ${to}`);
    console.info(`[Subject]: ${subject}`);
    console.info(`[Body]:    ${text}`);
    console.info('---------------------------------------');
  }
}

// Initialize provider based on environment
const provider: EmailProvider = process.env.POSTMARK_SERVER_TOKEN
  ? new PostmarkEmailProvider()
  : new LogProvider();

/**
 * High-level helper for password reset emails.
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const uiBaseUrl = process.env.UI_BASE_URL ?? 'http://localhost:5173';
  const resetLink = `${uiBaseUrl}/reset-password?token=${resetToken}`;

  const options: EmailOptions = {
    to: email,
    subject: 'Phalanx Duel - Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>You recently requested to reset your password for your Phalanx Duel account.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request a password reset, please ignore this email or contact support.</p>
    `,
    text: `You recently requested to reset your password for your Phalanx Duel account.\n\nGo to this link to reset your password: ${resetLink}\n\nIf you did not request a password reset, please ignore this email.`,
  };

  try {
    await provider.send(options);
    if (process.env.POSTMARK_SERVER_TOKEN) {
      console.info(`[Mailer] Password reset email sent to ${email}`);
    }
  } catch (err: unknown) {
    console.error(`[Mailer] Failed to send email to ${email}`, err);
    throw new Error('Failed to send email', { cause: err });
  }
}

/**
 * High-level helper for welcome emails.
 */
export async function sendWelcomeEmail(email: string, gamertag: string): Promise<void> {
  const options: EmailOptions = {
    to: email,
    subject: 'Welcome to Phalanx Duel!',
    html: `
      <h2>Welcome, ${gamertag}!</h2>
      <p>Thanks for joining Phalanx Duel, the most competitive card engine on the web.</p>
      <p>You can now start dueling and climbing the ranked ladder.</p>
      <p>See you in the Arena!</p>
    `,
    text: `Welcome, ${gamertag}!\n\nThanks for joining Phalanx Duel. You can now start dueling and climbing the ranked ladder.\n\nSee you in the Arena!`,
  };

  try {
    await provider.send(options);
  } catch (err: unknown) {
    console.error(`[Mailer] Failed to send welcome email to ${email}`, err);
  }
}

/**
 * High-level helper for generic notifications.
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  content: string,
): Promise<void> {
  const options: EmailOptions = {
    to: email,
    subject: `Phalanx Duel - ${subject}`,
    html: `
      <h2>Notification</h2>
      <p>${content}</p>
      <p><small>You received this because email notifications are enabled in your profile.</small></p>
    `,
    text: `Phalanx Duel - ${subject}\n\n${content}\n\nYou received this because email notifications are enabled in your profile.`,
  };

  try {
    await provider.send(options);
  } catch (err: unknown) {
    console.error(`[Mailer] Failed to send notification to ${email}`, err);
  }
}

export const mailer = provider;
