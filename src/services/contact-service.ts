import nodemailer from "nodemailer";
import { prisma } from "@/db/prisma";

export const CONTACT_LIMITS = { name: 80, email: 120, subject: 120, message: 3000, messageMin: 10 };

export interface ContactInput {
  name: string;
  email: string;
  subject: string | null;
  message: string;
}

export type ContactField = "name" | "email" | "subject" | "message";

export type ContactValidation =
  | { ok: true; value: ContactInput }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

// Deliberately simple: one "@", a dot in the domain, no spaces. The reply is
// what proves the address works.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Reads and checks the contact form fields. */
export function validateContactForm(form: FormData): ContactValidation {
  const name = text(form, "name").replace(/\s+/g, " ");
  const email = text(form, "email").toLowerCase();
  const subject = text(form, "subject").replace(/\s+/g, " ");
  const message = text(form, "message").replace(/\r\n/g, "\n");
  const errors: Partial<Record<ContactField, string>> = {};

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = `Keep your name under ${CONTACT_LIMITS.name} characters.`;

  if (!email) errors.email = "Please enter your email address so we can reply.";
  else if (email.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = "Please enter a valid email address.";

  if (subject.length > CONTACT_LIMITS.subject) errors.subject = `Keep the subject under ${CONTACT_LIMITS.subject} characters.`;

  if (message.length < CONTACT_LIMITS.messageMin) errors.message = "Please write a little more (at least 10 characters).";
  else if (message.length > CONTACT_LIMITS.message) errors.message = `Keep the message under ${CONTACT_LIMITS.message} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, subject: subject || null, message } };
}

/**
 * Small in-memory limit per visitor (one server process): enough to stop a
 * script flooding the inbox, without storing IP addresses anywhere.
 */
export class SubmissionLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt; false when this key is over the limit. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((at) => now - at < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}

export interface MailSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
}

/** SMTP settings from the environment, or null when email is not configured. */
export function mailSettings(env: NodeJS.ProcessEnv = process.env): MailSettings | null {
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return {
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(env.SMTP_PORT) || 465,
    user,
    pass,
    to: env.CONTACT_TO_EMAIL?.trim() || user,
  };
}

async function sendContactEmail(input: ContactInput, settings: MailSettings): Promise<void> {
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: { user: settings.user, pass: settings.pass },
  });
  await transport.sendMail({
    from: { name: "IPONexa Contact", address: settings.user },
    to: settings.to,
    // "Reply" in the inbox answers the visitor directly.
    replyTo: { name: input.name, address: input.email },
    subject: `IPONexa contact: ${input.subject ?? `message from ${input.name}`}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Subject: ${input.subject ?? "-"}`,
      "",
      input.message,
      "",
      "Sent from the contact form on iponexa.com. Reply to this email to answer the visitor.",
    ].join("\n"),
  });
}

/**
 * Saves the message, then emails it. The saved copy means nothing is lost
 * if email is not configured or the mail server is unreachable.
 */
export async function submitContactMessage(input: ContactInput): Promise<{ emailed: boolean }> {
  const saved = await prisma.contactMessage.create({ data: input });
  const settings = mailSettings();
  if (!settings) {
    console.warn("[contact] SMTP not configured; message saved only", saved.id);
    return { emailed: false };
  }
  try {
    await sendContactEmail(input, settings);
    await prisma.contactMessage.update({ where: { id: saved.id }, data: { emailedAt: new Date() } });
    return { emailed: true };
  } catch (error) {
    console.error("[contact] email failed; message saved", saved.id, error instanceof Error ? error.message : error);
    return { emailed: false };
  }
}
