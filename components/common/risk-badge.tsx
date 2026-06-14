"use client";

import {
  ShieldAlert,
  OctagonAlert,
  Wrench,
  ArrowUpNarrowWide,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_CATEGORY_META } from "@/lib/types";
import { RISK_COLOR_META } from "@/lib/constants";
import type { RiskCategory, RiskColor } from "@/lib/types";

const RISK_ICONS: Record<string, LucideIcon> = {
  "shield-alert": ShieldAlert,
  "octagon-alert": OctagonAlert,
  wrench: Wrench,
  "arrow-up-narrow-wide": ArrowUpNarrowWide,
  "user-cog": UserCog,
};

export function RiskBadge({
  category,
  showLabel = true,
  className,
}: {
  category: RiskCategory;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = RISK_CATEGORY_META[category];
  const color = RISK_COLOR_META[meta.color];
  const Icon = RISK_ICONS[color.icon] ?? ShieldAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-caption text-[10px] font-semibold",
        color.bg,
        color.fg,
        color.border,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {showLabel && meta.badge}
    </span>
  );
}

export function riskColorClasses(color: RiskColor) {
  return RISK_COLOR_META[color];
}
