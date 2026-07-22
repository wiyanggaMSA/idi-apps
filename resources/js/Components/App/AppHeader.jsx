import React from "react";
import { Button, Dropdown } from "antd";
import {
    GlobalOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { Link, router } from "@inertiajs/react";
import { useI18n } from "@/Contexts/I18nContext";

function hasNamedRoute(name) {
    try {
        return typeof route === "function" && route().has(name);
    } catch {
        return false;
    }
}

export default function AppHeader({
    title,
    user,
    collapsed,
    onToggle,
    mobileMenuOpen,
    onMobileOpen,
    orgName,
}) {
    const { language, toggleLanguage, t } = useI18n();
    const items = [
        ...(hasNamedRoute("profile.edit")
            ? [
                  {
                      key: "profile",
                      icon: <SettingOutlined />,
                      label: <Link href={route("profile.edit")}>{t("common.profile")}</Link>,
                  },
              ]
            : []),
        {
            key: "logout",
            icon: <LogoutOutlined />,
            label: t("common.logout"),
            onClick: () => router.post(route("logout")),
        },
    ];

    return (
        <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(248,250,252,0.82)] px-8 py-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-label={collapsed ? "Perluas menu navigasi" : "Ringkas menu navigasi"}
                        className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-red-500 xl:flex"
                    >
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </button>

                    <button
                        type="button"
                        onClick={onMobileOpen}
                        aria-label="Buka menu navigasi"
                        aria-expanded={mobileMenuOpen}
                        aria-controls="app-sidebar"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-red-500 xl:hidden"
                    >
                        <MenuUnfoldOutlined />
                    </button>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                            {orgName || "IDI Apps"}
                        </p>
                        <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                            {title}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-right shadow-sm xl:block">
                        <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
                            {t("common.activeUser")}
                        </p>
                        <p className="text-sm font-semibold text-zinc-900">
                            {user?.name || "User"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={toggleLanguage}
                        className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-red-200 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title={t("common.language")}
                    >
                        <GlobalOutlined />
                        <span>{language === "id" ? "ID" : "EN"}</span>
                    </button>

                    <Dropdown menu={{ items }} trigger={["click"]}>
                        <Button
                            icon={<UserOutlined />}
                            size="large"
                            className="!h-11 !rounded-2xl !border-zinc-200 !bg-white !px-4 !font-medium !text-zinc-700 !shadow-sm hover:!text-zinc-950"
                        >
                            {user?.name || "User"}
                        </Button>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
