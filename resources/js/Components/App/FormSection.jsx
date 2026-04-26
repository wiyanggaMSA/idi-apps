import React from "react";
import { cn } from "@/lib/cn";

export default function FormSection({
    title,
    description,
    children,
    extra = null,
    className = "",
}) {
    return (
        <section
            className={cn(
                "rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)]",
                className,
            )}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
                    {description ? (
                        <p className="mt-1 text-sm text-zinc-500">{description}</p>
                    ) : null}
                </div>
                {extra}
            </div>
            {children}
        </section>
    );
}
