import React from "react";
import { cn } from "@/lib/cn";
import { formatIDR } from "@/lib/format";

export default function MoneyDisplay({
    value,
    tone = "default",
    emphasize = false,
    className = "",
    showPrefix = false,
}) {
    const toneClass = {
        default: "text-zinc-900",
        success: "text-emerald-700",
        danger: "text-rose-700",
        warning: "text-amber-700",
        primary: "text-red-700",
        muted: "text-zinc-500",
        inverse: "text-white",
    }[tone];

    return (
        <span
            className={cn(
                "font-semibold tabular-nums",
                emphasize ? "text-base" : "text-xs",
                toneClass,
                className,
            )}
        >
            {showPrefix && Number(value || 0) > 0 ? "+" : ""}
            {formatIDR(value)}
        </span>
    );
}
