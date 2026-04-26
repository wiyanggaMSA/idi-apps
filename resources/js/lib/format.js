import dayjs from "dayjs";

export function formatIDR(value) {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(value || 0);
    } catch {
        return `Rp ${String(value || 0)}`;
    }
}

export function formatDate(value, fallback = "-") {
    if (!value) return fallback;
    return dayjs(value).format("DD MMM YYYY");
}

export function formatDateTime(value, fallback = "-") {
    if (!value) return fallback;
    return dayjs(value).format("DD MMM YYYY HH:mm");
}

export function formatMonth(value, fallback = "-") {
    if (!value) return fallback;
    return dayjs(`${value}-01`).format("MMMM YYYY");
}

export function formatMonthCompact(value, fallback = "-") {
    if (!value) return fallback;
    return dayjs(`${value}-01`).format("YYYY-MM");
}
