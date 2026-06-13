import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Optional dot/border color (e.g. an event-type color). */
  color?: string;
}

/** Small pill label. Pass `color` to tint a leading dot. */
export function Badge({ className, color, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]",
        className,
      )}
      {...props}
    >
      {color && (
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}
