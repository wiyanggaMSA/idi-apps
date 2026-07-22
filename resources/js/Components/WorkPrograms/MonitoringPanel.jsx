import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Progress,
    Select,
    Space,
    Spin,
    Statistic,
    Table,
    Tag,
    Timeline,
    Typography,
} from "antd";
import { CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { formatDate, formatDateTime } from "@/lib/format";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";
import useBilingual from "@/Hooks/useBilingual";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const STATUS_LABELS = {
    todo: "Belum Mulai",
    in_progress: "Berjalan",
    blocked: "Terhambat",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    open: "Open",
    mitigating: "Mitigasi",
    resolved: "Resolved",
    closed: "Closed",
};

const STATUS_LABELS_EN = {
    todo: "Not Started",
    in_progress: "In Progress",
    blocked: "Blocked",
    completed: "Completed",
    cancelled: "Cancelled",
    open: "Open",
    mitigating: "Mitigating",
    resolved: "Resolved",
    closed: "Closed",
};

const LEVEL_COLORS = {
    low: "green",
    medium: "blue",
    high: "orange",
    extreme: "red",
};

const LOCKED_PROGRAM_STATUSES = ["completed", "evaluated", "archived", "cancelled", "rejected"];

function levelTag(level) {
    return <Tag color={LEVEL_COLORS[level] || "default"}>{level || "-"}</Tag>;
}

function statusTag(status, isEnglish = false) {
    const color = status === "blocked" || status === "open" ? "red" : status === "completed" || status === "resolved" || status === "closed" ? "green" : "blue";
    return <Tag color={color}>{(isEnglish ? STATUS_LABELS_EN : STATUS_LABELS)[status] || status || "-"}</Tag>;
}

function cleanPayload(payload) {
    const cleaned = { ...payload };
    Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === "" || cleaned[key] === null || cleaned[key] === undefined) {
            delete cleaned[key];
        }
    });

    return cleaned;
}

function taskCalendarUrl(task, program) {
    if (!task?.planned_end_date || ["completed", "cancelled"].includes(task.status)) {
        return null;
    }

    const assignees = (task.assignees || [])
        .map((assignee) => assignee.name)
        .filter(Boolean)
        .join(", ");

    return buildGoogleCalendarUrl({
        title: `Reminder Task: ${task.name}`,
        start: task.planned_end_date,
        end: task.planned_end_date,
        allDay: true,
        location: program?.location,
        details: [
            program?.name ? `Program: ${program.name}` : null,
            program?.program_code ? `Kode Program: ${program.program_code}` : null,
            task.task_code ? `Kode Task: ${task.task_code}` : null,
            task.pic?.name ? `PIC: ${task.pic.name}` : null,
            assignees ? `Assignee: ${assignees}` : null,
            task.priority ? `Prioritas: ${task.priority}` : null,
        ].filter(Boolean).join("\n\n"),
    });
}

function riskCalendarUrl(risk, program) {
    if (!risk?.due_date || ["resolved", "closed"].includes(risk.status)) {
        return null;
    }

    return buildGoogleCalendarUrl({
        title: `Reminder ${risk.type === "issue" ? "Kendala" : "Risiko"}: ${risk.title}`,
        start: risk.due_date,
        end: risk.due_date,
        allDay: true,
        location: program?.location,
        details: [
            program?.name ? `Program: ${program.name}` : null,
            risk.task?.name ? `Task terkait: ${risk.task.task_code || risk.task.id} - ${risk.task.name}` : null,
            risk.owner?.name ? `PIC: ${risk.owner.name}` : null,
            risk.level ? `Level: ${risk.level}` : null,
            risk.mitigation_plan ? `Mitigasi: ${risk.mitigation_plan}` : null,
            risk.follow_up ? `Follow-up: ${risk.follow_up}` : null,
        ].filter(Boolean).join("\n\n"),
    });
}

function RiskDrawer({ open, editing, programId, program, tasks, users, onClose, onSaved }) {
    const { message } = AntdApp.useApp();
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (editing) {
            form.setFieldsValue({
                work_program_task_id: editing.task?.id,
                type: editing.type || "risk",
                title: editing.title,
                description: editing.description,
                category: editing.category,
                likelihood: editing.likelihood || 3,
                impact: editing.impact || 3,
                status: editing.status || "open",
                mitigation_plan: editing.mitigation_plan,
                follow_up: editing.follow_up,
                evidence_note: editing.evidence_note,
                owner_user_id: editing.owner?.id,
                due_date: editing.due_date ? dayjs(editing.due_date) : null,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                type: "risk",
                likelihood: 3,
                impact: 3,
                status: "open",
            });
        }
    }, [editing, form, open]);

    const save = async () => {
        const values = await form.validateFields();
        const payload = cleanPayload({
            ...values,
            due_date: values.due_date?.format("YYYY-MM-DD"),
        });

        setSaving(true);
        try {
            if (editing) {
                await axios.patch(route("work-programs.risks.update", [programId, editing.id]), payload);
                message.success(tx("Risiko berhasil diperbarui.", "Risk updated successfully."));
            } else {
                await axios.post(route("work-programs.risks.store", programId), payload);
                message.success(tx("Risiko berhasil ditambahkan.", "Risk added successfully."));
            }
            onSaved();
            onClose();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Risiko belum dapat disimpan.", "The risk could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            title={editing ? tx("Edit Risiko/Kendala", "Edit Risk/Issue") : tx("Tambah Risiko/Kendala", "Add Risk/Issue")}
            size={620}
            open={open}
            onClose={() => {
                if (!saving) onClose();
            }}
            extra={
                <Space>
                    {riskCalendarUrl(editing, program) ? (
                        <Button icon={<CalendarOutlined />} href={riskCalendarUrl(editing, program)} target="_blank">
                            Reminder
                        </Button>
                    ) : null}
                    <Button onClick={onClose} disabled={saving}>{tx("Batal", "Cancel")}</Button>
                    <Button type="primary" onClick={save} loading={saving}>{tx("Simpan", "Save")}</Button>
                </Space>
            }
        >
            <Form layout="vertical" form={form}>
                <div className="grid gap-4 md:grid-cols-2">
                    <Form.Item label={tx("Task Terkait", "Related Task")} name="work_program_task_id">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={tasks.map((task) => ({
                                value: task.id,
                                label: `${task.task_code || task.id} - ${task.name}`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item label={tx("Tipe", "Type")} name="type" rules={[{ required: true, message: tx("Tipe wajib dipilih.", "Type is required.") }]}>
                        <Select
                            options={[
                                { value: "risk", label: tx("Risiko", "Risk") },
                                { value: "issue", label: tx("Kendala/Issue", "Issue") },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label={tx("Judul", "Title")} name="title" rules={[{ required: true, message: tx("Judul wajib diisi.", "Title is required.") }]} className="md:col-span-2">
                        <Input />
                    </Form.Item>
                    <Form.Item label={tx("Kategori", "Category")} name="category">
                        <Input placeholder={tx("Operasional, SDM, Anggaran, Vendor...", "Operations, HR, Budget, Vendor...")} />
                    </Form.Item>
                    <Form.Item label={tx("PIC Mitigasi", "Mitigation PIC")} name="owner_user_id">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={users.map((user) => ({
                                value: user.id,
                                label: `${user.name}${user.email ? ` - ${user.email}` : ""}`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item label={tx("Kemungkinan", "Likelihood")} name="likelihood" rules={[{ required: true, message: tx("Kemungkinan wajib diisi.", "Likelihood is required.") }]}>
                        <InputNumber min={1} max={5} className="w-full" />
                    </Form.Item>
                    <Form.Item label={tx("Dampak", "Impact")} name="impact" rules={[{ required: true, message: tx("Dampak wajib diisi.", "Impact is required.") }]}>
                        <InputNumber min={1} max={5} className="w-full" />
                    </Form.Item>
                    <Form.Item label={tx("Status", "Status")} name="status" rules={[{ required: true, message: tx("Status wajib dipilih.", "Status is required.") }]}>
                        <Select
                            options={[
                                { value: "open", label: "Open" },
                                { value: "mitigating", label: tx("Mitigasi", "Mitigating") },
                                { value: "resolved", label: "Resolved" },
                                { value: "closed", label: "Closed" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Deadline" name="due_date">
                        <DatePicker className="w-full" />
                    </Form.Item>
                    <Form.Item label={tx("Deskripsi", "Description")} name="description" className="md:col-span-2">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label={tx("Mitigasi", "Mitigation")} name="mitigation_plan" className="md:col-span-2">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label="Follow-up" name="follow_up" className="md:col-span-2">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label={tx("Catatan Evidence", "Evidence Notes")} name="evidence_note" className="md:col-span-2">
                        <TextArea rows={2} placeholder={tx("Lampiran fisik/dokumen akan dilengkapi pada step dokumen.", "Physical attachments/documents will be completed in the documents step.")} />
                    </Form.Item>
                </div>
            </Form>
        </Drawer>
    );
}

function ProgressDrawer({ open, task, programId, onClose, onSaved }) {
    const { message } = AntdApp.useApp();
    const { isEnglish, tx } = useBilingual();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !task) return;

        form.setFieldsValue({
            progress: task.progress || 0,
            status: task.status || "todo",
            actual_start_date: task.actual_start_date ? dayjs(task.actual_start_date) : null,
            actual_end_date: task.actual_end_date ? dayjs(task.actual_end_date) : null,
            notes: "",
        });
    }, [form, open, task]);

    const save = async () => {
        if (!task) return;

        const values = await form.validateFields();
        setSaving(true);
        try {
            await axios.patch(
                route("work-programs.tasks.progress", [programId, task.id]),
                cleanPayload({
                    progress: values.progress,
                    status: values.status,
                    actual_start_date: values.actual_start_date?.format("YYYY-MM-DD"),
                    actual_end_date: values.actual_end_date?.format("YYYY-MM-DD"),
                    notes: values.notes,
                    lock_version: task.lock_version,
                }),
            );
            message.success(tx("Progress task berhasil diperbarui.", "Task progress updated successfully."));
            onSaved();
            onClose();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Progress task belum dapat disimpan.", "Task progress could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            title={tx("Update Progress Task", "Update Task Progress")}
            size={520}
            open={open}
            onClose={() => {
                if (!saving) onClose();
            }}
            extra={
                <Space>
                    <Button onClick={onClose} disabled={saving}>{tx("Batal", "Cancel")}</Button>
                    <Button type="primary" onClick={save} loading={saving}>{tx("Simpan", "Save")}</Button>
                </Space>
            }
        >
            {task ? (
                <Space orientation="vertical" size="middle" className="w-full">
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="Task">{task.task_code || task.id} - {task.name}</Descriptions.Item>
                        <Descriptions.Item label="PIC">{task.pic?.name || "-"}</Descriptions.Item>
                        <Descriptions.Item label={tx("Rencana", "Planned Dates")}>{formatDate(task.planned_start_date)} - {formatDate(task.planned_end_date)}</Descriptions.Item>
                    </Descriptions>
                    <Form form={form} layout="vertical">
                        <Form.Item label={tx("Progres", "Progress")} name="progress" rules={[{ required: true, message: tx("Progress wajib diisi.", "Progress is required.") }]}>
                            <Space.Compact className="w-full">
                                <InputNumber min={0} max={100} className="w-full" />
                                <span className="inline-flex items-center rounded-r-md border border-l-0 border-zinc-300 bg-zinc-50 px-3 text-zinc-500">%</span>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label="Status" name="status">
                            <Select
                                options={[
                                    { value: "todo", label: (isEnglish ? STATUS_LABELS_EN : STATUS_LABELS).todo },
                                    { value: "in_progress", label: (isEnglish ? STATUS_LABELS_EN : STATUS_LABELS).in_progress },
                                    { value: "blocked", label: (isEnglish ? STATUS_LABELS_EN : STATUS_LABELS).blocked },
                                    { value: "completed", label: (isEnglish ? STATUS_LABELS_EN : STATUS_LABELS).completed },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item label={tx("Tanggal Mulai Aktual", "Actual Start Date")} name="actual_start_date">
                            <DatePicker className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Tanggal Selesai Aktual", "Actual End Date")} name="actual_end_date">
                            <DatePicker className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Catatan Update", "Update Notes")} name="notes">
                            <TextArea rows={3} maxLength={1000} showCount />
                        </Form.Item>
                    </Form>
                </Space>
            ) : null}
        </Drawer>
    );
}

export default function MonitoringPanel({ programId, options = {}, permissions = [] }) {
    const { message } = AntdApp.useApp();
    const { isEnglish, tx } = useBilingual();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState(null);
    const [deletingRisk, setDeletingRisk] = useState(null);
    const [progressTask, setProgressTask] = useState(null);
    const fetchMonitoring = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(route("work-programs.monitoring", programId));
            setData(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || tx("Data monitoring belum dapat dimuat.", "Monitoring data could not be loaded."));
        } finally {
            setLoading(false);
        }
    }, [programId, tx]);

    useEffect(() => {
        fetchMonitoring();
    }, [fetchMonitoring]);

    const taskOptions = data?.tasks || [];
    const program = data?.program || {};
    const users = options.users || [];
    const programLocked = LOCKED_PROGRAM_STATUSES.includes(program.status);
    const canManageRisks = permissions.includes("work_program.manage_tasks") && !programLocked;
    const canUpdateAnyTask = taskOptions.some((task) => task.can_update_progress);
    const progressLocked = data?.program && !["scheduled", "in_progress"].includes(data.program.status);

    const riskColumns = useMemo(
        () => [
            {
                title: tx("Risiko/Kendala", "Risk/Issue"),
                dataIndex: "title",
                render: (value, row) => (
                    <div>
                        <div className="font-semibold text-zinc-950">{value}</div>
                        <div className="text-xs text-zinc-500">{row.category || "-"} · {row.type}</div>
                    </div>
                ),
            },
            { title: "Level", dataIndex: "level", width: 110, render: levelTag },
            { title: "Score", width: 100, render: (_, row) => `${row.likelihood} x ${row.impact}` },
            { title: tx("Status", "Status"), dataIndex: "status", width: 130, render: (value) => statusTag(value, isEnglish) },
            { title: "PIC", width: 150, render: (_, row) => row.owner?.name || "-" },
            { title: "Deadline", dataIndex: "due_date", width: 130, render: formatDate },
            {
                title: "Reminder",
                width: 130,
                render: (_, row) => {
                    const calendarHref = riskCalendarUrl(row, program);

                    return calendarHref ? (
                        <Button size="small" icon={<CalendarOutlined />} href={calendarHref} target="_blank">
                            Reminder
                        </Button>
                    ) : null;
                },
            },
            {
                title: tx("Aksi", "Actions"),
                width: 110,
                align: "right",
                render: (_, row) =>
                    canManageRisks ? (
                        <Space>
                            <Button size="small" icon={<EditOutlined />} onClick={() => {
                                setEditingRisk(row);
                                setDrawerOpen(true);
                            }} />
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeletingRisk(row)} />
                        </Space>
                    ) : null,
            },
        ],
        [canManageRisks, isEnglish, program, tx],
    );

    const taskColumns = [
        {
            title: "Task",
            dataIndex: "name",
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-zinc-950">{row.task_code || row.id} - {value}</div>
                    <div className="text-xs text-zinc-500">{row.pic?.name || tx("PIC belum ada", "No PIC assigned")}</div>
                </div>
            ),
        },
        { title: tx("Status", "Status"), dataIndex: "status", width: 130, render: (value) => statusTag(value, isEnglish) },
        { title: "Progress", dataIndex: "progress", width: 160, render: (value) => <Progress percent={value || 0} size="small" /> },
        { title: "Deadline", dataIndex: "planned_end_date", width: 130, render: formatDate },
        {
            title: tx("Deviasi", "Deviation"),
            dataIndex: "schedule_deviation_days",
            width: 110,
            render: (value) => (value > 0 ? <Tag color="red">+{value} {tx("hari", "days")}</Tag> : <Tag color="green">0 {tx("hari", "days")}</Tag>),
        },
        {
            title: "",
            width: 260,
            align: "right",
            render: (_, row) => {
                const calendarHref = taskCalendarUrl(row, program);

                return (
                    <Space>
                        {calendarHref ? (
                            <Button size="small" icon={<CalendarOutlined />} href={calendarHref} target="_blank">
                                Reminder
                            </Button>
                        ) : null}
                        {row.can_update_progress ? (
                            <Button size="small" icon={<EditOutlined />} onClick={() => setProgressTask(row)}>
                                Update
                            </Button>
                        ) : null}
                    </Space>
                );
            },
        },
    ];

    const deleteRisk = async () => {
        if (!deletingRisk) return;
        try {
            await axios.delete(route("work-programs.risks.destroy", [programId, deletingRisk.id]));
            message.success(tx("Risiko berhasil dihapus.", "Risk removed successfully."));
            setDeletingRisk(null);
            fetchMonitoring();
        } catch (requestError) {
            message.error(requestError.response?.data?.message || tx("Risiko belum dapat dihapus.", "The risk could not be removed."));
        }
    };

    if (loading) {
        return (
            <Card>
                <div className="flex min-h-[260px] items-center justify-center">
                    <Spin>
                        <span className="sr-only">{tx("Memuat monitoring...", "Loading monitoring data...")}</span>
                    </Spin>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert
                type="error"
                showIcon
                title={tx("Monitoring tidak dapat dimuat", "Monitoring could not be loaded")}
                description={error}
                action={<Button icon={<ReloadOutlined />} onClick={fetchMonitoring}>{tx("Muat ulang", "Reload")}</Button>}
            />
        );
    }

    return (
        <>
            <Space orientation="vertical" size="middle" className="w-full">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Card>
                        <Statistic title={tx("Progres Program", "Program Progress")} value={data.progress?.value || 0} suffix="%" />
                        <Progress percent={data.progress?.value || 0} size="small" />
                        <Text className="text-xs text-zinc-500">{data.progress?.formula}</Text>
                    </Card>
                    <Card><Statistic title="Blocked" value={data.summary?.blocked_tasks || 0} /></Card>
                    <Card><Statistic title="Overdue" value={data.summary?.overdue_tasks || 0} /></Card>
                    <Card><Statistic title={tx("Mendekati Deadline", "Approaching Deadline")} value={data.summary?.approaching_deadline_tasks || 0} /></Card>
                    <Card><Statistic title="Extreme Risk" value={data.summary?.extreme_risks || 0} /></Card>
                </div>

                <Card title={tx("Rumus Progres", "Progress Formula")}>
                    <Descriptions column={{ xs: 1, md: 4 }} size="small" bordered>
                        <Descriptions.Item label={tx("Rumus", "Formula")}>{data.progress?.formula}</Descriptions.Item>
                        <Descriptions.Item label="Leaf Task">{data.progress?.leaf_task_count}</Descriptions.Item>
                        <Descriptions.Item label="Total Task">{data.progress?.total_task_count}</Descriptions.Item>
                        <Descriptions.Item label={tx("Task Berbobot", "Weighted Tasks")}>{data.progress?.weighted_task_count}</Descriptions.Item>
                    </Descriptions>
                    <Paragraph className="mb-0 mt-3 text-sm text-zinc-500">
                        {tx("Progress dihitung dari leaf task saja agar parent dan child tidak dihitung ganda. Jika bobot leaf task tersedia, sistem memakai weighted progress; jika tidak, sistem memakai rata-rata progress leaf task.", "Progress is calculated from leaf tasks only so parent and child tasks are not counted twice. If leaf task weights are available, weighted progress is used; otherwise, the average leaf task progress is used.")}
                    </Paragraph>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card title={tx("Task Terlambat", "Overdue Tasks")}>
                        <Table columns={taskColumns} dataSource={data.overdue_tasks || []} rowKey="id" pagination={false} locale={{ emptyText: <Empty description={tx("Tidak ada task overdue.", "No overdue tasks.")} /> }} scroll={{ x: 720 }} />
                    </Card>
                    <Card title={tx("Task Perlu Perhatian", "Tasks Requiring Attention")}>
                        <Table columns={taskColumns} dataSource={[...(data.blocked_tasks || []), ...(data.approaching_deadline_tasks || [])]} rowKey={(row) => `${row.id}-${row.is_overdue ? "overdue" : "watch"}`} pagination={false} locale={{ emptyText: <Empty description={tx("Tidak ada task yang perlu perhatian.", "No tasks require attention.")} /> }} scroll={{ x: 720 }} />
                    </Card>
                </div>

                <Card
                    title={tx("Update Progress Task", "Update Task Progress")}
                    extra={<Button icon={<ReloadOutlined />} onClick={fetchMonitoring}>Refresh</Button>}
                >
                    {programLocked ? (
                        <Alert
                            className="mb-4"
                            type="info"
                            showIcon
                            title={tx("Progress task dikunci", "Task progress is locked")}
                            description={tx("Program kerja sudah selesai atau final. Progress dan task hanya bisa diubah setelah ketua/reviewer membuka revisi program.", "The work program is completed or final. Progress and tasks can only be changed after the chair or reviewer opens a program revision.")}
                        />
                    ) : null}
                    {!programLocked && progressLocked ? (
                        <Alert
                            className="mb-4"
                            type="info"
                            showIcon
                            title={tx("Progress belum bisa diupdate", "Progress cannot be updated yet")}
                            description={tx("Program kerja harus dijadwalkan dulu. Setelah status menjadi Terjadwal atau Berjalan, PIC/assignee task dapat mengupdate progress masing-masing.", "The work program must be scheduled first. Once its status is Scheduled or In Progress, task PICs and assignees can update their progress.")}
                        />
                    ) : null}
                    {!progressLocked && !canUpdateAnyTask ? (
                        <Alert
                            className="mb-4"
                            type="warning"
                            showIcon
                            title={tx("Tidak ada task yang bisa Anda update", "No tasks are available for you to update")}
                            description={tx("Tombol Update hanya muncul untuk PIC task, assignee task, atau pengguna dengan akses update progress.", "The Update button only appears for task PICs, task assignees, or users with progress update access.")}
                        />
                    ) : null}
                    <Table
                        columns={taskColumns}
                        dataSource={data.tasks || []}
                        rowKey="id"
                        locale={{ emptyText: <Empty description={tx("Belum ada task untuk diupdate.", "No tasks are available to update.")} /> }}
                        scroll={{ x: 860 }}
                    />
                </Card>

                <Card
                    title="Risk Register"
                    extra={
                        canManageRisks ? (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                                setEditingRisk(null);
                                setDrawerOpen(true);
                            }}>
                                {tx("Tambah Risiko", "Add Risk")}
                            </Button>
                        ) : null
                    }
                >
                    {programLocked ? (
                        <Alert
                            className="mb-4"
                            type="info"
                            showIcon
                            title={tx("Risk register dikunci", "Risk register is locked")}
                            description={tx("Risiko dan kendala tidak dapat diubah setelah program selesai. Minta ketua/reviewer membuka revisi program jika data perlu diperbaiki.", "Risks and issues cannot be changed after the program is completed. Ask the chair or reviewer to open a program revision if the data needs correction.")}
                        />
                    ) : null}
                    <Table columns={riskColumns} dataSource={data.risks || []} rowKey="id" scroll={{ x: 980 }} />
                </Card>

                <Card title={tx("Riwayat Update Progres", "Progress Update History")}>
                    {(data.progress_history || []).length ? (
                        <Timeline
                            items={(data.progress_history || []).map((update) => ({
                                key: update.id,
                                color: update.progress_after >= update.progress_before ? "green" : "orange",
                                children: (
                                    <div>
                                        <div className="font-semibold text-zinc-950">
                                            {update.task?.task_code || update.task?.id} - {update.task?.name || "Program"}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {formatDateTime(update.updated_at)} {tx("oleh", "by")} {update.updater?.name || "-"} · {update.progress_before}% → {update.progress_after}%
                                        </div>
                                        {update.notes ? <Paragraph className="mb-0 mt-1 text-sm text-zinc-600">{update.notes}</Paragraph> : null}
                                    </div>
                                ),
                            }))}
                        />
                    ) : (
                        <Empty description={tx("Belum ada histori update progress.", "No progress update history yet.")} />
                    )}
                </Card>
            </Space>

            <RiskDrawer
                open={drawerOpen}
                editing={editingRisk}
                programId={programId}
                program={program}
                tasks={taskOptions}
                users={users}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditingRisk(null);
                }}
                onSaved={fetchMonitoring}
            />

            <ProgressDrawer
                open={Boolean(progressTask)}
                task={progressTask}
                programId={programId}
                onClose={() => setProgressTask(null)}
                onSaved={fetchMonitoring}
            />

            <Modal
                title={tx("Hapus risiko?", "Remove risk?")}
                open={Boolean(deletingRisk)}
                onCancel={() => setDeletingRisk(null)}
                onOk={deleteRisk}
                okText={tx("Hapus", "Remove")}
                okButtonProps={{ danger: true }}
            >
                {tx("Risiko", "Risk")} <strong>{deletingRisk?.title}</strong> {tx("akan dihapus dari register.", "will be removed from the register.")}
            </Modal>
        </>
    );
}
