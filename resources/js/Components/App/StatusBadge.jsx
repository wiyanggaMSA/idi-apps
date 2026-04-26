import React from "react";
import { Tag } from "antd";

const STATUS_MAP = {
    paid: { color: "green", label: "Paid" },
    unpaid: { color: "default", label: "Unpaid" },
    overdue: { color: "red", label: "Overdue" },
    pending: { color: "gold", label: "Pending" },
    active: { color: "blue", label: "Active" },
    inactive: { color: "default", label: "Inactive" },
    lunas: { color: "green", label: "Lunas" },
    menunggak: { color: "red", label: "Menunggak" },
    advance: { color: "blue", label: "Lebih Bayar" },
    void: { color: "red", label: "Void" },
};

export default function StatusBadge({ status, label, color }) {
    const key = String(status || "").toLowerCase();
    const preset = STATUS_MAP[key];

    return (
        <Tag color={color || preset?.color || "default"} className="idi-status-badge">
            {label || preset?.label || status || "-"}
        </Tag>
    );
}
