import { Head, Link } from "@inertiajs/react";
import { LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { useI18n } from "@/Contexts/I18nContext";

export default function Welcome({ auth }) {
    const { t } = useI18n();

    return (
        <>
            <Head title={t("welcome.title")} />
            <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(239,68,68,0.32),transparent_45%),linear-gradient(145deg,#0a0a0f_0%,#111114_54%,#1b0f10_100%)] px-6 py-10 text-zinc-100">
                <div className="mx-auto flex max-w-6xl flex-col">
                    <header className="flex items-center justify-between">
                        {/* LEFT */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                                IDI Purwakarta Branch
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold text-white">
                                {t("welcome.subtitle")}
                            </h1>
                        </div>

                        {/* RIGHT */}
                        <div className="flex items-center gap-3">
                            {/* Badge: logo + text */}
                            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                                {/* Logo (optional) */}
                                <img
                                    src="/logo-idi.png"
                                    alt="IDI Logo"
                                    className="h-4 w-4 object-contain"
                                />
                                <span>Authorized staff access only</span>
                            </div>

                            {/* Login button */}
                            {!auth?.user && (
                                <Link
                                    href={route("login")}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-zinc-300 transition hover:border-red-400 hover:text-red-200"
                                    aria-label={t("welcome.internalPortal")}
                                    title={t("welcome.internalPortal")}
                                >
                                    <LockOutlined />
                                </Link>
                            )}
                        </div>
                    </header>

                    <section className="mt-16 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                        <div className="rounded-3xl border border-white/10 bg-black/30 p-8 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.65)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
                                Organization Portal
                            </p>
                            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">
                                {t("welcome.title")}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300">
                                {t("welcome.description")}
                            </p>
                            <p className="mt-10 text-sm text-zinc-500">
                                {t("welcome.footer")}
                            </p>
                        </div>

                        <aside className="rounded-3xl border border-white/10 bg-zinc-950/75 p-7">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-red-900/25 px-3 py-2 text-sm text-red-100">
                                <SafetyOutlined />
                                <span>{t("welcome.secureOnly")}</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white">
                                {t("welcome.internalPortal")}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                {t("welcome.internalHint")}
                            </p>
                            {auth?.user ? (
                                <div className="mt-7">
                                    <Link
                                        href={route("dashboard")}
                                        className="inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                                    >
                                        Dashboard
                                    </Link>
                                </div>
                            ) : null}
                        </aside>
                    </section>
                </div>
            </main>
        </>
    );
}
