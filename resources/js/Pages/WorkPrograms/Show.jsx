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
import useBilingual from "@/Hooks/useBilingual";

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

const STATUS_LABELS_EN = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    revision_requested: "Revision Requested",
    approved: "Approved",
    rejected: "Rejected",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
    cancelled: "Cancelled",
    evaluated: "Evaluated",
    archived: "Archived",
    todo: "Not Started",
    blocked: "Blocked",
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

const PRIORITY_LABELS_EN = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
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

const NATURE_LABELS_EN = {
    routine: "Routine",
    incidental: "Incidental",
    strategic: "Strategic",
    collaborative: "Collaborative",
};

const SOURCE_LABELS = {
    field_proposal: "Usulan Bidang",
    organizational_mandate: "Mandat Organisasi",
    work_meeting_result: "Hasil Rapat Kerja",
    evaluation_follow_up: "Tindak Lanjut Evaluasi",
};

const SOURCE_LABELS_EN = {
    field_proposal: "Division Proposal",
    organizational_mandate: "Organizational Mandate",
    work_meeting_result: "Work Meeting Result",
    evaluation_follow_up: "Evaluation Follow-up",
};

function statusTag(status, isEnglish = false) {
    const labels = isEnglish ? STATUS_LABELS_EN : STATUS_LABELS;
    return <Tag color={STATUS_COLORS[status] || "default"}>{labels[status] || status || "-"}</Tag>;
}

function priorityTag(priority, isEnglish = false) {
    const labels = isEnglish ? PRIORITY_LABELS_EN : PRIORITY_LABELS;
    return <Tag color={PRIORITY_COLORS[priority] || "default"}>{labels[priority] || priority || "-"}</Tag>;
}

function textOrDash(value) {
    return value || <Text type="secondary">-</Text>;
}

function programCalendarUrl(program, tx = (indonesian) => indonesian) {
    if (!canAddCalendarEvent({
        start: program?.planned_start_date,
        status: program?.status,
        allowedStatuses: ["scheduled", "in_progress"],
    })) {
        return null;
    }

    return buildGoogleCalendarUrl({
        title: `${tx("Program Kerja", "Work Program")}: ${program.name}`,
        start: program.planned_start_date,
        end: program.planned_end_date,
        allDay: true,
        location: program.location,
        details: [
            program.program_code ? `${tx("Kode", "Code")}: ${program.program_code}` : null,
            program.division?.name ? `${tx("Bidang", "Division")}: ${program.division.name}` : null,
            program.primary_pic?.name ? `PIC: ${program.primary_pic.name}` : null,
            program.description,
        ].filter(Boolean).join("\n\n"),
    });
}

function taskCalendarUrl(task, program, tx = (indonesian) => indonesian, isEnglish = false) {
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
        title: `${task.is_milestone ? "Milestone" : tx("Pengingat Task", "Task Reminder")}: ${task.name}`,
        start: task.planned_end_date,
        end: task.planned_end_date,
        allDay: true,
        location: program?.location,
        details: [
            program?.name ? `Program: ${program.name}` : null,
            task.task_code ? `${tx("Kode Task", "Task Code")}: ${task.task_code}` : null,
            task.pic?.name ? `PIC: ${task.pic.name}` : null,
            assignees ? `Assignee: ${assignees}` : null,
            task.is_milestone ? `${tx("Jenis", "Type")}: Milestone` : null,
            task.priority ? `${tx("Prioritas", "Priority")}: ${(isEnglish ? PRIORITY_LABELS_EN : PRIORITY_LABELS)[task.priority] || task.priority}` : null,
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

const WORKFLOW_CONFIG_EN = {
    submit: {
        title: "Submit Work Program",
        okText: "Submit",
        description: "The program will enter the approval queue.",
        noteLabel: "Submission note",
        success: "Work program submitted successfully.",
    },
    withdraw: {
        title: "Withdraw Submission",
        okText: "Withdraw",
        description: "The submission will return to draft so it can be revised.",
        noteLabel: "Withdrawal note",
        success: "Submission withdrawn successfully.",
    },
    start_review: {
        title: "Start Review",
        okText: "Start Review",
        description: "The program will enter review status before a decision is made.",
        noteLabel: "Reviewer note",
        success: "Work program review started.",
    },
    request_revision: {
        title: "Open Work Program Revision",
        okText: "Open Revision",
        description: "A revision note is required so the submitter knows what to update. For a completed program, this action restores editing access.",
        noteLabel: "Revision reason",
        success: "Revision request sent successfully.",
    },
    approve: {
        title: "Approve Work Program",
        okText: "Approve",
        description: "Review the summary before approving the work program.",
        noteLabel: "Approval note",
        success: "Work program approved successfully.",
    },
    reject: {
        title: "Reject Work Program",
        okText: "Reject",
        description: "A rejection reason is required and will appear in the history.",
        noteLabel: "Rejection reason",
        success: "Work program rejected successfully.",
    },
    schedule: {
        title: "Schedule Work Program",
        okText: "Schedule",
        description: "The program will be scheduled. Make sure its tasks and planned dates are complete.",
        noteLabel: "Scheduling note",
        success: "Work program scheduled successfully.",
    },
    start_execution: {
        title: "Start Execution",
        okText: "Start",
        description: "The program will enter in-progress status and its actual start date will be filled if empty.",
        noteLabel: "Execution start note",
        success: "Work program execution started.",
    },
    hold: {
        title: "Put Work Program on Hold",
        okText: "Put on Hold",
        description: "The running program will be put on hold temporarily. A reason is required.",
        noteLabel: "Hold reason",
        success: "Work program put on hold successfully.",
    },
    resume: {
        title: "Resume Work Program",
        okText: "Resume",
        description: "The program on hold will return to in-progress status.",
        noteLabel: "Resumption note",
        success: "Work program resumed successfully.",
    },
    complete: {
        title: "Complete Work Program",
        okText: "Complete",
        description: "The program can be completed after all active tasks are finished and progress reaches 100%.",
        noteLabel: "Completion note",
        success: "Work program marked as completed.",
    },
    archive: {
        title: "Archive Work Program",
        okText: "Archive",
        description: "The evaluated program will be moved to archived status.",
        noteLabel: "Archive note",
        success: "Work program archived successfully.",
    },
};

function localizedWorkflowConfig(action, tx) {
    const config = WORKFLOW_CONFIG[action];
    const english = WORKFLOW_CONFIG_EN[action];

    if (!config || !english) return config;

    return {
        ...config,
        title: tx(config.title, english.title),
        okText: tx(config.okText, english.okText),
        description: tx(config.description, english.description),
        noteLabel: tx(config.noteLabel, english.noteLabel),
        success: tx(config.success, english.success),
    };
}

function WorkflowPanel({ program, workflowError }) {
    const { isEnglish, tx } = useBilingual();
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm();
    const [activeAction, setActiveAction] = useState(null);
    const [processingAction, setProcessingAction] = useState(null);
    const actions = program.workflow_actions || {};
    const config = activeAction ? localizedWorkflowConfig(activeAction, tx) : null;
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
                    message.error(errors?.workflow || errors?.note || tx("Workflow belum dapat diproses.", "The workflow could not be processed."));
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
            <Card title={tx("Persetujuan Workflow", "Workflow Approval")}>
                <Space orientation="vertical" size="middle" className="w-full">
                    {workflowError ? (
                        <Alert type="error" showIcon title={tx("Workflow belum dapat diproses", "The workflow could not be processed")} description={workflowError} />
                    ) : null}
                    <Descriptions column={{ xs: 1, md: 2 }} size="small">
                        <Descriptions.Item label={tx("Status", "Status")}>{statusTag(program.status, isEnglish)}</Descriptions.Item>
                        <Descriptions.Item label={tx("Versi", "Version")}>{program.lock_version ?? "-"}</Descriptions.Item>
                        <Descriptions.Item label={tx("Diajukan", "Submitted")}>{formatDateTime(program.submitted_at)}</Descriptions.Item>
                        <Descriptions.Item label={tx("Disetujui", "Approved")}>{formatDateTime(program.approved_at)}</Descriptions.Item>
                        <Descriptions.Item label={tx("Ditolak", "Rejected")}>{formatDateTime(program.rejected_at)}</Descriptions.Item>
                        <Descriptions.Item label={tx("Catatan Reviewer Terakhir", "Latest Reviewer Note")}>
                            {program.approvals?.find((approval) => approval.note)?.note || <Text type="secondary">-</Text>}
                        </Descriptions.Item>
                    </Descriptions>
                    {hasActions ? (
                        <Space wrap>
                            {actionButton("submit", tx("Ajukan", "Submit"), "primary")}
                            {actionButton("withdraw", tx("Tarik Pengajuan", "Withdraw Submission"), "default", true)}
                            {actionButton("start_review", tx("Mulai Review", "Start Review"), "primary")}
                            {actionButton("request_revision", program.status === "completed" ? tx("Buka Revisi", "Open Revision") : tx("Minta Revisi", "Request Revision"), "default")}
                            {actionButton("approve", tx("Setujui", "Approve"), "primary")}
                            {actionButton("reject", tx("Tolak", "Reject"), "default", true)}
                            {actionButton("schedule", tx("Jadwalkan", "Schedule"), "primary")}
                            {actionButton("start_execution", tx("Mulai Pelaksanaan", "Start Execution"), "primary")}
                            {actionButton("hold", tx("Tahan", "Put on Hold"), "default")}
                            {actionButton("resume", tx("Lanjutkan", "Resume"), "primary")}
                            {actionButton("complete", tx("Selesaikan", "Complete"), "primary")}
                            {actionButton("archive", tx("Arsipkan", "Archive"), "default")}
                        </Space>
                    ) : (
                        <Text type="secondary">{tx("Tidak ada aksi workflow yang tersedia untuk status dan permission saat ini.", "No workflow actions are available for the current status and permissions.")}</Text>
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
                                <Descriptions.Item label={tx("Program", "Program")}>{program.name}</Descriptions.Item>
                                <Descriptions.Item label={tx("Bidang", "Division")}>{program.division?.name || "-"}</Descriptions.Item>
                                <Descriptions.Item label="PIC">{program.primary_pic?.name || "-"}</Descriptions.Item>
                                <Descriptions.Item label={tx("Jadwal", "Schedule")}>
                                    {formatDate(program.planned_start_date)} - {formatDate(program.planned_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label={tx("Anggaran", "Budget")}>{formatIDR(program.estimated_budget)}</Descriptions.Item>
                            </Descriptions>
                        ) : null}
                        <Form form={form} layout="vertical">
                            <Form.Item
                                label={config.noteLabel}
                                name="note"
                                rules={
                                    config.noteRequired
                                        ? [{ required: true, min: 3, message: tx(`${config.noteLabel} wajib diisi.`, `${config.noteLabel} is required.`) }]
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
    const { isEnglish, tx } = useBilingual();
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
                          role: tx("PIC Utama", "Primary PIC"),
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
                              role: tx("PIC Task", "Task PIC"),
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
                                  role: tx("Tim Task", "Task Team"),
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
                  role: tx("Bidang Utama", "Primary Division"),
                  isCollaborator: false,
              }
            : null,
        ...(program.collaborator_divisions || []).map((item) => ({ ...item, role: tx("Kolaborator", "Collaborator"), isCollaborator: true })),
    ].filter(Boolean);
    const programCalendarHref = programCalendarUrl(program, tx);

    const reloadProgram = () => router.reload({ only: ["program"], preserveScroll: true });

    const addCollaboratorDivision = async () => {
        const values = await collaboratorForm.validateFields();
        setCollaboratorSaving(true);
        try {
            await axios.post(route("work-programs.collaborator-divisions.store", program.id), values);
            message.success(tx("Bidang kolaborator berhasil ditambahkan.", "Collaborating division added successfully."));
            collaboratorForm.resetFields();
            reloadProgram();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Bidang kolaborator belum dapat ditambahkan.", "The collaborating division could not be added."));
        } finally {
            setCollaboratorSaving(false);
        }
    };

    const removeCollaboratorDivision = async (item) => {
        setCollaboratorSaving(true);
        try {
            await axios.delete(route("work-programs.collaborator-divisions.destroy", [program.id, item.id]));
            message.success(tx("Bidang kolaborator berhasil dihapus.", "Collaborating division removed successfully."));
            reloadProgram();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Bidang kolaborator belum dapat dihapus.", "The collaborating division could not be removed."));
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
            title: tx("Kode", "Code"),
            dataIndex: "task_code",
            width: 130,
            render: (value, row) => value || `TASK-${row.id}`,
        },
        {
            title: tx("Nama Task", "Task Name"),
            dataIndex: "name",
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">{row.pic?.name || tx("PIC belum ada", "No PIC assigned")}</div>
                </div>
            ),
        },
        {
            title: tx("Tanggal", "Date"),
            width: 190,
            render: (_, row) => `${formatDate(row.planned_start_date)} - ${formatDate(row.planned_end_date)}`,
        },
        {
            title: tx("Status", "Status"),
            dataIndex: "status",
            width: 130,
            render: (value) => statusTag(value, isEnglish),
        },
        {
            title: tx("Prioritas", "Priority"),
            dataIndex: "priority",
            width: 120,
            render: (value) => priorityTag(value, isEnglish),
        },
        {
            title: tx("Progres", "Progress"),
            dataIndex: "progress",
            width: 160,
            render: (value) => <Progress percent={value || 0} size="small" />,
        },
        {
            title: "",
            width: 170,
            align: "right",
            render: (_, row) => {
                const calendarHref = taskCalendarUrl(row, program, tx, isEnglish);

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
                    {approval.action} {approval.to_status ? `-> ${(isEnglish ? STATUS_LABELS_EN : STATUS_LABELS)[approval.to_status] || approval.to_status}` : ""}
                </div>
                <div className="text-xs text-zinc-500">
                    {formatDateTime(approval.acted_at)} {tx("oleh", "by")} {approval.actor?.name || "-"}
                </div>
                {approval.note ? <Paragraph className="mb-0 mt-1 text-sm text-zinc-600">{approval.note}</Paragraph> : null}
            </div>
        ),
    }));

    const tabItems = [
        {
            key: "summary",
            label: tx("Ringkasan", "Summary"),
            children: (
                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <Card title={tx("Informasi Program", "Program Information")}>
                        <Descriptions column={{ xs: 1, md: 2 }} size="small">
                            <Descriptions.Item label={tx("Kode", "Code")}>{textOrDash(program.program_code)}</Descriptions.Item>
                            <Descriptions.Item label={tx("Status", "Status")}>{statusTag(program.status, isEnglish)}</Descriptions.Item>
                            <Descriptions.Item label={tx("Bidang", "Division")}>{program.division?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label={tx("Periode", "Period")}>{program.period?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label={tx("Sifat", "Nature")}>{(isEnglish ? NATURE_LABELS_EN : NATURE_LABELS)[program.nature] || program.nature || "-"}</Descriptions.Item>
                            <Descriptions.Item label={tx("Sumber", "Source")}>{(isEnglish ? SOURCE_LABELS_EN : SOURCE_LABELS)[program.source] || program.source || "-"}</Descriptions.Item>
                            <Descriptions.Item label={tx("Kategori", "Category")}>{textOrDash(program.category)}</Descriptions.Item>
                            <Descriptions.Item label={tx("Tipe", "Type")}>{textOrDash(program.type)}</Descriptions.Item>
                            <Descriptions.Item label="PIC">{program.primary_pic?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label={tx("Lokasi", "Location")}>{textOrDash(program.location)}</Descriptions.Item>
                        </Descriptions>
                        <div className="mt-5 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">{tx("Deskripsi", "Description")}</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.description)}</Paragraph>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">{tx("Tujuan", "Objectives")}</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.objectives)}</Paragraph>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-950">{tx("Indikator Keberhasilan", "Success Indicators")}</h3>
                                <Paragraph className="mb-0 text-zinc-600">{textOrDash(program.success_indicators)}</Paragraph>
                            </div>
                        </div>
                    </Card>
                    <Card title={tx("Status Pelaksanaan", "Execution Status")}>
                        <Space orientation="vertical" size="large" className="w-full">
                            <Progress percent={program.progress || 0} />
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label={tx("Tanggal Rencana", "Planned Dates")}>
                                    {formatDate(program.planned_start_date)} - {formatDate(program.planned_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label={tx("Tanggal Aktual", "Actual Dates")}>
                                    {formatDate(program.actual_start_date)} - {formatDate(program.actual_end_date)}
                                </Descriptions.Item>
                                <Descriptions.Item label={tx("Prioritas", "Priority")}>{priorityTag(program.priority, isEnglish)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Dibuat", "Created")}>{formatDateTime(program.created_at)}</Descriptions.Item>
                                <Descriptions.Item label={tx("Diperbarui", "Updated")}>{formatDateTime(program.updated_at)}</Descriptions.Item>
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
            label: tx("Aktivitas", "Activity"),
            children: (
                <Card title={tx("Aktivitas Task", "Task Activity")}>
                    <DataTable
                        columns={taskColumns}
                        dataSource={tasks}
                        rowKey="id"
                        pagination={false}
                        emptyTitle={tx("Belum ada aktivitas", "No activity yet")}
                        emptyDescription={tx("Task program akan tampil setelah dibuat.", "Program tasks will appear after they are created.")}
                    />
                </Card>
            ),
        },
        {
            key: "team",
            label: tx("Tim", "Team"),
            children: (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card title={tx("Penugasan", "Assignments")}>
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
                            <EmptyBlock description={tx("Belum ada tim dari PIC atau assignee task.", "No team members from task PICs or assignees yet.")} />
                        )}
                    </Card>
                    <Card title={tx("Bidang Kolaborator", "Collaborating Divisions")}>
                        {canManageTasks ? (
                            <Form form={collaboratorForm} layout="inline" className="mb-4">
                                <Form.Item
                                    name="division_id"
                                    rules={[{ required: true, message: tx("Pilih bidang kolaborator.", "Select a collaborating division.") }]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={tx("Pilih bidang", "Select division")}
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
                                        {tx("Tambah Kolaborator", "Add Collaborator")}
                                    </Button>
                                </Form.Item>
                            </Form>
                        ) : null}
                        {collaboratorDivisions.length ? (
                            <Space wrap>
                                {collaboratorDivisions.map((item) => (
                                    item.isCollaborator && canManageTasks ? (
                                        <Popconfirm
                                            key={item.id}
                                            title={tx("Hapus bidang kolaborator?", "Remove collaborating division?")}
                                            okText={tx("Hapus", "Remove")}
                                            cancelText={tx("Batal", "Cancel")}
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
                            <EmptyBlock description={tx("Belum ada bidang kolaborator.", "No collaborating divisions yet.")} />
                        )}
                    </Card>
                </div>
            ),
        },
        {
            key: "budget",
            label: tx("Anggaran", "Budget"),
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
            label: tx("Progres", "Progress"),
            children: <MonitoringPanel programId={program.id} options={props.options || {}} permissions={permissions} />,
        },
        {
            key: "risks",
            label: tx("Risiko", "Risks"),
            children: <MonitoringPanel programId={program.id} options={props.options || {}} permissions={permissions} />,
        },
        {
            key: "documents",
            label: tx("Dokumen", "Documents"),
            children: <AdministrationPanel section="documents" program={program} permissions={permissions} options={props.options || {}} />,
        },
        {
            key: "evaluation",
            label: tx("Evaluasi", "Evaluation"),
            children: <AdministrationPanel section="evaluation" program={program} permissions={permissions} options={props.options || {}} />,
        },
        {
            key: "history",
            label: tx("Riwayat", "History"),
            children: (
                <Card title={tx("Riwayat Persetujuan", "Approval History")}>
                    {historyItems.length ? <Timeline items={historyItems} /> : <EmptyBlock description={tx("Belum ada riwayat workflow.", "No workflow history yet.")} />}
                </Card>
            ),
        },
    ];

    return (
        <AppLayout title={`${tx("Program Kerja", "Work Program")} - ${program.name || ""}`}>
            <PageShell>
                <PageHeader
                    eyebrow={tx("Program Kerja", "Work Program")}
                    title={program.name || tx("Detail Program", "Program Details")}
                    description={`${program.program_code || `PRG-${program.id}`} · ${program.division?.name || "-"} · ${program.period?.name || program.year || "-"}`}
                    extra={
                        <Space wrap>
                            <Link href={route("work-programs.index")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-red-200 hover:text-red-700">
                                <ArrowLeftOutlined />
                                {tx("Daftar Program", "Program List")}
                            </Link>
                            <Button icon={<PrinterOutlined />} href={`${route("work-programs.report.print")}?${projectReportQuery.toString()}`} target="_blank" disabled={!canExport}>
                                Print
                            </Button>
                            {programCalendarHref ? (
                                <Button icon={<CalendarOutlined />} href={programCalendarHref} target="_blank">
                                    {tx("Jadwal Program", "Program Schedule")}
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
                        <Statistic title={tx("Status", "Status")} value={(isEnglish ? STATUS_LABELS_EN : STATUS_LABELS)[program.status] || program.status || "-"} prefix={<CheckCircleOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title={tx("Progres", "Progress")} value={program.progress || 0} suffix="%" prefix={<ProjectOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title={tx("Task", "Tasks")} value={tasks.length} prefix={<ClockCircleOutlined />} />
                    </Card>
                    <Card>
                        <Statistic title={tx("Tim", "Team")} value={taskTeamMembers.length} prefix={<TeamOutlined />} />
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <Space>
                            <CalendarOutlined className="text-red-700" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Jadwal", "Schedule")}</div>
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
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Prioritas", "Priority")}</div>
                                <div>{priorityTag(program.priority, isEnglish)}</div>
                            </div>
                        </Space>
                    </Card>
                    <Card>
                        <Space>
                            <ProjectOutlined className="text-red-700" />
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{tx("Anggaran", "Budget")}</div>
                                <div className="font-semibold text-zinc-950">{formatIDR(program.estimated_budget)}</div>
                            </div>
                        </Space>
                    </Card>
                </div>

                {program.status === "completed" ? (
                    <Alert
                        type="info"
                        showIcon
                        title={tx("Program kerja sudah selesai", "The work program has been completed")}
                        description={tx(
                            "Task, Gantt, risiko, anggaran, dan dokumen dikunci. Bagian evaluasi masih dapat diisi. Jika data program perlu diperbaiki, minta ketua/reviewer membuka revisi program terlebih dahulu.",
                            "Tasks, Gantt, risks, budget, and documents are locked. The evaluation section can still be completed. If program data needs correction, ask the chair or reviewer to open a program revision first.",
                        )}
                    />
                ) : null}

                <WorkflowPanel program={program} workflowError={workflowError} />

                <Tabs items={tabItems} className="rounded-3xl border border-white/80 bg-white/90 px-4 pb-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.32)]" />
            </PageShell>
        </AppLayout>
    );
}
