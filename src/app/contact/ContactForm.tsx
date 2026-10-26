"use client";

import { useActionState, type ReactNode } from "react";
import { sendContactMessage, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

const inputClass =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] text-zinc-800 outline-none focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-emerald-900">
        <p className="text-lg font-bold">Thank you, your message has been sent.</p>
        <p className="mt-1 text-sm leading-6">We read every message and will reply to the email address you gave.</p>
      </div>
    );
  }

  const values = state.values ?? {};
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" error={errors.name}>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            className={`${inputClass} ${errors.name ? "border-rose-400" : "border-[#dce7e5]"}`}
          />
        </Field>
        <Field label="Your email" name="email" error={errors.email} hint="We reply to this address.">
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={120}
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            className={`${inputClass} ${errors.email ? "border-rose-400" : "border-[#dce7e5]"}`}
          />
        </Field>
      </div>

      <Field label="Subject (optional)" name="subject" error={errors.subject}>
        <input
          id="contact-subject"
          name="subject"
          maxLength={120}
          defaultValue={values.subject}
          aria-invalid={errors.subject ? true : undefined}
          className={`${inputClass} ${errors.subject ? "border-rose-400" : "border-[#dce7e5]"}`}
        />
      </Field>

      <Field label="Message" name="message" error={errors.message}>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          maxLength={3000}
          defaultValue={values.message}
          aria-invalid={errors.message ? true : undefined}
          className={`${inputClass} resize-y ${errors.message ? "border-rose-400" : "border-[#dce7e5]"}`}
        />
      </Field>

      {/* Spam trap: hidden from people, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#174a52] px-6 py-3 text-[15px] font-bold text-white hover:bg-[#123a41] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="text-xs leading-5 text-zinc-500">
          Your name, email and message are used only to reply to you.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`contact-${name}`} className="mb-1 block text-sm font-semibold text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-rose-700">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
