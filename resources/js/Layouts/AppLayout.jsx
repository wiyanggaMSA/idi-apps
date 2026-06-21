import React, { useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import AppSidebar from "@/Components/App/AppSidebar";
import AppHeader from "@/Components/App/AppHeader";

export default function AppLayout({ title, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const { props } = usePage();
    const auth = props?.auth || {};
    const user = auth?.user || null;
    const orgProfile = props?.orgProfile || {};

    const pageTitle = title || "Aplikasi Keuangan Organisasi";

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f4f4f5_100%)] text-zinc-900">
            <Head title={pageTitle} />

            <AppSidebar
                collapsed={collapsed}
                onCollapse={setCollapsed}
                orgName={orgProfile?.org_name}
            />

            <div
                className={`min-h-screen transition-all duration-300 ${
                    collapsed ? "xl:pl-[88px]" : "xl:pl-[268px]"
                }`}
            >
                <AppHeader
                    title={pageTitle}
                    user={user}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                    orgName={orgProfile?.org_name}
                />

                <main className="px-8 py-8">
                    <div className="mx-auto max-w-[1680px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
