import React, { useEffect, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import {
    ArrowRightOutlined,
    CalendarOutlined,
    LoginOutlined,
    MenuOutlined,
    UpOutlined,
} from "@ant-design/icons";

export default function Welcome({ auth, portal = {} }) {
    const profile = portal.profile || {};
    const slides = portal.slides || [];
    const about = portal.about || {};
    const visionMission = portal.visionMission || {};
    const services = portal.services || [];
    const leaders = portal.leaders || [];
    const contact = portal.contact || {};
    const contactMeta = contact.meta || {};
    const orgName = profile.org_name || "IDI Cabang Purwakarta";
    const brandTitle = "Ikatan Dokter Indonesia";
    const brandSubtitle = "Cabang Purwakarta";
    const [activeSlide, setActiveSlide] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const currentSlide = slides[activeSlide] || slides[0] || {};
    const secretariatName = contact.content || "Sekretariat IDI Cabang Purwakarta";
    const address = contactMeta.address || profile.address || "Jl. Contoh Alamat No. 00, Kabupaten Purwakarta, Jawa Barat";
    const phone = contactMeta.phone || profile.phone || "(0264) 000000";
    const whatsapp = contactMeta.whatsapp || "+62 812-0000-0000";
    const email = contactMeta.email || profile.email || "sekretariat@idipurwakarta.org";
    const serviceHours = contactMeta.service_hours || "Senin-Jumat, 08.00-16.00 WIB";
    const whatsappUrl = `https://wa.me/${String(whatsapp).replace(/\D/g, "")}`;
    const mapUrl = contactMeta.map_url || "https://maps.google.com/?q=Purwakarta";
    const socialLinks = [
        ["IG", "Instagram IDI Cabang Purwakarta", contactMeta.instagram_url],
        ["FB", "Facebook IDI Cabang Purwakarta", contactMeta.facebook_url],
        ["YT", "YouTube IDI Cabang Purwakarta", contactMeta.youtube_url],
    ].filter(([, , url]) => Boolean(url));

    useEffect(() => {
        if (slides.length <= 1) return undefined;

        const timer = window.setInterval(() => {
            setActiveSlide((value) => (value + 1) % slides.length);
        }, 6500);

        return () => window.clearInterval(timer);
    }, [slides.length]);

    return (
        <>
            <Head title={orgName}>
                {currentSlide.image_url ? (
                    <link rel="preload" as="image" href={currentSlide.image_url} />
                ) : null}
            </Head>
            <main className="min-h-screen bg-[#f8fafc] text-zinc-900">
                <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 bg-white/90 shadow-sm backdrop-blur">
                    <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
                        <a href="#beranda" className="flex items-center gap-3">
                            {profile.logo_url ? (
                                <img
                                    src={profile.logo_url}
                                    alt="Logo IDI"
                                    width="56"
                                    height="56"
                                    className="h-14 w-14 object-contain"
                                />
                            ) : null}
                            <span>
                                <strong className="block text-base font-black leading-tight text-red-700 sm:text-lg">
                                    {brandTitle}
                                </strong>
                                <small className="block max-w-[230px] truncate text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                    {brandSubtitle}
                                </small>
                            </span>
                        </a>

                        <button
                            type="button"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-200 text-zinc-800 lg:hidden"
                            aria-label="Buka menu navigasi"
                            aria-expanded={mobileOpen}
                            onClick={() => setMobileOpen((value) => !value)}
                        >
                            <MenuOutlined />
                        </button>

                        <div
                            className={`absolute left-0 right-0 top-20 border-b border-zinc-200 bg-white px-5 py-4 shadow-xl lg:static lg:flex lg:items-center lg:gap-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
                                mobileOpen ? "block" : "hidden"
                            }`}
                        >
                            {[
                                ["#beranda", "Beranda"],
                                ["#tentang", "Tentang IDI"],
                                ["#visi-misi", "Visi Misi"],
                                ["#layanan", "Layanan Anggota"],
                                ["#pengurus", "Pengurus"],
                                ["#kontak", "Kontak"],
                            ].map(([href, label]) => (
                                <a
                                    key={href}
                                    href={href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block py-2 text-sm font-semibold text-zinc-700 transition hover:text-red-700 lg:py-0"
                                >
                                    {label}
                                </a>
                            ))}
                            <Link
                                href={auth?.user ? route("dashboard") : route("login")}
                                aria-label={auth?.user ? "Buka dashboard" : "Login"}
                                title={auth?.user ? "Buka dashboard" : "Login"}
                                className="mt-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-red-700 text-lg text-white transition hover:bg-red-800 lg:mt-0"
                            >
                                <LoginOutlined />
                            </Link>
                        </div>
                    </nav>
                </header>

                <section
                    id="beranda"
                    className="relative flex min-h-[92dvh] items-end overflow-hidden pt-20"
                >
                    {slides.map((slide, index) => (
                        <img
                            key={`${slide.image_url}-${index}`}
                            src={slide.image_url}
                            alt={slide.title || orgName}
                            width="1600"
                            height="1000"
                            fetchPriority={index === 0 ? "high" : "low"}
                            loading={index === 0 ? "eager" : "lazy"}
                            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                                index === activeSlide ? "opacity-100" : "opacity-0"
                            }`}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/50 to-red-950/25" />
                    <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-20 lg:px-8">
                        <div className="max-w-3xl text-white">
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-200">
                                {currentSlide.subtitle || "Profesional, Berintegritas, Mengabdi"}
                            </p>
                            <h1 className="mt-5 whitespace-pre-line text-4xl font-black leading-tight md:text-6xl">
                                {currentSlide.title || `${brandTitle}\n${brandSubtitle}`}
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-100 md:text-lg">
                                {currentSlide.content}
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <a
                                    href={currentSlide.meta?.button_url || "#tentang"}
                                    className="inline-flex min-h-12 items-center gap-2 rounded-md bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
                                >
                                    {currentSlide.meta?.button_label || "Lihat Profil Organisasi"}
                                    <ArrowRightOutlined />
                                </a>
                                <a
                                    href="#layanan"
                                    className="inline-flex min-h-12 items-center rounded-md border border-white/55 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-zinc-950"
                                >
                                    Informasi Keanggotaan
                                </a>
                            </div>
                        </div>
                    </div>
                    {slides.length > 1 ? (
                        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    aria-label={`Pilih slide ${index + 1}`}
                                    onClick={() => setActiveSlide(index)}
                                    className={`h-2.5 rounded-full transition-all ${
                                        index === activeSlide
                                            ? "w-8 bg-white"
                                            : "w-2.5 bg-white/50"
                                    }`}
                                />
                            ))}
                        </div>
                    ) : null}
                </section>

                <section id="tentang" className="bg-white py-20">
                    <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
                        {about.image_url ? (
                            <img
                                src={about.image_url}
                                alt={about.title || "Tentang IDI"}
                                width="900"
                                height="680"
                                loading="lazy"
                                className="aspect-[4/3] w-full rounded-lg object-cover shadow-2xl"
                            />
                        ) : null}
                        <div className="self-center">
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-700">
                                {about.subtitle || "Profil Organisasi"}
                            </p>
                            <h2 className="mt-4 text-3xl font-black leading-tight text-zinc-950 md:text-5xl">
                                {about.title}
                            </h2>
                            <p className="mt-5 whitespace-pre-line text-base leading-8 text-zinc-600">
                                {about.content}
                            </p>
                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                {["Profesionalisme", "Integritas", "Kesejawatan", "Pengabdian"].map(
                                    (value) => (
                                        <div
                                            key={value}
                                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-bold text-zinc-800"
                                        >
                                            {value}
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="visi-misi" className="bg-zinc-100 py-20">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-700">
                            {visionMission.subtitle || "Arah Organisasi"}
                        </p>
                        <h2 className="mt-4 text-3xl font-black text-zinc-950 md:text-5xl">
                            {visionMission.title || "Visi & Misi"}
                        </h2>
                        <article className="mt-8 rounded-lg bg-red-700 p-6 text-white shadow-xl">
                            <span className="text-xs font-bold uppercase tracking-[0.24em] text-red-100">
                                Visi
                            </span>
                            <p className="mt-3 text-xl font-semibold leading-8">
                                {visionMission.content}
                            </p>
                        </article>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {(visionMission.items || []).map((mission, index) => (
                                <article
                                    key={`${mission}-${index}`}
                                    className="rounded-lg border border-zinc-200 bg-white p-5 font-semibold leading-7 text-zinc-700"
                                >
                                    {mission}
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="layanan" className="bg-white py-20">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-700">
                            Pusat Informasi Anggota
                        </p>
                        <h2 className="mt-4 text-3xl font-black text-zinc-950 md:text-5xl">
                            Layanan Anggota
                        </h2>
                        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {services.map((service, index) => (
                                <article
                                    key={`${service.title}-${index}`}
                                    className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]"
                                >
                                    <CalendarOutlined className="text-xl text-red-700" />
                                    <h3 className="mt-4 text-lg font-black text-zinc-950">
                                        {service.title}
                                    </h3>
                                    <p className="mt-2 leading-7 text-zinc-600">
                                        {service.content}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="pengurus" className="bg-zinc-100 py-20">
                    <div className="mx-auto max-w-7xl px-5 lg:px-8">
                        <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-700">
                            Struktur Organisasi
                        </p>
                        <h2 className="mt-4 text-3xl font-black text-zinc-950 md:text-5xl">
                            Pengurus
                        </h2>
                        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {leaders.length ? (
                                leaders.map((leader, index) => (
                                    <article
                                        key={`${leader.title}-${index}`}
                                        className="rounded-lg border border-zinc-200 bg-white p-5"
                                    >
                                        {leader.image_url ? (
                                            <img
                                                src={leader.image_url}
                                                alt={leader.title}
                                                width="420"
                                                height="320"
                                                loading="lazy"
                                                className="mb-4 aspect-[4/3] w-full rounded-md object-cover"
                                            />
                                        ) : null}
                                        <h3 className="text-lg font-black text-zinc-950">
                                            {leader.title}
                                        </h3>
                                        <p className="mt-1 font-semibold text-red-700">
                                            {leader.subtitle}
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                                            {leader.content}
                                        </p>
                                    </article>
                                ))
                            ) : (
                                <p className="text-zinc-500">
                                    Data pengurus akan tampil setelah diisi melalui Portal IDI atau
                                    modul struktur organisasi aktif.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <footer
                    id="kontak"
                    className="relative overflow-hidden bg-[#8d111d] px-5 py-12 text-red-100 md:py-16"
                >
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.55fr_0.95fr] lg:items-start">
                            <div>
                                <a href="#beranda" className="inline-flex items-center gap-4">
                                    {profile.logo_url ? (
                                        <img
                                            src={profile.logo_url}
                                            alt="Logo IDI"
                                            width="68"
                                            height="68"
                                            loading="lazy"
                                            className="h-16 w-16 rounded-full bg-white object-contain p-1"
                                        />
                                    ) : null}
                                    <strong className="text-xl font-black text-white">
                                        IDI Cabang Purwakarta
                                    </strong>
                                </a>
                                <p className="mt-6 max-w-xl text-xl font-semibold leading-relaxed text-red-100/85">
                                    Wadah profesional dokter untuk pembinaan, kesejawatan,
                                    dan pengabdian kepada masyarakat Purwakarta.
                                </p>
                            </div>

                            <nav
                                aria-label="Navigasi footer"
                                className="space-y-3 text-lg font-bold text-red-100/85"
                            >
                                <a className="block transition hover:text-white" href="#tentang">
                                    Tentang
                                </a>
                                <a className="block transition hover:text-white" href="#visi-misi">
                                    Visi & Misi
                                </a>
                                <a className="block transition hover:text-white" href="#layanan">
                                    Layanan Anggota
                                </a>
                                <a className="block transition hover:text-white" href="#kontak">
                                    Kontak
                                </a>
                            </nav>

                            <div className="rounded-lg bg-[#151010] p-5 text-zinc-100 shadow-2xl shadow-red-950/20 md:p-6">
                                <h2 className="font-serif text-4xl font-black leading-tight text-zinc-100 md:text-5xl">
                                    Kontak
                                </h2>
                                <address className="mt-4 space-y-2.5 not-italic text-base font-semibold leading-7 text-zinc-300">
                                    <strong className="block text-lg text-white">
                                        {secretariatName}
                                    </strong>
                                    <p>{address}</p>
                                    <p>Telepon: {phone}</p>
                                    <p>WhatsApp: {whatsapp}</p>
                                    <p>Email: {email}</p>
                                    <p>Jam Pelayanan: {serviceHours}</p>
                                </address>
                                <div className="mt-5 flex flex-wrap gap-2.5">
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
                                    >
                                        Hubungi via WhatsApp
                                    </a>
                                    <a
                                        href={`mailto:${email}`}
                                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-800/70 bg-amber-950/30 px-4 py-2.5 text-sm font-black text-zinc-100 transition hover:border-red-400 hover:text-white"
                                    >
                                        Kirim Email
                                    </a>
                                    <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-800/70 bg-amber-950/30 px-4 py-2.5 text-sm font-black text-zinc-100 transition hover:border-red-400 hover:text-white"
                                    >
                                        Buka Lokasi
                                    </a>
                                </div>
                                {socialLinks.length ? (
                                    <div className="mt-4 flex gap-2.5">
                                        {socialLinks.map(([label, ariaLabel, url]) => (
                                            <a
                                                key={label}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={ariaLabel}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-100/20 text-[11px] font-black text-white transition hover:bg-white hover:text-[#151010]"
                                            >
                                                {label}
                                            </a>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-12 border-t border-red-100/20 pt-8">
                            <div className="grid gap-6 text-xl font-semibold leading-relaxed text-red-100/85 lg:grid-cols-[0.9fr_1.1fr]">
                                <p>
                                    © {new Date().getFullYear()} Ikatan Dokter Indonesia Cabang
                                    Purwakarta. Seluruh hak cipta dilindungi.
                                </p>
                            </div>
                        </div>

                        <a
                            href="#beranda"
                            className="absolute bottom-8 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-700 text-white shadow-2xl transition hover:bg-red-600 md:right-10"
                            aria-label="Kembali ke atas"
                        >
                            <UpOutlined />
                        </a>
                    </div>
                </footer>
            </main>
        </>
    );
}
