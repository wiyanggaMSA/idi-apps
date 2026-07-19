import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { EyeOutlined, HistoryOutlined, ReloadOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Pagination,
    Select,
    Skeleton,
    Space,
    Tag,
} from "antd";
import DataTable from "@/Components/App/DataTable";
import { formatDate } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

const STATUS_COLORS = {
    draft: "gold",
    published: "blue",
    active: "green",
    ended: "default",
    archived: "default",
};

function initials(name = "") {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || <UserOutlined />;
}

function actorName(actor) {
    return actor?.name || "—";
}

export default function OrganizationHistoryPanel({ selectedPeriod, onNavigate }) {
    const { tx } = useBilingual();
    const statusLabels = {
        draft: tx("Draf", "Draft"), published: tx("Dipublikasikan", "Published"),
        active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), archived: tx("Diarsipkan", "Archived"),
    };
    const assignmentStatus = {
        draft: tx("Draf", "Draft"), active: tx("Aktif", "Active"), replaced: tx("Diganti", "Replaced"),
        ended: tx("Berakhir", "Ended"), cancelled: tx("Dibatalkan", "Cancelled"),
    };
    const requestRef = useRef(null);
    const assignmentRequestRef = useRef(null);
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [periods, setPeriods] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, per_page: 12, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [assignmentMeta, setAssignmentMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [assignmentError, setAssignmentError] = useState(null);

    const loadPeriods = useCallback(() => {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError(null);

        axios.get(route("organization.periods.index"), {
            params: { status: status || undefined, page, per_page: 12 },
            signal: controller.signal,
        }).then((response) => {
            setPeriods(response.data?.data || []);
            setMeta(response.data?.meta || { current_page: page, per_page: 12, total: 0 });
        }).catch((requestError) => {
            if (requestError.code !== "ERR_CANCELED") setError(requestError.response?.data?.message || tx("Riwayat periode gagal dimuat.", "Period history could not be loaded."));
        }).finally(() => {
            if (requestRef.current === controller) {
                requestRef.current = null;
                if (!controller.signal.aborted) setLoading(false);
            }
        });
    }, [page, status]);

    useEffect(() => {
        loadPeriods();
        return () => requestRef.current?.abort();
    }, [loadPeriods]);

    const loadAssignments = useCallback((period, nextPage = 1, perPage = 15) => {
        if (!period?.id) return;
        assignmentRequestRef.current?.abort();
        const controller = new AbortController();
        assignmentRequestRef.current = controller;
        setAssignmentLoading(true);
        setAssignmentError(null);

        axios.get(route("organization.periods.assignments.index", period.id), {
            params: { page: nextPage, per_page: perPage, sort: "started_at", direction: "desc" },
            signal: controller.signal,
        }).then((response) => {
            setAssignments(response.data?.data || []);
            setAssignmentMeta(response.data?.meta || { current_page: nextPage, per_page: perPage, total: 0 });
        }).catch((requestError) => {
            if (requestError.code !== "ERR_CANCELED") setAssignmentError(requestError.response?.data?.message || tx("Perubahan pengurus gagal dimuat.", "Management changes could not be loaded."));
        }).finally(() => {
            if (assignmentRequestRef.current === controller) {
                assignmentRequestRef.current = null;
                if (!controller.signal.aborted) setAssignmentLoading(false);
            }
        });
    }, []);

    useEffect(() => () => assignmentRequestRef.current?.abort(), []);

    const openDetail = (period) => {
        setSelected(period);
        setAssignments([]);
        loadAssignments(period);
    };

    const columns = useMemo(() => [
        {
            title: tx("Anggota", "Member"),
            key: "member",
            width: 220,
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <Avatar className="bg-zinc-900">{initials(record.member?.full_name)}</Avatar>
                    <div>
                        <p className="font-semibold text-zinc-950">{record.member?.full_name || "—"}</p>
                        <p className="text-xs text-zinc-500">NPA {record.member?.npa || "—"}</p>
                    </div>
                </div>
            ),
        },
        { title: tx("Jabatan", "Position"), dataIndex: ["position", "title"], key: "position", width: 170, render: (value) => value || "—" },
        { title: tx("Unit", "Unit"), dataIndex: ["unit", "name"], key: "unit", width: 170, render: (value) => value || "—" },
        { title: tx("Mulai", "Start"), dataIndex: "started_at", key: "started_at", width: 120, render: formatDate },
        { title: tx("Selesai", "End"), dataIndex: "ended_at", key: "ended_at", width: 120, render: (value) => value ? formatDate(value) : "—" },
        { title: tx("Status Akhir", "Final Status"), dataIndex: "status", key: "status", width: 120, render: (value) => <Tag>{assignmentStatus[value] || value}</Tag> },
        { title: tx("Digantikan Oleh", "Replaced By"), key: "replacement", width: 190, render: (_, record) => record.replacement?.member?.full_name || "—" },
        { title: tx("Alasan", "Reason"), dataIndex: "end_reason", key: "reason", width: 220, render: (value) => value || "—" },
        { title: tx("Aktor", "Actor"), key: "actor", width: 160, render: (_, record) => actorName(record.ended_by_actor || record.updated_by_actor || record.created_by_actor) },
    ], [tx]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div>
                    <p className="font-semibold text-zinc-950">{tx("Riwayat Periode Kepengurusan", "Management Period History")}</p>
                    <p className="mt-1 text-sm text-zinc-500">{tx("Data berasal dari domain periode dan penugasan, dengan audit sebagai informasi tambahan.", "Data comes from the period and assignment domains, with audit records as supporting information.")}</p>
                </div>
                <div className="min-w-48">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{tx("Status periode", "Period status")}</p>
                    <Select
                        allowClear
                        className="w-full"
                        value={status || undefined}
                        placeholder={tx("Semua status", "All statuses")}
                        options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                        onChange={(value) => { setStatus(value || ""); setPage(1); }}
                    />
                </div>
            </div>

            {error ? <Alert type="error" showIcon message={tx("Riwayat gagal dimuat", "History could not be loaded")} description={error} action={<Button icon={<ReloadOutlined />} onClick={loadPeriods}>{tx("Coba Lagi", "Try Again")}</Button>} /> : null}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton.Node key={item} active className="!h-72 !w-full" />)}
                </div>
            ) : periods.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {periods.map((period) => (
                        <Card key={period.id} className={period.id === selectedPeriod?.id ? "border-red-300" : "border-zinc-200"}>
                            <div className="flex items-start justify-between gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white"><HistoryOutlined /></span>
                                <Tag color={STATUS_COLORS[period.status] || "default"}>{statusLabels[period.status] || period.status}</Tag>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-zinc-950">{period.name}</h3>
                            <p className="mt-1 text-sm text-zinc-500">{formatDate(period.start_date)} — {formatDate(period.end_date)}</p>
                            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-zinc-50 p-3">
                                <TeamOutlined className="text-red-700" />
                                <span className="font-medium text-zinc-900">{period.assignments_count || 0} {tx("penugasan", "assignments")}</span>
                                <span className="text-zinc-300">·</span>
                                <span className="text-sm text-zinc-600">{period.units_count || 0} unit</span>
                            </div>
                            <Descriptions className="mt-4" column={1} size="small">
                                <Descriptions.Item label={tx("Dibuat", "Created")}>{actorName(period.created_by)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Dipublikasikan", "Published")}>{actorName(period.published_by)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Diaktifkan", "Activated")}>{actorName(period.activated_by)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Diakhiri", "Ended")}>{actorName(period.ended_by)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Diperbarui", "Updated")}>{period.updated_at ? formatDate(period.updated_at) : "—"}</Descriptions.Item>
                            </Descriptions>
                            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
                                <Button onClick={() => onNavigate?.("structure", period.id)}>{tx("Lihat Periode", "View Period")}</Button>
                                <Button type="primary" icon={<EyeOutlined />} onClick={() => openDetail(period)}>{tx("Detail Riwayat", "History Details")}</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Belum ada periode pada status yang dipilih.", "No periods match the selected status.")} />}

            {!loading && meta.total > 0 ? (
                <div className="flex justify-end">
                    <Pagination current={meta.current_page || page} pageSize={meta.per_page || 12} total={meta.total || 0} showSizeChanger={false} onChange={setPage} />
                </div>
            ) : null}

            <Drawer
                title={`${tx("Detail Riwayat", "History Details")} · ${selected?.name || tx("Periode", "Period")}`}
                open={Boolean(selected)}
                onClose={() => { setSelected(null); assignmentRequestRef.current?.abort(); }}
                size="large"
                destroyOnHidden
            >
                {assignmentError ? <Alert className="mb-4" type="error" showIcon message={tx("Detail riwayat gagal dimuat", "History details could not be loaded")} description={assignmentError} action={<Button onClick={() => loadAssignments(selected)}>{tx("Coba Lagi", "Try Again")}</Button>} /> : null}
                <DataTable
                    columns={columns}
                    dataSource={assignments}
                    rowKey="id"
                    loading={assignmentLoading}
                    scroll={{ x: 1510 }}
                    emptyTitle={tx("Belum ada perubahan pengurus", "No management changes yet")}
                    emptyDescription={tx("Penugasan untuk periode ini belum tersedia.", "Assignments for this period are not available yet.")}
                    pagination={{
                        current: assignmentMeta.current_page || 1,
                        pageSize: assignmentMeta.per_page || 15,
                        total: assignmentMeta.total || 0,
                        showSizeChanger: true,
                        pageSizeOptions: [15, 30, 60],
                        showTotal: (total, range) => `${range[0]}–${range[1]} ${tx("dari", "of")} ${total} ${tx("penugasan", "assignments")}`,
                    }}
                    onChange={(pagination) => loadAssignments(selected, pagination.current, pagination.pageSize)}
                />
            </Drawer>
        </div>
    );
}
