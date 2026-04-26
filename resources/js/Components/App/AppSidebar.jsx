import React, { useEffect, useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { appMenu } from "@/config/menu";
import { useI18n } from "@/Contexts/I18nContext";

function hasPermission(userPermissions, required) {
    if (!required) return true;
    return Array.isArray(userPermissions) && userPermissions.includes(required);
}

function filterMenu(menu, userPermissions) {
    return menu
        .filter((item) => hasPermission(userPermissions, item.permission))
        .map((item) => ({
            ...item,
            children: item.children?.filter((child) =>
                hasPermission(userPermissions, child.permission),
            ),
        }));
}

export default function AppSidebar({ collapsed, onCollapse, orgName }) {
    const { t } = useI18n();
    const { props, url } = usePage();
    const permissions = props?.auth?.permissions || [];
    const resolvedOrgName = orgName || "Aplikasi Keuangan";
    const collapsedLabel = resolvedOrgName
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

    const items = useMemo(() => filterMenu(appMenu, permissions), [permissions]);

    const selectedKey = useMemo(() => {
        if (route().current("dashboard")) return "dashboard";

        // ✅ Sekretariat child highlight
        if (route().current("secretariat.dashboard"))
            return "secretariat.board";
        if (route().current("secretariat.letters.index"))
            return "secretariat.letters";
        if (route().current("secretariat.agenda.index"))
            return "secretariat.agenda";
        if (route().current("secretariat.templates.*"))
            return "secretariat.templates";
        if (route().current("secretariat.numbering.*"))
            return "secretariat.numbering";
        if (route().current("secretariat.archive.*"))
            return "secretariat.archive";
        if (route().current("secretariat.*")) return "secretariat.board";
        // ✅ Members child highlight
        if (route().current("members.index")) return "members.center";
        if (route().current("members.import-export")) return "members.import";
        if (route().current("members.*")) return "members.center";
        // ✅ Dues child highlight
        if (route().current("dues.index")) return "dues.payments";
        if (route().current("dues.recap")) return "dues.recap";
        if (route().current("dues.*")) return "dues.payments";
        // ✅ Cash child highlight
        if (route().current("transactions.index")) return "cash.transactions";
        if (route().current("transactions.*")) return "cash.transactions";
        // ✅ Reports child highlight
        if (route().current("reports.cash")) return "reports.main";
        if (route().current("reports.financial-summary"))
            return "reports.resume";
        if (route().current("settings.*")) return "settings";

        return "dashboard";
    }, [url]);

    const [openKeys, setOpenKeys] = useState([]);

    useEffect(() => {
        if (selectedKey.startsWith("secretariat.")) {
            setOpenKeys((prev) =>
                prev.includes("secretariat") ? prev : ["secretariat", ...prev],
            );
        }
        if (selectedKey.startsWith("members.")) {
            setOpenKeys((prev) =>
                prev.includes("members") ? prev : ["members", ...prev],
            );
        }
        if (selectedKey.startsWith("dues.")) {
            setOpenKeys((prev) =>
                prev.includes("dues") ? prev : ["dues", ...prev],
            );
        }
        if (selectedKey.startsWith("cash.")) {
            setOpenKeys((prev) =>
                prev.includes("cash") ? prev : ["cash", ...prev],
            );
        }
        if (selectedKey.startsWith("reports.")) {
            setOpenKeys((prev) =>
                prev.includes("reports") ? prev : ["reports", ...prev],
            );
        }
    }, [selectedKey]);

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/60 bg-gradient-to-b from-zinc-950 via-zinc-900 to-red-950 text-white shadow-[24px_0_60px_-36px_rgba(15,23,42,0.9)] xl:block ${
                collapsed ? "w-[104px]" : "w-[308px]"
            }`}
        >
            <div className="flex h-full flex-col overflow-y-auto px-4 py-5">
                <div className="mb-8 flex items-center justify-between gap-3 px-2">
                    <div
                        className={`rounded-3xl border border-white/10 bg-white/5 px-4 py-3 transition-all ${
                            collapsed ? "w-full text-center" : "flex-1"
                        }`}
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
                            IDI Finance
                        </p>
                        <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
                            {collapsed ? collapsedLabel || "IDI" : resolvedOrgName}
                        </p>
                    </div>

                    {!collapsed ? (
                        <button
                            type="button"
                            onClick={() => onCollapse(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            {collapsedLabel || "AK"}
                        </button>
                    ) : null}
                </div>

                <nav className="space-y-3">
                    {items.map((item) => {
                        const hasChildren = item.children?.length > 0;
                        const isOpen = openKeys.includes(item.key);
                        const isActive = selectedKey === item.key;

                        if (!hasChildren) {
                            return (
                                <Link
                                    key={item.key}
                                    href={route(item.routeName, item.routeParams || {})}
                                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-[16px] font-medium transition ${
                                        isActive
                                            ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                                            : "text-white/72 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {!collapsed ? <span>{t(item.labelKey, {}, item.label)}</span> : null}
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={item.key}
                                className="rounded-[28px] border border-white/10 bg-white/5 p-2"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpenKeys((prev) =>
                                            prev.includes(item.key)
                                                ? prev.filter((key) => key !== item.key)
                                                : [...prev, item.key],
                                        )
                                    }
                                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-[16px] font-semibold text-white transition hover:bg-white/8"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="text-lg">{item.icon}</span>
                                        {!collapsed ? <span>{t(item.labelKey, {}, item.label)}</span> : null}
                                    </span>
                                    {!collapsed ? (
                                        <span className="min-w-[20px] text-center text-[20px] font-medium leading-none text-white/55">
                                            {isOpen ? "−" : "+"}
                                        </span>
                                    ) : null}
                                </button>

                                {!collapsed && isOpen ? (
                                    <div className="mt-1 space-y-1">
                                        {item.children.map((child) => {
                                            const childActive = selectedKey === child.key;

                                            return (
                                                <Link
                                                    key={child.key}
                                                    href={route(
                                                        child.routeName,
                                                        child.routeParams || {},
                                                    )}
                                                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] transition ${
                                                        childActive
                                                            ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                                                            : "text-white/68 hover:bg-white/10 hover:text-white"
                                                    }`}
                                                >
                                                    <span className="text-lg">{child.icon}</span>
                                                    <span>{t(child.labelKey, {}, child.label)}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </nav>

                <div className="mt-auto rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
                        {t("common.workspace")}
                    </p>
                    <p className="mt-2 text-[15px] font-medium text-white/90">
                        {t("common.roleBasedAccess")}
                    </p>
                </div>
            </div>
        </aside>
    );
}
