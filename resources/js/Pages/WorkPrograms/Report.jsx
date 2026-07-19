import React, { useMemo, useState } from "react";
import { Link, router } from "@inertiajs/react";
import {
    DownloadOutlined,
    FileExcelOutlined,
    FilePdfOutlined,
    FilterOutlined,
    PrinterOutlined,
    ProjectOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import {
    Button,
    Card,
    Input,
    InputNumber,
    Progress,
    Select,
    Space,
    Tag,
    Typography,
} from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import FilterBar from "@/Components/App/FilterBar";
import StatCard from "@/Components/App/StatCard";
import DataTable from "@/Components/App/DataTable";
import { formatDate, formatIDR } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

const { Text } = Typography;

const STATUS_LABELS = {
    draft: "Draft",
    submitted: "Diajukan",
    under_review: "Direview",
    revision_requested: "Revisi",
    approved: "Disetujui",
    rejected: "Ditolak",
    scheduled: "Terjadwal",
    in_progress: "Berjalan",
    on_hold: "Ditahan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    evaluated: "Dievaluasi",
    archived: "Diarsipkan",
};

const STATUS_COLORS = {
    draft: "default",
    submitted: "blue",
    under_review: "geekblue",
    revision_requested: "gold",
    approved: "green",
    rejected: "red",
    scheduled: "cyan",
    in_progress: "processing",
    on_hold: "orange",
    completed: "success",
    cancelled: "volcano",
    evaluated: "purple",
    archived: "default",
};

const PRIORITY_LABELS = {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
    critical: "Kritis",
};

const PRIORITY_COLORS = {
    low: "default",
    medium: "blue",
    high: "orange",
    critical: "red",
};

function compactParams(params) {
    const cleaned = { ...params };
    Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === "" || cleaned[key] === null || cleaned[key] === undefined) {
            delete cleaned[key];
        }
    });

    return cleaned;
}

function exportUrl(format, filters) {
    const params = new URLSearchParams(compactParams({ ...filters, format }));
    return `${route("work-programs.report.export")}?${params.toString()}`;
}

function printUrl(filters) {
    const params = new URLSearchParams(compactParams(filters));
    return `${route("work-programs.report.print")}?${params.toString()}`;
}

function statusTag(status, labels) {
    return <Tag color={STATUS_COLORS[status] || "default"}>{labels[status] || status || "-"}</Tag>;
}

function priorityTag(priority, labels) {
    return <Tag color={PRIORITY_COLORS[priority] || "default"}>{labels[priority] || priority || "-"}</Tag>;
}

export default function Report({ rows = [], summary = {}, filters = {}, options = {}, canExport = false }) {
    const { tx } = useBilingual();
    const statusLabels = {
        draft: tx("Draf", "Draft"), submitted: tx("Diajukan", "Submitted"), under_review: tx("Direview", "Under Review"), revision_requested: tx("Revisi", "Revision Requested"), approved: tx("Disetujui", "Approved"), rejected: tx("Ditolak", "Rejected"), scheduled: tx("Terjadwal", "Scheduled"), in_progress: tx("Berjalan", "In Progress"), on_hold: tx("Ditahan", "On Hold"), completed: tx("Selesai", "Completed"), cancelled: tx("Dibatalkan", "Cancelled"), evaluated: tx("Dievaluasi", "Evaluated"), archived: tx("Diarsipkan", "Archived"),
    };
    const priorityLabels = { low: tx("Rendah", "Low"), medium: tx("Sedang", "Medium"), high: tx("Tinggi", "High"), critical: tx("Kritis", "Critical") };
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || "",
        year: filters.year || "",
        period_id: filters.period_id ? Number(filters.period_id) : undefined,
        division_id: filters.division_id ? Number(filters.division_id) : undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        pic_user_id: filters.pic_user_id ? Number(filters.pic_user_id) : undefined,
        progress_min: filters.progress_min ? Number(filters.progress_min) : undefined,
        progress_max: filters.progress_max ? Number(filters.progress_max) : undefined,
        overdue: filters.overdue || undefined,
        budget_min: filters.budget_min ? Number(filters.budget_min) : undefined,
        budget_max: filters.budget_max ? Number(filters.budget_max) : undefined,
    });

    const periodOptions = (options.periods || []).map((period) => ({
        value: period.id,
        label: `${period.name} (${period.code})`,
    }));
    const divisionOptions = (options.divisions || []).map((division) => ({
        value: division.id,
        label: division.name,
    }));
    const userOptions = (options.users || []).map((user) => ({
        value: user.id,
        label: user.name,
    }));
    const statusOptions = (options.statuses || []).map((value) => ({
        value,
        label: statusLabels[value] || value,
    }));
    const priorityOptions = (options.priorities || []).map((value) => ({
        value,
        label: priorityLabels[value] || value,
    }));

    const activeParams = compactParams(localFilters);

    const applyFilters = () => {
        router.get(route("work-programs.report"), activeParams, {
            replace: true,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        setLocalFilters({
            search: "",
            year: "",
            period_id: undefined,
            division_id: undefined,
            status: undefined,
            priority: undefined,
            pic_user_id: undefined,
            progress_min: undefined,
            progress_max: undefined,
            overdue: undefined,
            budget_min: undefined,
            budget_max: undefined,
        });
        router.get(route("work-programs.report"), {}, { replace: true });
    };

    const columns = useMemo(
        () => [
            {
                title: tx("Kode", "Code"),
                dataIndex: "program_code",
                key: "program_code",
                width: 145,
                render: (value, row) => (
                    <Link className="font-semibold text-red-700" href={route("work-programs.show", row.id)}>
                        {value || `PRG-${row.id}`}
                    </Link>
                ),
            },
            {
                title: tx("Program", "Program"),
                dataIndex: "name",
                key: "name",
                width: 260,
                render: (value, row) => (
                    <div>
                        <div className="font-semibold text-zinc-950">{value}</div>
                        <div className="text-xs text-zinc-500">{row.division || "-"} · {row.primary_pic || tx("PIC belum ada", "No PIC yet")}</div>
                    </div>
                ),
            },
            {
                title: tx("Periode", "Period"),
                key: "period",
                width: 150,
                render: (_, row) => row.period || row.year || "-",
            },
            {
                title: tx("Status", "Status"),
                dataIndex: "status",
                key: "status",
                width: 140,
                render: (value) => statusTag(value, statusLabels),
            },
            {
                title: tx("Prioritas", "Priority"),
                dataIndex: "priority",
                key: "priority",
                width: 130,
                render: (value) => priorityTag(value, priorityLabels),
            },
            {
                title: tx("Progres", "Progress"),
                dataIndex: "progress",
                key: "progress",
                width: 170,
                render: (value) => <Progress percent={value || 0} size="small" />,
            },
            {
                title: tx("Rencana", "Plan"),
                key: "planned",
                width: 190,
                render: (_, row) => (
                    <span>
                        {formatDate(row.planned_start_date)} - {formatDate(row.planned_end_date)}
                    </span>
                ),
            },
            {
                title: tx("Terlambat", "Overdue"),
                dataIndex: "overdue",
                key: "overdue",
                width: 120,
                render: (value) => <Tag color={value ? "red" : "green"}>{value ? tx("Ya", "Yes") : tx("Tidak", "No")}</Tag>,
            },
            {
                title: tx("Anggaran", "Budget"),
                key: "budget",
                align: "right",
                width: 190,
                render: (_, row) => (
                    <div>
                        <div>{formatIDR(row.estimated_budget)}</div>
                        <Text type="secondary" className="text-xs">{tx("Real.", "Actual")} {formatIDR(row.realized_budget)}</Text>
                    </div>
                ),
            },
            {
                title: tx("Tugas", "Tasks"),
                key: "tasks",
                width: 110,
                render: (_, row) => `${row.task_completed || 0}/${row.task_total || 0}`,
            },
        ],
        [tx],
    );

    return (
        <AppLayout title={tx("Laporan Program Kerja", "Work Program Report")}>
            <PageShell>
                <PageHeader
                    eyebrow={tx("Program Kerja", "Work Programs")}
                    title={tx("Laporan Program Kerja", "Work Program Report")}
                    description={tx("Filter laporan, tinjau cakupan data yang berhak dilihat, lalu ekspor sesuai filter aktif.", "Filter the report, review the data within your access scope, then export using the active filters.")}
                    extra={
                        <Space wrap>
                            <Button icon={<ProjectOutlined />} href={route("work-programs.index")}>
                                {tx("Daftar Program", "Program List")}
                            </Button>
                            <Button icon={<PrinterOutlined />} href={printUrl(activeParams)} target="_blank" disabled={!canExport}>
                                {tx("Cetak", "Print")}
                            </Button>
                            <Button icon={<FilePdfOutlined />} href={exportUrl("pdf", activeParams)} disabled={!canExport}>
                                PDF
                            </Button>
                            <Button icon={<DownloadOutlined />} href={exportUrl("csv", activeParams)} disabled={!canExport}>
                                CSV
                            </Button>
                            <Button type="primary" icon={<FileExcelOutlined />} href={exportUrl("xlsx", activeParams)} disabled={!canExport}>
                                Excel
                            </Button>
                        </Space>
                    }
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard title={tx("Total Program", "Total Programs")} value={summary.total || 0} hint={tx("Dalam filter aktif", "Within active filters")} tone="primary" />
                    <StatCard title={tx("Terlambat", "Overdue")} value={summary.overdue || 0} hint={tx("Belum terminal", "Not in a terminal state")} tone="danger" />
                    <StatCard title={tx("Rata-rata Progres", "Average Progress")} value={`${summary.average_progress || 0}%`} hint={tx("Berbasis tugas", "Task-based")} tone="info" />
                    <StatCard title={tx("Estimasi Anggaran", "Estimated Budget")} value={formatIDR(summary.estimated_budget || 0)} hint={tx("Total filter", "Filtered total")} tone="success" />
                    <StatCard title={tx("Realisasi Anggaran", "Actual Budget")} value={formatIDR(summary.realized_budget || 0)} hint={tx("Total filter", "Filtered total")} tone="dark" />
                </div>

                <FilterBar>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Cari", "Search")}</p>
                        <Input value={localFilters.search} onChange={(event) => setLocalFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder={tx("Kode atau nama program", "Program code or name")} style={{ width: 230 }} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Tahun", "Year")}</p>
                        <InputNumber value={localFilters.year || undefined} onChange={(value) => setLocalFilters((prev) => ({ ...prev, year: value || "" }))} min={2000} max={2100} style={{ width: 120 }} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Periode", "Period")}</p>
                        <Select allowClear showSearch optionFilterProp="label" value={localFilters.period_id} onChange={(value) => setLocalFilters((prev) => ({ ...prev, period_id: value }))} style={{ width: 210 }} options={periodOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Bidang", "Division")}</p>
                        <Select allowClear showSearch optionFilterProp="label" value={localFilters.division_id} onChange={(value) => setLocalFilters((prev) => ({ ...prev, division_id: value }))} style={{ width: 210 }} options={divisionOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Status", "Status")}</p>
                        <Select allowClear value={localFilters.status} onChange={(value) => setLocalFilters((prev) => ({ ...prev, status: value }))} style={{ width: 170 }} options={statusOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Prioritas", "Priority")}</p>
                        <Select allowClear value={localFilters.priority} onChange={(value) => setLocalFilters((prev) => ({ ...prev, priority: value }))} style={{ width: 150 }} options={priorityOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">PIC</p>
                        <Select allowClear showSearch optionFilterProp="label" value={localFilters.pic_user_id} onChange={(value) => setLocalFilters((prev) => ({ ...prev, pic_user_id: value }))} style={{ width: 190 }} options={userOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Progres", "Progress")}</p>
                        <Space.Compact>
                            <InputNumber value={localFilters.progress_min} onChange={(value) => setLocalFilters((prev) => ({ ...prev, progress_min: value }))} min={0} max={100} placeholder="Min" style={{ width: 82 }} />
                            <InputNumber value={localFilters.progress_max} onChange={(value) => setLocalFilters((prev) => ({ ...prev, progress_max: value }))} min={0} max={100} placeholder="Max" style={{ width: 82 }} />
                        </Space.Compact>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Terlambat", "Overdue")}</p>
                        <Select allowClear value={localFilters.overdue} onChange={(value) => setLocalFilters((prev) => ({ ...prev, overdue: value }))} style={{ width: 130 }} options={[{ value: "1", label: tx("Ya", "Yes") }, { value: "0", label: tx("Tidak", "No") }]} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Anggaran", "Budget")}</p>
                        <Space.Compact>
                            <InputNumber value={localFilters.budget_min} onChange={(value) => setLocalFilters((prev) => ({ ...prev, budget_min: value }))} min={0} placeholder="Min" style={{ width: 110 }} />
                            <InputNumber value={localFilters.budget_max} onChange={(value) => setLocalFilters((prev) => ({ ...prev, budget_max: value }))} min={0} placeholder="Max" style={{ width: 110 }} />
                        </Space.Compact>
                    </div>
                    <Button type="primary" icon={<FilterOutlined />} onClick={applyFilters}>
                        {tx("Terapkan", "Apply")}
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                        {tx("Atur Ulang", "Reset")}
                    </Button>
                </FilterBar>

                <Card title={tx("Hasil Laporan", "Report Results")}>
                    <DataTable
                        columns={columns}
                        dataSource={rows}
                        rowKey="id"
                        emptyTitle={tx("Tidak ada data laporan", "No report data")}
                        emptyDescription={tx("Ubah filter untuk melihat program kerja lain dalam cakupan akses Anda.", "Change the filters to view other work programs within your access scope.")}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                    />
                </Card>
            </PageShell>
        </AppLayout>
    );
}
