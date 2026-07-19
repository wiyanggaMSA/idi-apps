export default function AppFooter({ className = "" }) {
    const year = new Date().getFullYear();

    return (
        <footer
            className={`border-t border-zinc-200/80 bg-white/90 px-4 py-2 text-center text-[11px] leading-4 text-zinc-500 shadow-[0_-8px_24px_-22px_rgba(15,23,42,0.35)] backdrop-blur ${className}`}
        >
            <p>
                <span className="font-semibold text-zinc-600">IDI Apps</span>
                <span className="mx-1.5 text-zinc-300">|</span>
                &copy; {year} PT. Digisolve Catalyst Nusantara. All rights reserved.
            </p>
        </footer>
    );
}
