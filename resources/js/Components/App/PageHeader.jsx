import React from "react";

export default function PageHeader({
    title,
    description,
    eyebrow,
    extra,
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-[32px] border border-white/80 bg-gradient-to-br from-white via-white to-red-50/70 px-6 py-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
            <div className="space-y-2">
                {eyebrow ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                        {eyebrow}
                    </p>
                ) : null}
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>
            {extra ? <div className="flex flex-wrap items-center gap-3">{extra}</div> : null}
        </div>
    );
}
