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
        .map((item) => {
            const children = item.children?.filter((child) =>
                hasPermission(userPermissions, child.permission),
            );

            return {
                ...item,
                children,
            };
        })
        .filter((item) => item.routeName || (item.children?.length ?? 0) > 0);
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
        if (route().current("secretariat.signatures.*"))
            return "secretariat.signatures";
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
                collapsed ? "w-[88px]" : "w-[268px]"
            }`}
        >
            <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden px-3 py-4">
                <div className="mb-5 flex items-center justify-between gap-2 px-1">
                    {collapsed ? (
                        <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold tracking-wide text-white"
                            title={resolvedOrgName}
                        >
                            {collapsedLabel || "IDI"}
                        </div>
                    ) : (
                        <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 transition-all">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                                IDI Finance
                            </p>
                            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
                                {resolvedOrgName}
                            </p>
                        </div>
                    )}

                    {!collapsed ? (
                        <button
                            type="button"
                            onClick={() => onCollapse(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            {collapsedLabel || "AK"}
                        </button>
                    ) : null}
                </div>

                <nav className="space-y-2">
                    {items.map((item) => {
                        const hasChildren = item.children?.length > 0;
                        const isOpen = openKeys.includes(item.key);
                        const isActive = selectedKey === item.key;

                        if (!hasChildren) {
                            return (
                                <Link
                                    key={item.key}
                                    href={route(item.routeName, item.routeParams || {})}
                                    className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium leading-5 transition ${
                                        isActive
                                            ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                                            : "text-white/72 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span className="text-[15px] leading-none">{item.icon}</span>
                                    {!collapsed ? <span>{t(item.labelKey, {}, item.label)}</span> : null}
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={item.key}
                                className="rounded-2xl border border-white/10 bg-white/5 p-1.5"
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
                                    className="flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold leading-5 text-white transition hover:bg-white/8"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className="text-[15px] leading-none">{item.icon}</span>
                                        {!collapsed ? <span>{t(item.labelKey, {}, item.label)}</span> : null}
                                    </span>
                                    {!collapsed ? (
                                        <span className="min-w-4 text-center text-base font-medium leading-none text-white/55">
                                            {isOpen ? "−" : "+"}
                                        </span>
                                    ) : null}
                                </button>

                                {!collapsed && isOpen ? (
                                    <div className="mt-1 space-y-0.5">
                                        {item.children.map((child) => {
                                            const childActive = selectedKey === child.key;

                                            return (
                                                <Link
                                                    key={child.key}
                                                    href={route(
                                                        child.routeName,
                                                        child.routeParams || {},
                                                    )}
                                                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] leading-5 transition ${
                                                        childActive
                                                            ? "bg-white text-zinc-950 shadow-lg shadow-black/20"
                                                            : "text-white/68 hover:bg-white/10 hover:text-white"
                                                    }`}
                                                >
                                                    <span className="text-[15px] leading-none">{child.icon}</span>
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

                {collapsed ? (
                    <div
                        className="mt-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-wide text-white/80"
                        title={`${t("common.workspace")} - ${t("common.roleBasedAccess")}`}
                    >
                        WS
                    </div>
                ) : (
                    <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                            {t("common.workspace")}
                        </p>
                        <p className="mt-1.5 text-[13px] font-medium leading-snug text-white/90">
                            {t("common.roleBasedAccess")}
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
}
