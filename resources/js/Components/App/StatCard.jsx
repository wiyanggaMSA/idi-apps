import React from "react";
import { cn } from "@/lib/cn";

const TONES = {
    neutral: {
        container:
            "border-zinc-200 bg-white text-zinc-950 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.34)]",
        title: "text-zinc-500",
        hint: "text-zinc-500",
        icon: "bg-zinc-100 text-zinc-700 shadow-inner shadow-zinc-200/60",
    },
    primary: {
        container:
            "border-red-300 bg-gradient-to-br from-red-700 via-red-800 to-zinc-950 text-white shadow-[0_18px_40px_-24px_rgba(127,29,29,0.5)]",
        title: "text-white/90",
        hint: "text-white/82",
        icon: "bg-white/14 text-white shadow-inner shadow-white/10",
    },
    success: {
        container:
            "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[0_16px_40px_-28px_rgba(5,150,105,0.36)]",
        title: "text-emerald-800",
        hint: "text-emerald-800/80",
        icon: "bg-emerald-100 text-emerald-800 shadow-inner shadow-emerald-200/70",
    },
    danger: {
        container:
            "border-rose-200 bg-rose-50 text-rose-950 shadow-[0_16px_40px_-28px_rgba(190,24,93,0.3)]",
        title: "text-rose-800",
        hint: "text-rose-800/80",
        icon: "bg-rose-100 text-rose-800 shadow-inner shadow-rose-200/70",
    },
    warning: {
        container:
            "border-amber-200 bg-amber-50 text-amber-950 shadow-[0_16px_40px_-28px_rgba(217,119,6,0.3)]",
        title: "text-amber-800",
        hint: "text-amber-800/80",
        icon: "bg-amber-100 text-amber-800 shadow-inner shadow-amber-200/70",
    },
    dark: {
        container:
            "border-zinc-800 bg-zinc-950 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.46)]",
        title: "text-white/88",
        hint: "text-white/80",
        icon: "bg-white/12 text-white shadow-inner shadow-white/8",
    },
};

export default function StatCard({
    title,
    value,
    hint,
    icon,
    tone = "neutral",
    className = "",
}) {
    const toneStyle = TONES[tone] || TONES.neutral;
    return (
        <div
            className={cn(
                "rounded-3xl border px-5 py-5 transition-transform duration-200 hover:-translate-y-0.5",
                toneStyle.container,
                className,
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <p className={cn("text-xs font-semibold uppercase tracking-[0.24em]", toneStyle.title)}>
                        {title}
                    </p>
                    <div className="text-2xl font-semibold leading-none tracking-tight">
                        {value}
                    </div>
                    {hint ? (
                        <p className={cn("text-xs font-medium", toneStyle.hint)}>{hint}</p>
                    ) : null}
                </div>
                {icon ? (
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-lg", toneStyle.icon)}>
                        {icon}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
