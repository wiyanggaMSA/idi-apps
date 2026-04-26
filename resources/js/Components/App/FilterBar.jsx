import React from "react";
import { cn } from "@/lib/cn";

export default function FilterBar({ children, className = "" }) {
    return (
        <div
            className={cn(
                "rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)] backdrop-blur",
                className,
            )}
        >
            <div className="flex flex-wrap items-end gap-3">{children}</div>
        </div>
    );
}
