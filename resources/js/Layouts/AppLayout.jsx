import React, { useEffect, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import AppSidebar from "@/Components/App/AppSidebar";
import AppHeader from "@/Components/App/AppHeader";
import AppFooter from "@/Components/App/AppFooter";

export default function AppLayout({ title, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { props } = usePage();
    const auth = props?.auth || {};
    const user = auth?.user || null;
    const orgProfile = props?.orgProfile || {};

    const pageTitle = title || "IDI Apps";

    useEffect(() => {
        if (!mobileMenuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        const handleEscape = (event) => {
            if (event.key === "Escape") setMobileMenuOpen(false);
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [mobileMenuOpen]);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f4f4f5_100%)] text-zinc-900">
            <Head title={pageTitle} />

            <AppSidebar
                collapsed={collapsed}
                onCollapse={setCollapsed}
                orgName={orgProfile?.org_name}
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />

            <div
                inert={mobileMenuOpen ? "" : undefined}
                className={`flex min-h-screen flex-col transition-all duration-300 ${
                    collapsed ? "xl:pl-[88px]" : "xl:pl-[268px]"
                }`}
            >
                <AppHeader
                    title={pageTitle}
                    user={user}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                    mobileMenuOpen={mobileMenuOpen}
                    onMobileOpen={() => setMobileMenuOpen(true)}
                    orgName={orgProfile?.org_name}
                />

                <main className="flex-1 px-8 py-8">
                    <div className="mx-auto max-w-[1680px]">{children}</div>
                </main>

                <AppFooter className="sticky bottom-0 z-20" />
            </div>
        </div>
    );
}
