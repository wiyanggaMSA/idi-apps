import React from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/Contexts/I18nContext";

export default function EmptyState({
    title,
    description,
    action = null,
    compact = false,
}) {
    const { t } = useI18n();
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/90 text-center",
                compact ? "px-6 py-8" : "px-8 py-12",
            )}
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-red-700 to-zinc-900" />
            </div>
            <p className="text-base font-semibold text-zinc-900">
                {title || t("common.noData")}
            </p>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
                {description || t("common.noData")}
            </p>
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}
