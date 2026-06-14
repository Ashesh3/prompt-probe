"use client";

import {
  ShieldAlert,
  CircleCheckBig,
  Ban,
  TriangleAlert,
  Loader,
  CircleSlash,
  CircleDashed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/constants";
import type { ModelResultStatus } from "@/lib/types";

const STATUS_ICONS: Record<string, LucideIcon> = {
  "check-circle-2": CircleCheckBig,
  "shield-alert": ShieldAlert,
  ban: Ban,
  "triangle-alert": TriangleAlert,
  loader: Loader,
  "circle-slash": CircleSlash,
  "circle-dashed": CircleDashed,
};

export function StatusBadge({
  status,
  className,
  withIcon = true,
}: {
  status: ModelResultStatus;
  className?: string;
  withIcon?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = STATUS_ICONS[meta.icon] ?? CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-caption text-[11px] font-semibold",
        meta.bg,
        meta.fg,
        meta.border,
        className,
      )}
    >
      {withIcon && (
        <Icon
          className={cn("size-3", status === "running" && "animate-spin")}
          aria-hidden
        />
      )}
      {meta.label}
    </span>
  );
}

export function StatusDot({
  status,
  className,
}: {
  status: ModelResultStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        meta.dot,
        status === "running" && "animate-pulse",
        className,
      )}
      aria-label={meta.label}
    />
  );
}
