import React, { useState } from "react";
import axios from "axios";
import { Link, router, usePage } from "@inertiajs/react";
import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    FilePdfOutlined,
    PrinterOutlined,
    ProjectOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    Descriptions,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Progress,
    Select,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Timeline,
    Typography,
} from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import DataTable from "@/Components/App/DataTable";
import AdministrationPanel from "@/Components/WorkPrograms/AdministrationPanel";
import GanttChart from "@/Components/WorkPrograms/GanttChart";
import MonitoringPanel from "@/Components/WorkPrograms/MonitoringPanel";
import { formatDate, formatDateTime, formatIDR } from "@/lib/format";
import { buildGoogleCalendarUrl, canAddCalendarEvent } from "@/lib/googleCalendar";

const { Paragraph, Text } = Typography;
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
    todo: "Belum Mulai",
    blocked: "Terhambat",
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
    todo: "default",
    blocked: "red",
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

function statusTag(status) {
    return <Tag color={STATUS_COLORS[status] || "default"}>{STATUS_LABELS[status] || status || "-"}</Tag>;
}

function priorityTag(priority) {
    return <Tag color={PRIORITY_COLORS[priority] || "default"}>{PRIORITY_LABELS[priority] || priority || "-"}</Tag>;
}

function textOrDash(value) {
    return value || <Text type="secondary">-</Text>;
}

function programCalendarUrl(program) {
    if (!canAddCalendarEvent({
        start: program?.planned_start_date,
        status: program?.status,
        allowedStatuses: ["scheduled", "in_progress"],
    })) {
        return null;
    }

    return buildGoogleCalendarUrl({
        title: `Program Kerja: ${program.name}`,
        start: program.planned_start_date,
        end: program.planned_end_date,
        allDay: true,
        location: program.location,
        details: [
            program.program_code ? `Kode: ${program.program_code}` : null,
            program.division?.name ? `Bidang: ${program.division.name}` : null,
            program.primary_pic?.name ? `PIC: ${program.primary_pic.name}` : null,
            program.description,
        ].filter(Boolean).join("\n\n"),
    });
}

function taskCalendarUrl(task, program) {
    const shouldOfferReminder =
        task?.is_milestone ||
        ["high", "critical"].includes(task?.priority) ||
        Boolean(task?.pic) ||
        (task?.assignees || []).length > 0;

    if (!shouldOfferReminder || ["completed", "cancelled"].includes(task?.status) || !task?.planned_end_date) {
        return null;
    }

    const assignees = (task.assignees || [])
        .map((assignee) => assignee.user?.name || assignee.name)
        .filter(Boolean)
        .join(", ");

    return buildGoogleCalendarUrl({
        title: `${task.is_milestone ? "Milestone" : "Reminder Task"}: ${task.name}`,
        start: task.planned_end_date,
        end: task.planned_end_date,
        allDay: true,
        location: program?.location,
        details: [
            program?.name ? `Program: ${program.name}` : null,
            task.task_code ? `Kode Task: ${task.task_code}` : null,
            task.pic?.name ? `PIC: ${task.pic.name}` : null,
            assignees ? `Assignee: ${assignees}` : null,
            task.is_milestone ? "Jenis: Milestone" : null,
            task.priority ? `Prioritas: ${PRIORITY_LABELS[task.priority] || task.priority}` : null,
        ].filter(Boolean).join("\n\n"),
    });
}

function EmptyBlock({ description }) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />;
}

const LOCKED_PROGRAM_STATUSES = ["completed", "evaluated", "archived", "cancelled", "rejected"];

function isProgramLocked(program) {
    return LOCKED_PROGRAM_STATUSES.includes(program?.status);
}

const WORKFLOW_CONFIG = {
    submit: {
        routeName: "work-programs.submit",
        title: "Ajukan Program Kerja",
        okText: "Ajukan",
        description: "Program akan masuk antrean persetujuan.",
        noteLabel: "Catatan pengajuan",
        noteRequired: false,
        success: "Program kerja berhasil diajukan.",
    },
    withdraw: {
        routeName: "work-programs.withdraw",
        title: "Tarik Pengajuan",
        okText: "Tarik",
        description: "Pengajuan dikembalikan menjadi draft agar dapat diperbaiki.",
        noteLabel: "Catatan penarikan",
        noteRequired: false,
        danger: true,
        success: "Pengajuan berhasil ditarik.",
    },
    start_review: {
        routeName: "work-programs.start-review",
        title: "Mulai Review",
        okText: "Mulai Review",
        description: "Program masuk status review sebelum diputuskan.",
        noteLabel: "Catatan reviewer",
        noteRequired: false,
        success: "Review program kerja dimulai.",
    },
    request_revision: {
        routeName: "work-programs.request-revision",
        title: "Buka Revisi Program Kerja",
        okText: "Buka Revisi",
        description: "Catatan revisi wajib diisi agar pengaju tahu bagian yang perlu diperbaiki. Untuk program selesai, aksi ini membuka kembali hak edit program.",
        noteLabel: "Alasan revisi",
        noteRequired: true,
        warning: true,
        success: "Permintaan revisi berhasil dikirim.",
    },
    approve: {
        routeName: "work-programs.approve",
        title: "Setujui Program Kerja",
        okText: "Setujui",
        description: "Periksa ringkasan sebelum menyetujui program kerja.",
        noteLabel: "Catatan persetujuan",
        noteRequired: false,
        success: "Program kerja berhasil disetujui.",
    },
    reject: {
        routeName: "work-programs.reject",
        title: "Tolak Program Kerja",
        okText: "Tolak",
        description: "Alasan penolakan wajib diisi dan akan tampil di riwayat.",
        noteLabel: "Alasan penolakan",
        noteRequired: true,
        danger: true,
        success: "Program kerja berhasil ditolak.",
    },
    schedule: {
        routeName: "work-programs.schedule",
        title: "Jadwalkan Program Kerja",
        okText: "Jadwalkan",
        description: "Program akan masuk status terjadwal. Pastikan task dan tanggal rencana sudah lengkap.",
        noteLabel: "Catatan penjadwalan",
        noteRequired: false,
        success: "Program kerja berhasil dijadwalkan.",
    },
    start_execution: {
        routeName: "work-programs.start-execution",
        title: "Mulai Pelaksanaan",
        okText: "Mulai",
        description: "Program akan masuk status berjalan dan tanggal mulai aktual diisi bila masih kosong.",
        noteLabel: "Catatan mulai pelaksanaan",
        noteRequired: false,
        success: "Pelaksanaan program kerja dimulai.",
    },
    hold: {
        routeName: "work-programs.hold",
        title: "Tahan Program Kerja",
        okText: "Tahan",
        description: "Program berjalan akan ditahan sementara. Alasan wajib diisi.",
        noteLabel: "Alasan penahanan",
        noteRequired: true,
        warning: true,
        success: "Program kerja berhasil ditahan.",
    },
    resume: {
        routeName: "work-programs.resume",
        title: "Lanjutkan Program Kerja",
        okText: "Lanjutkan",
        description: "Program yang ditahan akan kembali ke status berjalan.",
        noteLabel: "Catatan lanjutan",
        noteRequired: false,
        success: "Program kerja berhasil dilanjutkan.",
    },
    complete: {
        routeName: "work-programs.complete",
        title: "Selesaikan Program Kerja",
        okText: "Selesaikan",
        description: "Program dapat diselesaikan setelah semua task aktif selesai dan progress mencapai 100%.",
        noteLabel: "Catatan penyelesaian",
        noteRequired: false,
        success: "Program kerja berhasil ditandai selesai.",
    },
    archive: {
        routeName: "work-programs.archive",
        title: "Arsipkan Program Kerja",
        okText: "Arsipkan",
        description: "Program yang sudah dievaluasi akan dipindahkan ke status arsip.",
        noteLabel: "Catatan arsip",
        noteRequired: false,
        success: "Program kerja berhasil diarsipkan.",
    },
};

function WorkflowPanel({ program, workflowError }) {
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm();
    const [activeAction, setActiveAction] = useState(null);
    const [processingAction, setProcessingAction] = useState(null);
    const actions = program.workflow_actions || {};
    const config = activeAction ? WORKFLOW_CONFIG[activeAction] : null;
    const hasActions = Object.values(actions).some(Boolean);

    const openAction = (action) => {
        form.resetFields();
        setActiveAction(action);
    };

    const closeAction = () => {
        if (!processingAction) {
            setActiveAction(null);
            form.resetFields();
        }
    };

    const submitAction = async () => {
        if (!config || !activeAction) return;

        const values = await form.validateFields();
        setProcessingAction(activeAction);
        router.post(
            route(config.routeName, program.id),
            { note: values.note || "" },
            {
                preserveScroll: true,
                onSuccess: () => {
                    message.success(config.success);
                    setActiveAction(null);
                    form.resetFields();
                },
                onError: (errors) => {
                    message.error(errors?.workflow || errors?.note || "Workflow belum dapat diproses.");
                },
                onFinish: () => setProcessingAction(null),
            },
        );
    };

    const actionButton = (action, label, type = "default", danger = false) =>
        actions[action] ? (
            <Button
                key={action}
                type={type}
                danger={danger}
                onClick={() => openAction(action)}
                loading={processingAction === action}
            >
                {label}
            </Button>
        ) : null;

    return (
        <>
            <Card title="Workflow Approval">
                <Space orientation="vertical" size="middle" className="w-full">
                    {workflowError ? (
                        <Alert type="error" showIcon title="Workflow belum dapat diproses" description={workflowError} />
                    ) : null}
                    <Descriptions column={{ xs: 1, md: 2 }} size="small">
                        <Descriptions.Item label="Status">{statusTag(program.status)}</Descriptions.Item>
                        <Descriptions.Item label="Versi">{program.lock_version ?? "-"}</Descriptions.Item>
                        <Descriptions.Item label="Diajukan">{formatDateTime(program.submitted_at)}</Descriptions.Item>
                        <Descriptions.Item label="Disetujui">{formatDateTime(program.approved_at)}</Descriptions.Item>
                        <Descriptions.Item label="Ditolak">{formatDateTime(program.rejected_at)}</Descriptions.Item>
                        <Descriptions.Item label="Reviewer Note Terakhir">
                            {program.approvals?.find((approval) => approval.note)?.note || <Text type="secondary">-</Text>}
                        </Descriptions.Item>
                    </Descriptions>
                    {hasActions ? (
                        <Space wrap>
                            {actionButton("submit", "Ajukan", "primary")}
                            {actionButton("withdraw", "Tarik Pengajuan", "default", true)}
                            {actionButton("start_review", "Mulai Review", "primary")}
                            {actionButton("request_revision", program.status === "completed" ? "Buka Revisi" : "Minta Revisi", "default")}
                            {actionButton("approve", "Setujui", "primary")}
                            {actionButton("reject", "Tolak", "default", true)}
                            {actionButton("schedule", "Jadwalkan", "primary")}
                            {actionButton("start_execution", "Mulai Pelaksanaan", "primary")}
                            {actionButton("hold", "Tahan", "default")}
                            {actionButton("resume", "Lanjutkan", "primary")}
                            {actionButton("complete", "Selesaikan", "primary")}
                            {actionButton("archive", "Arsipkan", "default")}
                        </Space>
                    ) : (
                        <Text type="secondary">Tidak ada aksi workflow yang tersedia untuk status dan permission saat ini.</Text>
                    )}
                </Space>
            </Card>

            <Modal
                title={config?.title}
                open={Boolean(config)}
                onCancel={closeAction}
                onOk={submitAction}
                okText={config?.okText}
                okButtonProps={{
                    danger: config?.danger,
                    loading: Boolean(processingAction),
                    disabled: Boolean(processingAction),
                }}
                cancelButtonProps={{ disabled: Boolean(processingAction) }}
            >
                {config ? (
                    <Space orientation="vertical" size="middle" className="w-full">
                        <Alert
                            type={config.danger ? "error" : config.warning ? "warning" : "info"}
                            showIcon
                            title={config.description}
                        />
                        {activeAction === "approve" ? (
                            <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label="Program">{program.name}</Descriptions.Item>
                                <Descriptions.Item label="Bidang">{program.division?.name || "-"}</Descriptions.Item>
                                <Descriptions.Item label="PIC">{program.primary_pic?.name || "-"}</Descriptions.Item>
                                <Descriptions.Item label="Jadwal">
                                    {formatDate(program.planned_start_date)} - {formatDate(program.planned_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Anggaran">{formatIDR(program.estimated_budget)}</Descriptions.Item>
                            </Descriptions>
                        ) : null}
                        <Form form={form} layout="vertical">
                            <Form.Item
                                label={config.noteLabel}
                                name="note"
                                rules={
                                    config.noteRequired
                                        ? [{ required: true, min: 3, message: `${config.noteLabel} wajib diisi.` }]
                                        : []
                                }
                            >
                                <TextArea rows={4} maxLength={1000} showCount />
                            </Form.Item>
                        </Form>
                    </Space>
                ) : null}
            </Modal>
        </>
    );
}

export default function WorkProgramsShow() {
    const { message } = AntdApp.useApp();
    const { props } = usePage();
    const program = props.program || {};
    const workflowError = props.errors?.workflow;
    const permissions = props.auth?.permissions || [];
    const canExport = permissions.includes("work_program.export");
    const programLocked = isProgramLocked(program);
    const canManageTasks = permissions.includes("work_program.manage_tasks") && !programLocked;
    const tasks = program.tasks || [];
    const approvals = program.approvals || [];
    const [collaboratorForm] = Form.useForm();
    const [collaboratorSaving, setCollaboratorSaving] = useState(false);
    const divisionOptions = (props.options?.divisions || [])
        .filter((division) => Number(division.id) !== Number(program.division?.id))
        .map((division) => ({
            value: division.id,
            label: `${division.name}${division.code ? ` (${division.code})` : ""}`,
        }));
    const taskTeamMembers = Array.from(
        new Map(
            [
                program.primary_pic
                    ? {
                          id: `primary-${program.primary_pic.id}`,
                          userId: program.primary_pic.id,
                          name: program.primary_pic.name,
                          email: program.primary_pic.email,
                          role: "PIC Utama",
                          tasks: [],
                      }
                    : null,
                ...tasks.flatMap((task) => [
                    task.pic
                        ? {
                              id: `task-pic-${task.pic.id}`,
                              userId: task.pic.id,
                              name: task.pic.name,
                              email: task.pic.email,
                              role: "PIC Task",
                              tasks: [task.name],
                          }
                        : null,
                    ...(task.assignees || []).map((assignee) =>
                        assignee.user
                            ? {
                                  id: `assignee-${assignee.user.id}`,
                                  userId: assignee.user.id,
                                  name: assignee.user.name,
                                  email: assignee.user.email,
                                  role: "Tim Task",
                                  tasks: [task.name],
                              }
                            : null,
                    ),
                ]),
            ]
                .filter(Boolean)
                .reduce((rows, member) => {
                    const existing = rows.get(member.userId);
                    if (!existing) {
                        rows.set(member.userId, member);
                        return rows;
                    }

                    const roles = new Set([existing.role, member.role]);
                    rows.set(member.userId, {
                        ...existing,
                        role: Array.from(roles).join(" / "),
                        tasks: Array.from(new Set([...(existing.tasks || []), ...(member.tasks || [])])),
                    });
                    return rows;
                }, new Map()),
        ).values(),
    );
    const collaboratorDivisions = [
        program.division
            ? {
                  id: `main-${program.division.id}`,
                  division: program.division,
                  role: "Bidang Utama",
              }
            : null,
        ...(program.collaborator_divisions || []).map((item) => ({ ...item, role: "Kolaborator" })),
    ].filter(Boolean);
    const programCalendarHref = programCalendarUrl(program);

    const reloadProgram = () => router.reload({ only: ["program"], preserveScroll: true });

    const addCollaboratorDivision = async () => {
        const values = await collaboratorForm.validateFields();
        setCollaboratorSaving(true);
        try {
            await axios.post(route("work-programs.collaborator-divisions.store", program.id), values);
            message.success("Bidang kolaborator berhasil ditambahkan.");
            collaboratorForm.resetFields();
            reloadProgram();
        } catch (error) {
            message.error(error.response?.data?.message || "Bidang kolaborator belum dapat ditambahkan.");
        } finally {
            setCollaboratorSaving(false);
        }
    };

    const removeCollaboratorDivision = async (item) => {
        setCollaboratorSaving(true);
        try {
            await axios.delete(route("work-programs.collaborator-divisions.destroy", [program.id, item.id]));
            message.success("Bidang kolaborator berhasil dihapus.");
            reloadProgram();
        } catch (error) {
            message.error(error.response?.data?.message || "Bidang kolaborator belum dapat dihapus.");
        } finally {
            setCollaboratorSaving(false);
        }
    };
    const projectReportQuery = new URLSearchParams({ program_id: program.id });
    const projectExportUrl = (format) => {
        const params = new URLSearchParams({ program_id: program.id, format });

        return `${route("work-programs.report.export")}?${params.toString()}`;
    };
    const taskColumns = [
        {
            title: "Kode",
            dataIndex: "task_code",
            width: 130,
            render: (value, row) => value || `TASK-${row.id}`,
        },
        {
            title: "Nama Task",
            dataIndex: "name",
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">{row.pic?.name || "PIC belum ada"}</div>
                </div>
            ),
        },
        {
            title: "Tanggal",
            width: 190,
            render: (_, row) => `${formatDate(row.planned_start_date)} - ${formatDate(row.planned_end_date)}`,
        },
        {
            title: "Status",
            dataIndex: "status",
            width: 130,
            render: statusTag,
        },
        {
            title: "Prioritas",
            dataIndex: "priority",
            width: 120,
            render: priorityTag,
        },
        {
            title: "Progres",
            dataIndex: "progress",
            width: 160,
            render: (value) => <Progress percent={value || 0} size="small" />,
        },
        {
            title: "",
            width: 170,
            align: "right",
            render: (_, row) => {
                const calendarHref = taskCalendarUrl(row, program);

                return calendarHref ? (
                    <Button size="small" icon={<CalendarOutlined />} href={calendarHref} target="_blank">
                        Reminder
                    </Button>
                ) : null;
            },
        },
    ];

    const historyItems = approvals.map((approval) => ({
        key: approval.id,
        color: approval.to_status === "approved" ? "green" : approval.to_status === "rejected" ? "red" : "blue",
        children: (
            <div>
                <div className="font-semibold text-zinc-950">
                    {approval.action} {approval.to_status ? `-> ${STATUS_LABELS[approval.to_status] || approval.to_status}` : ""}
                </div>
                <div className="text-xs text-zinc-500">
                    {formatDateTime(approval.acted_at)} oleh {approval.actor?.name || "-"}
                </div>
                {approval.note ? <Paragraph className="mb-0 mt-1 text-sm text-zinc-600">{approval.note}</Paragraph> : null}
            </div>
        ),
    }));

    const tabItems = [
        {
            key: "summary",
            label: "Ringkasan",
            children: (
                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <Card title="Informasi Program">
                        <Descriptions column={{ xs: 1, md: 2 }} size="small">
                            <Descriptions.Item label="Kode">{textOrDash(program.program_code)}</Descriptions.Item>
                            <Descriptions.Item label="Status">{statusTag(program.status)}</Descriptions.Item>
                            <Descriptions.Item label="Bidang">{program.division?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Periode">{program.period?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Sifat">{NATURE_LABELS[program.nature] || program.nature || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Sumber">{SOURCE_LABELS[program.source] || program.source || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Kategori">{textOrDash(program.category)}</Descriptions.Item>
                            <Descriptions.Item label="Tipe">{textOrDash(program.type)}</Descriptions.Item>
                            <Descriptions.Item label="PIC">{program.primary_pic?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Lokasi">{textOrDash(program.location)}</Descriptions.Item>
                        </Descriptions>
                        <div className="mt-5 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">Deskripsi</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.description)}</Paragraph>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">Tujuan</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.objectives)}</Paragraph>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">Indikator Keberhasilan</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.success_indicators)}</Paragraph>
                            </div>
                        </div>
                    </Card>
                    <Card title="Status Pelaksanaan">
                        <Space orientation="vertical" size="large" className="w-full">
                            <Progress percent={program.progress || 0} />
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Tanggal Rencana">
                                    {formatDate(program.planned_start_date)} - {formatDate(program.planned_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tanggal Aktual">
                                    {formatDate(program.actual_start_date)} - {formatDate(program.actual_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Prioritas">{priorityTag(program.priority)}</Descriptions.Item>
                                <Descriptions.Item label="Dibuat">{formatDateTime(program.created_at)}</Descriptions.Item>
                                <Descriptions.Item label="Diperbarui">{formatDateTime(program.updated_at)}</Descriptions.Item>
                            </Descriptions>
                        </Space>
                    </Card>
                </div>
            ),
        },
        {
            key: "gantt",
            label: "Gantt",
            children: (
                <GanttChart
                    programId={program.id}
                    permissions={permissions}
                    onChanged={() => router.reload({ only: ["program"], preserveScroll: true })}
                />
            ),
        },
        {
            key: "activity",
            label: "Aktivitas",
            children: (
                <Card title="Aktivitas Task">
                    <DataTable
                        columns={taskColumns}
                        dataSource={tasks}
                        rowKey="id"
                        pagination={false}
                        emptyTitle="Belum ada aktivitas"
                        emptyDescription="Task program akan tampil setelah dibuat."
                    />
                </Card>
            ),
        },
        {
            key: "team",
            label: "Tim",
            children: (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card title="Penugasan">
                        {taskTeamMembers.length ? (
                            <Space orientation="vertical" className="w-full">
                                {taskTeamMembers.map((member) => (
                                    <div key={member.id} className="rounded-xl border border-zinc-200 px-3 py-2">
                                        <div className="font-semibold text-zinc-950">{member.name || "-"}</div>
                                        <div className="text-xs text-zinc-500">{member.role}{member.email ? ` · ${member.email}` : ""}</div>
                                        {(member.tasks || []).length ? (
                                            <div className="mt-1 text-xs text-zinc-500">
                                                Task: {member.tasks.join(", ")}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </Space>
                        ) : (
                            <EmptyBlock description="Belum ada tim dari PIC atau assignee task." />
                        )}
                    </Card>
                    <Card title="Bidang Kolaborator">
                        {canManageTasks ? (
                            <Form form={collaboratorForm} layout="inline" className="mb-4">
                                <Form.Item
                                    name="division_id"
                                    rules={[{ required: true, message: "Pilih bidang kolaborator." }]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Pilih bidang"
                                        options={divisionOptions}
                                        style={{ minWidth: 260 }}
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        onClick={addCollaboratorDivision}
                                        loading={collaboratorSaving}
                                    >
                                        Tambah Kolaborator
                                    </Button>
                                </Form.Item>
                            </Form>
                        ) : null}
                        {collaboratorDivisions.length ? (
                            <Space wrap>
                                {collaboratorDivisions.map((item) => (
                                    item.role === "Kolaborator" && canManageTasks ? (
                                        <Popconfirm
                                            key={item.id}
                                            title="Hapus bidang kolaborator?"
                                            okText="Hapus"
                                            cancelText="Batal"
                                            onConfirm={() => removeCollaboratorDivision(item)}
                                        >
                                            <Tag closable onClose={(event) => event.preventDefault()}>
                                                {item.role}: {item.division?.name || "-"}
                                            </Tag>
                                        </Popconfirm>
                                    ) : (
                                        <Tag key={item.id}>{item.role}: {item.division?.name || "-"}</Tag>
                                    )
                                ))}
                            </Space>
                        ) : (
                            <EmptyBlock description="Belum ada bidang kolaborator." />
                        )}
                    </Card>
                </div>
            ),
        },
        {
            key: "budget",
            label: "Anggaran",
            children: (
                <AdministrationPanel
                    section="budget"
                    program={program}
                    permissions={permissions}
                    options={props.options || {}}
                    onChanged={() => router.reload({ only: ["program"], preserveScroll: true })}
                />
            ),
        },
        {
            key: "progress",
            label: "Progres",
            children: <MonitoringPanel programId={program.id} options={props.options || {}} permissions={permissions} />,
        },
        {
            key: "risks",
            label: "Risiko",
            children: <MonitoringPanel programId={program.id} options={props.options || {}} permissions={permissions} />,
        },
        {
            key: "documents",
            label: "Dokumen",
            children: <AdministrationPanel section="documents" program={program} permissions={permissions} options={props.options || {}} />,
        },
        {
            key: "evaluation",
            label: "Evaluasi",
            children: <AdministrationPanel section="evaluation" program={program} permissions={permissions} options={props.options || {}} />,
        },
        {
            key: "history",
            label: "Riwayat",
            children: (
                <Card title="Riwayat Persetujuan">
                    {historyItems.length ? <Timeline items={historyItems} /> : <EmptyBlock description="Belum ada riwayat workflow." />}
                </Card>
            ),
        },
    ];

    return (
        <AppLayout title={`Program Kerja - ${program.name || ""}`}>
            <PageShell>
                <PageHeader
                    eyebrow="Program Kerja"
                    title={program.name || "Detail Program"}
                    description={`${program.program_code || `PRG-${program.id}`} · ${program.division?.name || "-"} · ${program.period?.name || program.year || "-"}`}
                    extra={
                        <Space wrap>
                            <Link href={route("work-programs.index")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-red-200 hover:text-red-700">
                                <ArrowLeftOutlined />
                                Daftar Program
                            </Link>
                            <Button icon={<PrinterOutlined />} href={`${route("work-programs.report.print")}?${projectReportQuery.toString()}`} target="_blank" disabled={!canExport}>
                                Print
                            </Button>
                            {programCalendarHref ? (
                                <Button icon={<CalendarOutlined />} href={programCalendarHref} target="_blank">
                                    Jadwal Program
                                </Button>
                            ) : null}
                            <Button icon={<FilePdfOutlined />} href={projectExportUrl("pdf")} disabled={!canExport}>
                                PDF
                            </Button>
                            <Button icon={<DownloadOutlined />} href={projectExportUrl("csv")} disabled={!canExport}>
                                CSV
                            </Button>
                            <Button type="primary" icon={<FileExcelOutlined />} href={projectExportUrl("xlsx")} disabled={!canExport}>
                                Excel
                            </Button>
                        </Space>
                    }
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <Statistic title="Status" value={STATUS_LABELS[program.status] || program.status || "-"} prefix={<CheckCircleOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title="Progres" value={program.progress || 0} suffix="%" prefix={<ProjectOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title="Task" value={tasks.length} prefix={<ClockCircleOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title="Tim" value={taskTeamMembers.length} prefix={<TeamOutlined />} />
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <Space>
                            <CalendarOutlined className="text-red-700" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Jadwal</div>
                                <div className="font-semibold text-zinc-950">
                                    {formatDate(program.planned_start_date)} - {formatDate(program.planned_end_date)}
                                </div>
                            </div>
                            {programCalendarHref ? (
                                <Button size="small" icon={<CalendarOutlined />} href={programCalendarHref} target="_blank">
                                    Calendar
                                </Button>
                            ) : null}
                        </Space>
                    </Card>
                    <Card>
                        <Space>
                            <FileTextOutlined className="text-red-700" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Prioritas</div>
                                <div>{priorityTag(program.priority)}</div>
                            </div>
                        </Space>
                    </Card>
                    <Card>
                        <Space>
                            <ProjectOutlined className="text-red-700" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Anggaran</div>
                                <div className="font-semibold text-zinc-950">{formatIDR(program.estimated_budget)}</div>
                            </div>
                        </Space>
                    </Card>
                </div>

                {program.status === "completed" ? (
                    <Alert
                        type="info"
                        showIcon
                        title="Program kerja sudah selesai"
                        description="Task, Gantt, risiko, anggaran, dan dokumen dikunci. Bagian evaluasi masih dapat diisi. Jika data program perlu diperbaiki, minta ketua/reviewer membuka revisi program terlebih dahulu."
                    />
                ) : null}

                <WorkflowPanel program={program} workflowError={workflowError} />

                <Tabs items={tabItems} className="rounded-3xl border border-white/80 bg-white/90 px-4 pb-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]" />
            </PageShell>
        </AppLayout>
    );
}
