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
            .filter((c) => hasPermission(userPermissions, c.permission))
            .map((c) => ({
              key: c.key,
              icon: c.icon,
              label: <Link href={route(c.routeName)}>{c.label}</Link>,
            })),
        };
      }

      return {
        key: m.key,
        icon: m.icon,
        label: <Link href={route(m.routeName)}>{m.label}</Link>,
      };
    });
}

export default function AppSidebar({ collapsed, onCollapse }) {
  const { props } = usePage();
  const permissions = props?.auth?.permissions || [];

  const items = useMemo(() => toAntdItems(appMenu, permissions), [permissions]);

  const selectedKey = useMemo(() => {
    if (route().current("dashboard")) return "dashboard";

    // ✅ Sekretariat child highlight
    if (route().current("secretariat.index")) return "secretariat.letters";
    if (route().current("secretariat.agenda")) return "secretariat.agenda";
    if (route().current("secretariat.archive")) return "secretariat.archive";
    if (route().current("secretariat.*")) return "secretariat.letters";
    // ✅ Members child highlight
    if (route().current("members.index")) return "members.center";
    if (route().current("members.import")) return "members.import";
    if (route().current("members.*")) return "members.center";
    // ✅ Dues child highlight
if (route().current("dues.index")) return "dues.payments";
if (route().current("dues.recap")) return "dues.recap";
if (route().current("dues.*")) return "dues.payments";
    // ✅ Cash child highlight
if (route().current("cash.index")) return "cash.transactions";
if (route().current("cash.reports")) return "cash.reports";
if (route().current("cash.export")) return "cash.export";
if (route().current("cash.*")) return "cash.transactions";
    // ✅ Reports child highlight
if (route().current("reports.index")) return "reports.main";
if (route().current("reports.resume")) return "reports.resume";
if (route().current("reports.export")) return "reports.export";
if (route().current("reports.*")) return "reports.main";

    if (route().current("settings.*")) return "settings";

    return "dashboard";
  }, []);

  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    if (selectedKey.startsWith("secretariat.")) {
      setOpenKeys((prev) => (prev.includes("secretariat") ? prev : ["secretariat", ...prev]));
    }
    if (selectedKey.startsWith("members.")) {
    setOpenKeys((prev) => (prev.includes("members") ? prev : ["members", ...prev]));
    }
    if (selectedKey.startsWith("dues.")) {
      setOpenKeys((prev) => (prev.includes("dues") ? prev : ["dues", ...prev]));
    }
    if (selectedKey.startsWith("cash.")) {
      setOpenKeys((prev) => (prev.includes("cash") ? prev : ["cash", ...prev]));
    }
    if (selectedKey.startsWith("reports.")) {
      setOpenKeys((prev) => (prev.includes("reports") ? prev : ["reports", ...prev]));
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
        {!collapsed ? "Aplikasi Keuangan" : "AK"}
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
