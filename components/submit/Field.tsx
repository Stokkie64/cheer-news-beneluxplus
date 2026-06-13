"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

/** Label + control + (error|hint) wrapper used by every field below. */
export function FieldShell({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--accent)]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--accent)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: "text" | "url" | "email" | "date" | "time";
  placeholder?: string;
};

export function TextField({
  label,
  name,
  value,
  onChange,
  required,
  error,
  hint,
  type = "text",
  placeholder,
}: TextFieldProps) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, error && "border-[var(--accent)]")}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextFieldProps, "type"> & { rows?: number };

export function TextAreaField({
  label,
  name,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder,
  rows = 4,
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn(
          inputClass,
          "h-auto resize-y py-2 leading-relaxed",
          error && "border-[var(--accent)]",
        )}
      />
    </FieldShell>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  hint?: string;
};

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required,
  error,
  hint,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, error && "border-[var(--accent)]")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
