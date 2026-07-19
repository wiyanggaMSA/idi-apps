import React, { useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import {
    BellOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    MoreOutlined,
    PlusOutlined,
    ProjectOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Drawer,
    Dropdown,
    Form,
    Input,
    InputNumber,
    Modal,
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
import SearchInput from "@/Components/App/SearchInput";
import StatCard from "@/Components/App/StatCard";
import DataTable from "@/Components/App/DataTable";
import { formatDate, formatIDR } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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

const NATURE_LABELS = {
    routine: "Rutin",
    incidental: "Insidental",
    strategic: "Strategis",
    collaborative: "Kolaboratif",
};

const SOURCE_LABELS = {
    field_proposal: "Usulan Bidang",
    organizational_mandate: "Mandat Organisasi",
    work_meeting_result: "Hasil Rapat Kerja",
    evaluation_follow_up: "Tindak Lanjut Evaluasi",
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

function buildQuery(filters) {
    const params = { ...filters };

    if (filters.range?.length === 2) {
        params.start_date = filters.range[0]?.format("YYYY-MM-DD");
        params.end_date = filters.range[1]?.format("YYYY-MM-DD");
    }

    delete params.range;
    return compactParams(params);
}

function statusTag(status, labels = STATUS_LABELS) {
    return <Tag color={STATUS_COLORS[status] || "default"}>{labels[status] || status || "-"}</Tag>;
}

function priorityTag(priority, labels = PRIORITY_LABELS) {
    return <Tag color={PRIORITY_COLORS[priority] || "default"}>{labels[priority] || priority || "-"}</Tag>;
}

function toDate(value) {
    return value ? dayjs(value) : null;
}

function formPayload(values) {
    return compactParams({
        ...values,
        planned_start_date: values.planned_start_date?.format("YYYY-MM-DD"),
        planned_end_date: values.planned_end_date?.format("YYYY-MM-DD"),
        actual_start_date: values.actual_start_date?.format("YYYY-MM-DD"),
        actual_end_date: values.actual_end_date?.format("YYYY-MM-DD"),
    });
}

function optionLabel(options, value, fallback = "-") {
    return options.find((option) => option.value === value)?.label || fallback;
}

function ProgramFormDrawer({ open, editing, options, onClose }) {
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const { props } = usePage();
    const [processing, setProcessing] = useState(false);
    const errors = props.errors || {};

    const periodOptions = (options?.periods || []).map((period) => ({
        value: period.id,
        label: `${period.name} (${period.code})`,
    }));
    const divisionOptions = (options?.divisions || []).map((division) => ({
        value: division.id,
        label: `${division.name}${division.code ? ` (${division.code})` : ""}`,
    }));
    const userOptions = (options?.users || []).map((user) => ({
        value: user.id,
        label: `${user.name}${user.email ? ` - ${user.email}` : ""}`,
    }));
    const priorityOptions = (options?.priorities || []).map((value) => ({
        value,
        label: ({ low: tx("Rendah", "Low"), medium: tx("Sedang", "Medium"), high: tx("Tinggi", "High"), critical: tx("Kritis", "Critical") })[value] || value,
    }));
    const natureOptions = (options?.natures || []).map((value) => ({
        value,
        label: ({ routine: tx("Rutin", "Routine"), incidental: tx("Insidental", "Incidental"), strategic: tx("Strategis", "Strategic"), collaborative: tx("Kolaboratif", "Collaborative") })[value] || value,
    }));
    const sourceOptions = (options?.sources || []).map((value) => ({
        value,
        label: ({ field_proposal: tx("Usulan Bidang", "Division Proposal"), organizational_mandate: tx("Mandat Organisasi", "Organization Mandate"), work_meeting_result: tx("Hasil Rapat Kerja", "Work Meeting Result"), evaluation_follow_up: tx("Tindak Lanjut Evaluasi", "Evaluation Follow-up") })[value] || value,
    }));

    React.useEffect(() => {
        if (!open) return;

        const timer = window.setTimeout(() => {
            if (editing) {
                form.resetFields();
                form.setFieldsValue({
                    program_code: editing.program_code || "",
                    name: editing.name,
                    work_program_period_id: editing.period?.id,
                    year: editing.year,
                    division_id: editing.division?.id,
                    category: editing.category,
                    type: editing.type,
                    nature: editing.nature,
                    source: editing.source,
                    priority: editing.priority,
                    planned_start_date: toDate(editing.planned_start_date),
                    planned_end_date: toDate(editing.planned_end_date),
                    estimated_budget: editing.estimated_budget,
                    realized_budget: editing.realized_budget,
                    budget_source: editing.budget_source,
                    primary_pic_user_id: editing.primary_pic?.id,
                    description: editing.description,
                    background: editing.background,
                    objectives: editing.objectives,
                    target_audience: editing.target_audience,
                    success_indicators: editing.success_indicators,
                    expected_output: editing.expected_output,
                    location: editing.location,
                    internal_notes: editing.internal_notes,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    year: dayjs().year(),
                    nature: "routine",
                    source: "field_proposal",
                    priority: "medium",
                });
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [editing, form, open]);

    const submit = async () => {
        const values = await form.validateFields();
        const payload = formPayload(values);

        setProcessing(true);
        const requestOptions = {
            preserveScroll: true,
            onSuccess: () => {
                if (!editing) {
                    form.resetFields();
                }
                onClose();
            },
            onFinish: () => setProcessing(false),
        };

        if (editing) {
            router.patch(route("work-programs.update", editing.id), payload, requestOptions);
        } else {
            router.post(route("work-programs.store"), payload, requestOptions);
        }
    };

    return (
        <Drawer
            title={editing ? tx("Edit Program Kerja", "Edit Work Program") : tx("Tambah Program Kerja", "Add Work Program")}
            size={920}
            open={open}
            forceRender
            onClose={() => {
                if (!processing) onClose();
            }}
            extra={
                <Space>
                    <Button onClick={onClose} disabled={processing}>
                        {tx("Batal", "Cancel")}
                    </Button>
                    <Button type="primary" onClick={submit} loading={processing}>
                        {tx("Simpan", "Save")}
                    </Button>
                </Space>
            }
        >
            {Object.keys(errors).length ? (
                <Alert
                    className="mb-4"
                    type="error"
                    showIcon
                    title={tx("Data belum bisa disimpan", "The data cannot be saved yet")}
                    description={tx("Periksa kembali kolom wajib dan aturan validasi dari server.", "Review the required fields and server validation rules.")}
                />
            ) : null}

            <Form layout="vertical" form={form}>
                <section className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {tx("Informasi Dasar", "Basic Information")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label={tx("Kode Program", "Program Code")} name="program_code" help={errors.program_code}>
                            <Input placeholder={tx("Opsional, otomatis jika dikosongkan", "Optional; generated automatically if left blank")} />
                        </Form.Item>
                        <Form.Item
                            label={tx("Nama Program", "Program Name")}
                            name="name"
                            validateStatus={errors.name ? "error" : undefined}
                            help={errors.name}
                            rules={[{ required: true, message: tx("Nama program wajib diisi.", "The program name is required.") }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label={tx("Periode", "Period")}
                            name="work_program_period_id"
                            validateStatus={errors.work_program_period_id ? "error" : undefined}
                            help={errors.work_program_period_id}
                            rules={[{ required: true, message: tx("Periode wajib dipilih.", "A period is required.") }]}
                        >
                            <Select showSearch optionFilterProp="label" options={periodOptions} />
                        </Form.Item>
                        <Form.Item
                            label={tx("Tahun", "Year")}
                            name="year"
                            validateStatus={errors.year ? "error" : undefined}
                            help={errors.year}
                            rules={[{ required: true, message: tx("Tahun wajib diisi.", "The year is required.") }]}
                        >
                            <InputNumber min={2000} max={2100} className="w-full" />
                        </Form.Item>
                        <Form.Item
                            label={tx("Bidang", "Division")}
                            name="division_id"
                            validateStatus={errors.division_id ? "error" : undefined}
                            help={errors.division_id}
                            rules={[{ required: true, message: tx("Bidang wajib dipilih.", "A division is required.") }]}
                        >
                            <Select showSearch optionFilterProp="label" options={divisionOptions} />
                        </Form.Item>
                        <Form.Item label={tx("PIC Utama", "Primary PIC")} name="primary_pic_user_id" help={errors.primary_pic_user_id}>
                            <Select allowClear showSearch optionFilterProp="label" options={userOptions} />
                        </Form.Item>
                        <Form.Item label={tx("Kategori", "Category")} name="category" help={errors.category}>
                            <Input />
                        </Form.Item>
                        <Form.Item label={tx("Tipe", "Type")} name="type" help={errors.type}>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label={tx("Sifat", "Nature")}
                            name="nature"
                            rules={[{ required: true, message: tx("Sifat program wajib dipilih.", "The program nature is required.") }]}
                        >
                            <Select options={natureOptions} />
                        </Form.Item>
                        <Form.Item
                            label={tx("Sumber", "Source")}
                            name="source"
                            rules={[{ required: true, message: tx("Sumber program wajib dipilih.", "The program source is required.") }]}
                        >
                            <Select options={sourceOptions} />
                        </Form.Item>
                        <Form.Item
                            label={tx("Prioritas", "Priority")}
                            name="priority"
                            rules={[{ required: true, message: tx("Prioritas wajib dipilih.", "A priority is required.") }]}
                        >
                            <Select options={priorityOptions} />
                        </Form.Item>
                        <Form.Item label={tx("Lokasi", "Location")} name="location" help={errors.location}>
                            <Input />
                        </Form.Item>
                    </div>
                </section>

                <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {tx("Tujuan dan Indikator", "Objectives and Indicators")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label={tx("Deskripsi", "Description")} name="description" help={errors.description}>
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item label={tx("Latar Belakang", "Background")} name="background" help={errors.background}>
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item label={tx("Tujuan", "Objectives")} name="objectives" help={errors.objectives}>
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item label={tx("Indikator Keberhasilan", "Success Indicators")} name="success_indicators" help={errors.success_indicators}>
                            <TextArea rows={4} />
                        </Form.Item>
                        <Form.Item label={tx("Sasaran", "Target Audience")} name="target_audience" help={errors.target_audience}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Output yang Diharapkan", "Expected Output")} name="expected_output" help={errors.expected_output}>
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                </section>

                <section className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {tx("Jadwal, Tim, Anggaran, Dokumen, Review", "Schedule, Team, Budget, Documents, Review")}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label={tx("Tanggal Mulai Rencana", "Planned Start Date")} name="planned_start_date" help={errors.planned_start_date}>
                            <DatePicker className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Tanggal Selesai Rencana", "Planned End Date")} name="planned_end_date" help={errors.planned_end_date}>
                            <DatePicker className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Estimasi Anggaran", "Estimated Budget")} name="estimated_budget" help={errors.estimated_budget}>
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label={tx("Realisasi Anggaran", "Actual Budget")} name="realized_budget" help={errors.realized_budget}>
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label={tx("Sumber Anggaran", "Budget Source")} name="budget_source" help={errors.budget_source}>
                            <Input />
                        </Form.Item>
                        <Form.Item label={tx("Catatan Internal", "Internal Notes")} name="internal_notes" help={errors.internal_notes}>
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                    <Paragraph className="mb-0 text-xs text-zinc-500">
                        {tx("Tugas, dokumen, risiko, dan evaluasi ditampilkan di detail program. Aksi pengelolaannya mengikuti tahap modul berikutnya.", "Tasks, documents, risks, and evaluations are shown in the program details. Their management actions follow the next module stage.")}
                    </Paragraph>
                </section>
            </Form>
        </Drawer>
    );
}

export default function WorkProgramsIndex() {
    const { tx } = useBilingual();
    const statusLabels = { draft: tx("Draf", "Draft"), submitted: tx("Diajukan", "Submitted"), under_review: tx("Direview", "Under Review"), revision_requested: tx("Revisi", "Revision Requested"), approved: tx("Disetujui", "Approved"), rejected: tx("Ditolak", "Rejected"), scheduled: tx("Terjadwal", "Scheduled"), in_progress: tx("Berjalan", "In Progress"), on_hold: tx("Ditahan", "On Hold"), completed: tx("Selesai", "Completed"), cancelled: tx("Dibatalkan", "Cancelled"), evaluated: tx("Dievaluasi", "Evaluated"), archived: tx("Diarsipkan", "Archived") };
    const priorityLabels = { low: tx("Rendah", "Low"), medium: tx("Sedang", "Medium"), high: tx("Tinggi", "High"), critical: tx("Kritis", "Critical") };
    const { props } = usePage();
    const programs = props.programs || {};
    const options = props.options || {};
    const dashboard = props.dashboard || {};
    const notifications = props.notifications || [];
    const permissions = props.auth?.permissions || [];
    const canCreate = permissions.includes("work_program.create");
    const canUpdate = permissions.includes("work_program.update");
    const canDelete = permissions.includes("work_program.delete");

    const [filters, setFilters] = useState({
        search: props.filters?.search || "",
        year: props.filters?.year || "",
        period_id: props.filters?.period_id || "",
        division_id: props.filters?.division_id || "",
        status: props.filters?.status || "",
        priority: props.filters?.priority || "",
        pic_user_id: props.filters?.pic_user_id || "",
        category: props.filters?.category || "",
        range:
            props.filters?.start_date && props.filters?.end_date
                ? [dayjs(props.filters.start_date), dayjs(props.filters.end_date)]
                : [],
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [processingDelete, setProcessingDelete] = useState(false);

    const data = programs?.data || [];
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

    const applyFilters = () => {
        router.get(route("work-programs.index"), buildQuery(filters), {
            replace: true,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        setFilters({
            search: "",
            year: "",
            period_id: "",
            division_id: "",
            status: "",
            priority: "",
            pic_user_id: "",
            category: "",
            range: [],
        });
        router.get(route("work-programs.index"), {}, { replace: true });
    };

    const openCreate = () => {
        setEditing(null);
        setDrawerOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        setDrawerOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) return;

        setProcessingDelete(true);
        router.delete(route("work-programs.destroy", deleting.id), {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
            onFinish: () => setProcessingDelete(false),
        });
    };

    const columns = useMemo(
        () => [
            {
                title: tx("Kode", "Code"),
                dataIndex: "program_code",
                key: "program_code",
                sorter: true,
                width: 150,
                render: (value, row) => (
                    <Link className="font-semibold text-red-700" href={route("work-programs.show", row.id)}>
                        {value || `PRG-${row.id}`}
                    </Link>
                ),
            },
            {
                title: tx("Nama", "Name"),
                dataIndex: "name",
                key: "name",
                sorter: true,
                width: 260,
                render: (value, row) => (
                    <div>
                        <div className="font-semibold text-zinc-950">{value}</div>
                        <div className="text-xs text-zinc-500">
                            {row.category || "-"} {row.type ? `/${row.type}` : ""}
                        </div>
                    </div>
                ),
            },
            {
                title: tx("Bidang", "Division"),
                dataIndex: ["division", "name"],
                key: "division",
                width: 180,
                render: (_, row) => row.division?.name || "-",
            },
            {
                title: tx("Periode", "Period"),
                dataIndex: ["period", "name"],
                key: "period",
                width: 170,
                render: (_, row) => row.period?.name || row.year || "-",
            },
            {
                title: tx("Tanggal", "Date"),
                key: "planned_start_date",
                dataIndex: "planned_start_date",
                sorter: true,
                width: 190,
                render: (_, row) => (
                    <span>
                        {formatDate(row.planned_start_date)} - {formatDate(row.planned_end_date)}
                    </span>
                ),
            },
            {
                title: "PIC",
                key: "primary_pic",
                width: 170,
                render: (_, row) => row.primary_pic?.name || <Text type="secondary">{tx("Belum ada", "Not assigned")}</Text>,
            },
            {
                title: tx("Progres", "Progress"),
                dataIndex: "progress",
                key: "progress",
                width: 150,
                render: (value) => <Progress percent={value || 0} size="small" />,
            },
            {
                title: tx("Status", "Status"),
                dataIndex: "status",
                key: "status",
                sorter: true,
                width: 145,
                render: (value) => statusTag(value, statusLabels),
            },
            {
                title: tx("Prioritas", "Priority"),
                dataIndex: "priority",
                key: "priority",
                sorter: true,
                width: 130,
                render: (value) => priorityTag(value, priorityLabels),
            },
            {
                title: tx("Anggaran", "Budget"),
                dataIndex: "estimated_budget",
                key: "estimated_budget",
                sorter: true,
                align: "right",
                width: 160,
                render: (value) => formatIDR(value),
            },
            {
                title: tx("Aksi", "Actions"),
                key: "actions",
                align: "right",
                width: 95,
                render: (_, row) => {
                    const canEditRow = canUpdate && ["draft", "revision_requested"].includes(row.status);
                    const canDeleteRow = canDelete && row.status === "draft";
                    const items = [
                        {
                            key: "view",
                            icon: <EyeOutlined />,
                            label: <Link href={route("work-programs.show", row.id)}>{tx("Detail", "Details")}</Link>,
                        },
                        {
                            key: "edit",
                            icon: <EditOutlined />,
                            label: tx("Edit", "Edit"),
                            disabled: !canEditRow,
                            onClick: () => openEdit(row),
                        },
                        {
                            key: "delete",
                            icon: <DeleteOutlined />,
                            label: tx("Hapus draf", "Delete draft"),
                            danger: true,
                            disabled: !canDeleteRow,
                            onClick: () => setDeleting(row),
                        },
                    ];

                    return (
                        <Dropdown menu={{ items }} trigger={["click"]}>
                            <Button size="small" icon={<MoreOutlined />} />
                        </Dropdown>
                    );
                },
            },
        ],
        [canDelete, canUpdate, tx],
    );

    return (
        <AppLayout title={tx("Program Kerja", "Work Programs")}>
            <PageShell>
                <PageHeader
                    eyebrow={tx("Program Kerja", "Work Programs")}
                    title={tx("Dashboard Program Kerja", "Work Program Dashboard")}
                    description={tx("Pantau daftar program, status persetujuan, tenggat, progres, dan anggaran dari data backend.", "Monitor programs, approval status, deadlines, progress, and budgets from backend data.")}
                    extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!canCreate}>
                            {tx("Tambah Program", "Add Program")}
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard title={tx("Total Program", "Total Programs")} value={dashboard.total || 0} hint={tx("Semua program terlihat", "All visible programs")} icon={<ProjectOutlined />} tone="primary" />
                    <StatCard title={tx("Draf", "Draft")} value={dashboard.draft || 0} hint={tx("Belum diajukan", "Not submitted")} tone="neutral" />
                    <StatCard title={tx("Menunggu Persetujuan", "Pending Approval")} value={dashboard.pending_approval || 0} hint={tx("Diajukan dan direview", "Submitted and under review")} tone="info" />
                    <StatCard title={tx("Revisi", "Revision")} value={dashboard.revision_requested || 0} hint={tx("Perlu perbaikan", "Needs improvement")} tone="warning" />
                    <StatCard title={tx("Disetujui", "Approved")} value={dashboard.approved || 0} hint={tx("Siap dijadwalkan", "Ready to schedule")} tone="success" />
                    <StatCard title={tx("Berjalan", "In Progress")} value={dashboard.in_progress || 0} hint={tx("Sedang berjalan", "Currently running")} tone="dark" />
                    <StatCard title={tx("Selesai", "Completed")} value={dashboard.completed || 0} hint={tx("Selesai/evaluasi", "Completed/evaluated")} tone="success" />
                    <StatCard title={tx("Terlambat", "Overdue")} value={dashboard.overdue || 0} hint={tx("Lewat tenggat", "Past deadline")} tone="danger" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_280px]">
                    <Card title={tx("Antrean Persetujuan", "Approval Queue")}>
                        {(dashboard.approval_queue || []).length ? (
                            <Space orientation="vertical" className="w-full">
                                {dashboard.approval_queue.map((program) => (
                                    <Link key={program.id} href={route("work-programs.show", program.id)} className="block rounded-xl border border-zinc-200 px-3 py-2 hover:border-red-200 hover:bg-red-50">
                                        <div className="font-semibold text-zinc-950">{program.name}</div>
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                                            <span>{program.program_code || `PRG-${program.id}`}</span>
                                            {statusTag(program.status, statusLabels)}
                                        </div>
                                    </Link>
                                ))}
                            </Space>
                        ) : (
                            <Text type="secondary">{tx("Tidak ada antrean persetujuan.", "There is no approval queue.")}</Text>
                        )}
                    </Card>
                    <Card title={tx("Tenggat Mendatang", "Upcoming Deadlines")}>
                        {(dashboard.upcoming_deadlines || []).length ? (
                            <Space orientation="vertical" className="w-full">
                                {dashboard.upcoming_deadlines.map((program) => (
                                    <Link key={program.id} href={route("work-programs.show", program.id)} className="block rounded-xl border border-zinc-200 px-3 py-2 hover:border-red-200 hover:bg-red-50">
                                        <div className="font-semibold text-zinc-950">{program.name}</div>
                                        <div className="mt-1 text-xs text-zinc-500">
                                            {formatDate(program.planned_end_date)} · {program.division?.name || "-"}
                                        </div>
                                    </Link>
                                ))}
                            </Space>
                        ) : (
                            <Text type="secondary">{tx("Belum ada tenggat dalam 14 hari.", "No deadlines in the next 14 days.")}</Text>
                        )}
                    </Card>
                    <Card title={tx("Notifikasi", "Notifications")}>
                        {notifications.length ? (
                            <Space orientation="vertical" className="w-full">
                                {notifications.map((notification) => (
                                    <Link
                                        key={notification.id}
                                        href={notification.program?.id ? route("work-programs.show", notification.program.id) : route("work-programs.index")}
                                        className="block rounded-xl border border-zinc-200 px-3 py-2 hover:border-red-200 hover:bg-red-50"
                                    >
                                        <div className="flex items-start gap-2">
                                            <BellOutlined className="mt-1 text-red-600" />
                                            <div className="min-w-0">
                                                <div className="truncate font-semibold text-zinc-950">{notification.title}</div>
                                                <div className="line-clamp-2 text-xs text-zinc-500">{notification.message}</div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </Space>
                        ) : (
                            <Text type="secondary">{tx("Belum ada notifikasi program kerja.", "No work program notifications yet.")}</Text>
                        )}
                    </Card>
                    <Card title={tx("Ringkasan Progres", "Progress Summary")}>
                        <Progress type="dashboard" percent={dashboard.progress_average || 0} />
                        <Paragraph className="mb-0 mt-3 text-sm text-zinc-500">
                            {tx("Rata-rata progres dihitung dari tugas yang sudah tersimpan.", "Average progress is calculated from saved tasks.")}
                        </Paragraph>
                    </Card>
                </div>

                <FilterBar>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Cari", "Search")}</p>
                        <SearchInput value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder={tx("Kode, nama, kategori", "Code, name, category")} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Status", "Status")}</p>
                        <Select allowClear value={filters.status || undefined} onChange={(value) => setFilters((prev) => ({ ...prev, status: value || "" }))} style={{ width: 170 }} options={statusOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Prioritas", "Priority")}</p>
                        <Select allowClear value={filters.priority || undefined} onChange={(value) => setFilters((prev) => ({ ...prev, priority: value || "" }))} style={{ width: 150 }} options={priorityOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Bidang", "Division")}</p>
                        <Select allowClear showSearch optionFilterProp="label" value={filters.division_id || undefined} onChange={(value) => setFilters((prev) => ({ ...prev, division_id: value || "" }))} style={{ width: 210 }} options={divisionOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Periode", "Period")}</p>
                        <Select allowClear showSearch optionFilterProp="label" value={filters.period_id || undefined} onChange={(value) => setFilters((prev) => ({ ...prev, period_id: value || "" }))} style={{ width: 210 }} options={periodOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">PIC</p>
                        <Select allowClear showSearch optionFilterProp="label" value={filters.pic_user_id || undefined} onChange={(value) => setFilters((prev) => ({ ...prev, pic_user_id: value || "" }))} style={{ width: 180 }} options={userOptions} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Tanggal", "Date")}</p>
                        <RangePicker value={filters.range} onChange={(value) => setFilters((prev) => ({ ...prev, range: value || [] }))} />
                    </div>
                    <Button type="primary" icon={<FilterOutlined />} onClick={applyFilters}>
                        {tx("Terapkan", "Apply")}
                    </Button>
                    <Button onClick={resetFilters}>{tx("Atur Ulang", "Reset")}</Button>
                </FilterBar>

                <Card title={tx("Daftar Program", "Program List")}>
                    <DataTable
                        columns={columns}
                        dataSource={data}
                        rowKey="id"
                        loading={props.loading}
                        emptyTitle={tx("Belum ada program kerja", "No work programs yet")}
                        emptyDescription={tx("Program yang dibuat dari form akan tampil di sini.", "Programs created from the form will appear here.")}
                        pagination={{
                            current: programs.current_page || 1,
                            pageSize: programs.per_page || 15,
                            total: programs.total || 0,
                            showSizeChanger: true,
                        }}
                        onChange={(pagination, _tableFilters, sorter) => {
                            const sortBy = sorter?.field || sorter?.columnKey || props.filters?.sortBy || "created_at";
                            const sortDir =
                                sorter?.order === "ascend"
                                    ? "asc"
                                    : sorter?.order === "descend"
                                      ? "desc"
                                      : props.filters?.sortDir || "desc";
                            router.get(
                                route("work-programs.index"),
                                {
                                    ...buildQuery(filters),
                                    page: pagination.current,
                                    perPage: pagination.pageSize,
                                    sortBy,
                                    sortDir,
                                },
                                { preserveState: true, preserveScroll: true, replace: true },
                            );
                        }}
                    />
                </Card>
            </PageShell>

            <ProgramFormDrawer
                open={drawerOpen}
                editing={editing}
                options={options}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditing(null);
                }}
            />

            <Modal
                title={tx("Hapus draf program kerja?", "Delete work program draft?")}
                open={Boolean(deleting)}
                onCancel={() => {
                    if (!processingDelete) setDeleting(null);
                }}
                onOk={confirmDelete}
                okText={tx("Hapus", "Delete")}
                okButtonProps={{ danger: true, loading: processingDelete }}
                cancelButtonProps={{ disabled: processingDelete }}
            >
                <Paragraph className="mb-0">
                    {tx("Draf", "Draft")} <strong>{deleting?.name}</strong> {tx("akan dihapus. Program non-draf tidak dapat dihapus dari aksi ini.", "will be deleted. Non-draft programs cannot be deleted using this action.")}
                </Paragraph>
            </Modal>
        </AppLayout>
    );
}
