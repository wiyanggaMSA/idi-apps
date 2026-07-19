import dayjs from "dayjs";

function compactDate(value) {
    return dayjs(value).format("YYYYMMDD");
}

function compactDateTime(value) {
    return dayjs(value).format("YYYYMMDDTHHmmss");
}

function normalizeEnd(start, end, allDay) {
    const parsedStart = dayjs(start);
    const parsedEnd = end ? dayjs(end) : null;

    if (parsedEnd?.isValid() && (parsedEnd.isAfter(parsedStart) || (allDay && parsedEnd.isSame(parsedStart, "day")))) {
        return parsedEnd;
    }

    return allDay ? parsedStart : parsedStart.add(1, "hour");
}

export function buildGoogleCalendarUrl({ title, start, end, location, details, allDay = false }) {
    if (!title || !start) return null;

    const parsedStart = dayjs(start);
    if (!parsedStart.isValid()) return null;

    const parsedEnd = normalizeEnd(parsedStart, end, allDay);
    const dates = allDay
        ? `${compactDate(parsedStart)}/${compactDate(parsedEnd.add(1, "day"))}`
        : `${compactDateTime(parsedStart)}/${compactDateTime(parsedEnd)}`;

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates,
    });

    if (location) params.set("location", location);
    if (details) params.set("details", details);

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function canAddCalendarEvent({ start, status, allowedStatuses }) {
    if (!start) return false;
    if (!allowedStatuses?.length) return true;

    return allowedStatuses.includes(status);
}
