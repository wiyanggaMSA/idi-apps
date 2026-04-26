import React from "react";
import { Skeleton } from "antd";

export default function LoadingSkeleton({ variant = "card", rows = 4 }) {
    if (variant === "table") {
        return (
            <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <Skeleton.Input active block style={{ height: 16, width: 180 }} />
                <Skeleton active paragraph={{ rows }} title={false} />
            </div>
        );
    }

    if (variant === "stats") {
        return (
            <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                    >
                        <Skeleton.Input active block style={{ height: 14, width: 120 }} />
                        <div className="mt-4">
                            <Skeleton.Input active block style={{ height: 28, width: 160 }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <Skeleton active paragraph={{ rows }} />
        </div>
    );
}
