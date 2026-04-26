import React, { useState } from "react";
import { usePage } from "@inertiajs/react";
import AppSidebar from "@/Components/App/AppSidebar";
import AppHeader from "@/Components/App/AppHeader";

export default function AppLayout({ title, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const { props } = usePage();
    const auth = props?.auth || {};
    const user = auth?.user || null;
    const orgProfile = props?.orgProfile || {};

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f4f4f5_100%)] text-zinc-900">
            <AppSidebar
                collapsed={collapsed}
                onCollapse={setCollapsed}
                orgName={orgProfile?.org_name}
            />

            <div
                className={`min-h-screen transition-all duration-300 ${
                    collapsed ? "xl:pl-[104px]" : "xl:pl-[308px]"
                }`}
            >
                <AppHeader
                    title={title || "Aplikasi Keuangan Organisasi"}
                    user={user}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                    orgName={orgProfile?.org_name}
                    brandColor={orgProfile?.brand_color}
                />

                <main className="px-8 py-8">
                    <div className="mx-auto max-w-[1680px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
