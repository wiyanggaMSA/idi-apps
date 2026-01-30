import React, { useMemo, useState, useEffect } from "react";
import { Layout, Menu } from "antd";
import { Link, usePage } from "@inertiajs/react";
import { appMenu } from "@/config/menu";

const { Sider } = Layout;

function hasPermission(userPermissions, required) {
    if (!required) return true;
    return Array.isArray(userPermissions) && userPermissions.includes(required);
}

function toAntdItems(menu, userPermissions) {
    return menu
        .filter((m) => hasPermission(userPermissions, m.permission))
        .map((m) => {
            if (m.children?.length) {
                return {
                    key: m.key,
                    icon: m.icon,
                    label: m.label,
                    children: m.children
                        .filter((c) =>
                            hasPermission(userPermissions, c.permission),
                        )
                        .map((c) => ({
                            key: c.key,
                            icon: c.icon,
                            label: (
                               <Link href={route(c.routeName, c.routeParams || {})}>
                                    {c.label}
                                </Link>
                            ),
                        })),
                };
            }

            return {
                key: m.key,
                icon: m.icon,
                label: (
                    <Link href={route(m.routeName, m.routeParams || {})}>
                        {m.label}
                    </Link>
                ),
            };
        });
}

export default function AppSidebar({ collapsed, onCollapse, orgName }) {
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

    const items = useMemo(
        () => toAntdItems(appMenu, permissions),
        [permissions],
    );

    const selectedKey = useMemo(() => {
        const queryString = url?.split("?")[1] || "";
        const searchParams = new URLSearchParams(queryString);
        const createAction = searchParams.get("create");
        if (route().current("dashboard")) return "dashboard";

        // ✅ Sekretariat child highlight
        if (route().current("secretariat.letters.index"))
            return "secretariat.letters";
        if (route().current("secretariat.agenda.index"))
            return "secretariat.agenda";
        if (route().current("secretariat.templates.*")) {
            return createAction === "template"
                ? "secretariat.templates.create"
                : "secretariat.templates";
        }
        if (route().current("secretariat.numbering.*")) {
            return createAction === "numbering"
                ? "secretariat.numbering.create"
                : "secretariat.numbering";
        }
        if (route().current("secretariat.archive"))
            return "secretariat.archive";
        if (route().current("secretariat.*")) return "secretariat.letters";
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
        // Add more sections as needed
    }, [selectedKey]);

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            width={220}
            style={{ background: "#fff" }}
        >
            <div style={{ padding: 16, fontWeight: 700 }}>
                {!collapsed ? resolvedOrgName : collapsedLabel || "AK"}
            </div>

            <Menu
                mode="inline"
                items={items}
                selectedKeys={[selectedKey]}
                openKeys={openKeys}
                onOpenChange={(keys) => setOpenKeys(keys)}
                style={{ borderRight: 0 }}
            />
        </Sider>
    );
}
