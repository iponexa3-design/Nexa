"use server";

import { headers } from "next/headers";
import {
  SubmissionLimiter,
  submitContactMessage,
  validateContactForm,
  type ContactField,
} from "@/services/contact-service";

export interface ContactFormState {
  status: "idle" | "sent" | "error";
  message?: string;
  errors?: Partial<Record<ContactField, string>>;
  /** Typed values, returned on errors so the visitor does not lose them. */
  values?: Partial<Record<ContactField, string>>;
}

// 5 messages per visitor per hour.
const limiter = new SubmissionLimiter(5, 60 * 60 * 1000);

async function visitorKey(): Promise<string> {
  const list = await headers();
  // Nginx appends the real client address last; earlier entries can be spoofed.
  const forwarded = list.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? "unknown";
}

function typedValues(form: FormData): ContactFormState["values"] {
  const pick = (key: ContactField) => {
    const value = form.get(key);
    return typeof value === "string" ? value.slice(0, 4000) : "";
  };
  return { name: pick("name"), email: pick("email"), subject: pick("subject"), message: pick("message") };
}

export async function sendContactMessage(_previous: ContactFormState, form: FormData): Promise<ContactFormState> {
  // Hidden field that people never see; bots that fill every field get a
  // normal-looking "sent" reply and nothing is stored.
  if (typeof form.get("website") === "string" && (form.get("website") as string).trim() !== "") {
    return { status: "sent" };
  }

  const result = validateContactForm(form);
  if (!result.ok) {
    return { status: "error", message: "Please check the highlighted fields.", errors: result.errors, values: typedValues(form) };
  }

  if (!limiter.allow(await visitorKey())) {
    return {
      status: "error",
      message: "You have sent several messages in the last hour. Please try again later.",
      values: typedValues(form),
    };
  }

  try {
    await submitContactMessage(result.value);
    return { status: "sent" };
  } catch (error) {
    console.error("[contact] could not save message", error instanceof Error ? error.message : error);
    return {
      status: "error",
      message: "Sorry, your message could not be sent right now. Please try again in a few minutes.",
      values: typedValues(form),
    };
  }
}
