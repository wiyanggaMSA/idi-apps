import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
    Alert,
    App as AntdApp,
    Button,
    Card,
    Checkbox,
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
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    CalendarOutlined,
    CaretDownOutlined,
    CaretRightOutlined,
    CompressOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { formatDate } from "@/lib/format";
import { buildGoogleCalendarUrl } from "@/lib/googleCalendar";

const { Paragraph, Text } = Typography;

const STATUS_LABELS = {
    todo: "Belum Mulai",
    in_progress: "Berjalan",
    blocked: "Terhambat",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    draft: "Draft",
    submitted: "Diajukan",
    under_review: "Direview",
    revision_requested: "Revisi",
    approved: "Disetujui",
    scheduled: "Terjadwal",
    on_hold: "Ditahan",
    rejected: "Ditolak",
};

const STATUS_COLORS = {
    todo: "default",
    in_progress: "processing",
    blocked: "red",
    completed: "success",
    cancelled: "volcano",
    approved: "green",
    scheduled: "cyan",
    under_review: "geekblue",
    revision_requested: "gold",
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

const ZOOM_CONFIG = {
    day: { label: "Harian", unit: "day", step: 1, width: 34, format: "DD MMM" },
    week: { label: "Mingguan", unit: "week", step: 1, width: 56, format: "week" },
    month: { label: "Bulanan", unit: "month", step: 1, width: 82, format: "MMM YYYY" },
    quarter: { label: "Kuartal", unit: "month", step: 3, width: 118, format: "quarter" },
};

const LOCKED_PROGRAM_STATUSES = ["completed", "evaluated", "archived", "cancelled", "rejected"];

function statusTag(status) {
    return <Tag color={STATUS_COLORS[status] || "default"}>{STATUS_LABELS[status] || status || "-"}</Tag>;
}

function priorityTag(priority) {
    return <Tag color={PRIORITY_COLORS[priority] || "default"}>{PRIORITY_LABELS[priority] || priority || "-"}</Tag>;
}

function cleanPayload(payload) {
    const cleaned = { ...payload };
    Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === "") {
            delete cleaned[key];
        }
    });

    return cleaned;
}

function safeDate(value, fallback = null) {
    if (!value) return fallback;
    const date = dayjs(value);
    return date.isValid() ? date : fallback;
}

function isOverdue(task) {
    return (
        task.planned_end_date &&
        dayjs(task.planned_end_date).isBefore(dayjs(), "day") &&
        !["completed", "cancelled"].includes(task.status)
    );
}

function buildTaskTree(tasks, programId) {
    const byParent = new Map();
    tasks.forEach((task) => {
        const parent = task.parent_id || programId;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(task);
    });

    return byParent;
}

function flattenTasks({ byParent, parentId, collapsed, depth = 0 }) {
    const children = byParent.get(parentId) || [];

    return children.flatMap((task) => {
        const hasChildren = (byParent.get(task.id) || []).length > 0;
        const row = { ...task, depth, hasChildren };

        if (collapsed.has(task.id)) {
            return [row];
        }

        return [
            row,
            ...flattenTasks({
                byParent,
                parentId: task.id,
                collapsed,
                depth: depth + 1,
            }),
        ];
    });
}

function buildTimelineColumns(tasks, program, zoom) {
    const config = ZOOM_CONFIG[zoom];
    const dates = [
        program?.planned_start_date,
        program?.planned_end_date,
        ...tasks.flatMap((task) => [task.planned_start_date, task.planned_end_date]),
        dayjs().format("YYYY-MM-DD"),
    ]
        .map((value) => safeDate(value))
        .filter(Boolean);

    const min = dates.length ? dayjs.min ? dayjs.min(dates) : dates.reduce((a, b) => (a.isBefore(b) ? a : b)) : dayjs();
    const max = dates.length ? dayjs.max ? dayjs.max(dates) : dates.reduce((a, b) => (a.isAfter(b) ? a : b)) : dayjs().add(30, "day");
    const start = min.startOf(config.unit).subtract(config.step, config.unit);
    const end = max.endOf(config.unit).add(config.step, config.unit);
    const columns = [];
    let cursor = start;

    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
        columns.push({
            key: cursor.format("YYYY-MM-DD"),
            start: cursor,
            end: cursor.add(config.step, config.unit),
            label:
                config.format === "quarter"
                    ? `Q${Math.floor(cursor.month() / 3) + 1} ${cursor.year()}`
                    : config.format === "week"
                      ? `${cursor.format("DD MMM")} - ${cursor.add(6, "day").format("DD MMM")}`
                    : cursor.format(config.format),
        });
        cursor = cursor.add(config.step, config.unit);
    }

    return columns;
}

function positionForDate(date, columns, zoom) {
    if (!date || !columns.length) return 0;
    const parsed = safeDate(date, columns[0].start);
    const config = ZOOM_CONFIG[zoom];
    const start = columns[0].start;
    const diffDays = Math.max(0, parsed.diff(start, "day"));

    if (zoom === "day") return diffDays * config.width;
    if (zoom === "week") return (diffDays / 7) * config.width;
    if (zoom === "month") return (diffDays / 30) * config.width;
    return (diffDays / 91) * config.width;
}

function widthForTask(task, columns, zoom) {
    if (task.is_milestone) return 18;
    const start = safeDate(task.planned_start_date);
    const end = safeDate(task.planned_end_date, start);
    if (!start || !end) return 24;
    const startPx = positionForDate(start, columns, zoom);
    const endPx = positionForDate(end.add(1, "day"), columns, zoom);

    return Math.max(24, endPx - startPx);
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
        .map((assignee) => assignee.name)
        .filter(Boolean)
        .join(", ");

    return buildGoogleCalendarUrl({
        title: `${task.is_milestone ? "Milestone" : "Reminder Task"}: ${task.name}`,
        start: task.planned_end_date,
        end: task.planned_end_date,
        allDay: true,
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

export default function GanttChart({ programId, permissions = [], onChanged }) {
    const { message } = AntdApp.useApp();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState("week");
    const [collapsed, setCollapsed] = useState(new Set());
    const [filters, setFilters] = useState({
        status: "",
        priority: "",
        pic_user_id: "",
        overdue: "",
    });
    const [selectedTask, setSelectedTask] = useState(null);
    const [drawerMode, setDrawerMode] = useState("edit");
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchDataset = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(route("work-programs.gantt", programId));
            setDataset(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Data Gantt belum dapat dimuat.");
        } finally {
            setLoading(false);
        }
    }, [programId]);

    useEffect(() => {
        fetchDataset();
    }, [fetchDataset]);

    const tasks = dataset?.tasks || [];
    const program = dataset?.program || null;
    const programLocked = LOCKED_PROGRAM_STATUSES.includes(program?.status);
    const canManageTasks = permissions.includes("work_program.manage_tasks") && !programLocked;
    const canUpdateProgress = permissions.includes("work_program.update_progress") && ["scheduled", "in_progress"].includes(program?.status);
    const canEditAny = canManageTasks || canUpdateProgress;

    const userOptions = useMemo(() => {
        const unique = new Map();
        (dataset?.users || []).forEach((user) => {
            if (user.id) {
                unique.set(user.id, `${user.name}${user.email ? ` (${user.email})` : ""}`);
            }
        });
        tasks.forEach((task) => {
            if (task.pic?.id) {
                unique.set(task.pic.id, `${task.pic.name}${task.pic.email ? ` (${task.pic.email})` : ""}`);
            }
            (task.assignees || []).forEach((assignee) => {
                if (assignee.id) unique.set(assignee.id, `${assignee.name}${assignee.email ? ` (${assignee.email})` : ""}`);
            });
        });

        return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
    }, [dataset?.users, tasks]);

    const picOptions = userOptions;
    const parentTaskOptions = useMemo(
        () =>
            tasks.map((task) => ({
                value: task.database_id,
                label: `${task.task_code || `TASK-${task.database_id}`} - ${task.name}`,
            })),
        [tasks],
    );

    const filteredTasks = useMemo(
        () =>
            tasks.filter((task) => {
                if (filters.status && task.status !== filters.status) return false;
                if (filters.priority && task.priority !== filters.priority) return false;
                if (filters.pic_user_id) {
                    const picMatch = Number(task.pic?.id) === Number(filters.pic_user_id);
                    const assigneeMatch = (task.assignees || []).some(
                        (assignee) => Number(assignee.id) === Number(filters.pic_user_id),
                    );
                    if (!picMatch && !assigneeMatch) return false;
                }
                if (filters.overdue === "yes" && !isOverdue(task)) return false;
                if (filters.overdue === "no" && isOverdue(task)) return false;

                return true;
            }),
        [filters, tasks],
    );

    const byParent = useMemo(() => buildTaskTree(filteredTasks, program?.id), [filteredTasks, program?.id]);
    const visibleTasks = useMemo(
        () => flattenTasks({ byParent, parentId: program?.id, collapsed }),
        [byParent, collapsed, program?.id],
    );
    const columns = useMemo(() => buildTimelineColumns(filteredTasks, program, zoom), [filteredTasks, program, zoom]);
    const timelineWidth = columns.length * ZOOM_CONFIG[zoom].width;
    const todayX = positionForDate(dayjs(), columns, zoom);
    const rowHeight = 48;
    const taskRowMap = useMemo(() => {
        const map = new Map();
        visibleTasks.forEach((task, index) => {
            map.set(task.id, {
                task,
                index,
                y: index * rowHeight + rowHeight / 2,
                startX: positionForDate(task.planned_start_date, columns, zoom),
                endX: positionForDate(task.planned_end_date, columns, zoom) + (task.is_milestone ? 9 : 0),
            });
        });
        return map;
    }, [columns, visibleTasks, zoom]);

    const visibleDependencies = (dataset?.dependencies || []).filter(
        (dependency) => taskRowMap.has(dependency.source) && taskRowMap.has(dependency.target),
    );

    const openTask = (task) => {
        setDrawerMode("edit");
        setSelectedTask(task);
        form.setFieldsValue({
            name: task.name,
            task_code: task.task_code,
            description: task.description,
            parent_task_id: task.parent_task_id,
            pic_user_id: task.pic?.id,
            assignee_user_ids: (task.assignees || []).map((assignee) => assignee.id),
            priority: task.priority || "medium",
            weight: Number(task.weight || 0),
            is_milestone: Boolean(task.is_milestone),
            planned_start_date: safeDate(task.planned_start_date),
            planned_end_date: safeDate(task.planned_end_date),
            progress: task.progress || 0,
            status: task.status,
            actual_start_date: safeDate(task.actual_start_date),
            actual_end_date: safeDate(task.actual_end_date),
            notes: "",
        });
    };

    const openCreateTask = () => {
        if (!canManageTasks) return;
        setDrawerMode("create");
        setSelectedTask({
            name: "",
            task_code: "",
            database_id: null,
            parent_task_id: null,
            pic: null,
            assignees: [],
            is_milestone: false,
            lock_version: 0,
        });
        form.setFieldsValue({
            name: "",
            task_code: "",
            description: "",
            parent_task_id: undefined,
            pic_user_id: program?.primary_pic?.id,
            assignee_user_ids: [],
            priority: "medium",
            weight: 0,
            is_milestone: false,
            planned_start_date: safeDate(program?.planned_start_date, dayjs()),
            planned_end_date: safeDate(program?.planned_end_date, dayjs()),
            progress: 0,
            status: "todo",
            actual_start_date: null,
            actual_end_date: null,
            notes: "",
        });
    };

    const closeTask = () => {
        if (saving) return;
        setSelectedTask(null);
        setDrawerMode("edit");
        form.resetFields();
    };

    const saveTask = async () => {
        if (!selectedTask) return;
        const values = await form.validateFields();
        const isCreate = drawerMode === "create";

        Modal.confirm({
            title: isCreate ? "Tambah task program kerja?" : "Simpan perubahan task?",
            content: isCreate
                ? "Task baru akan menjadi aktivitas program kerja dan dapat dipakai untuk menjadwalkan Gantt."
                : "Jadwal/progres akan disimpan ke backend. Jika data sudah berubah, server akan menolak dan timeline tetap memakai data terakhir.",
            okText: isCreate ? "Tambah" : "Simpan",
            cancelText: "Batal",
            onOk: async () => {
                setSaving(true);

                try {
                    if (isCreate) {
                        await axios.post(
                            route("work-programs.tasks.store", program.database_id),
                            cleanPayload({
                                name: values.name,
                                task_code: values.task_code,
                                description: values.description,
                                parent_task_id: values.parent_task_id,
                                pic_user_id: values.pic_user_id,
                                assignee_user_ids: values.assignee_user_ids || [],
                                priority: values.priority,
                                weight: values.weight,
                                is_milestone: values.is_milestone || false,
                                planned_start_date: values.planned_start_date?.format("YYYY-MM-DD"),
                                planned_end_date: values.planned_end_date?.format("YYYY-MM-DD"),
                                progress: values.progress,
                                status: values.status,
                                actual_start_date: values.actual_start_date?.format("YYYY-MM-DD"),
                                actual_end_date: values.actual_end_date?.format("YYYY-MM-DD"),
                                notes: values.notes,
                            }),
                        );
                    } else if (canManageTasks) {
                        await axios.patch(
                            route("work-programs.tasks.update", [program.database_id, selectedTask.database_id]),
                            cleanPayload({
                                name: values.name,
                                task_code: values.task_code,
                                description: values.description,
                                parent_task_id: values.parent_task_id,
                                pic_user_id: values.pic_user_id,
                                assignee_user_ids: values.assignee_user_ids || [],
                                priority: values.priority,
                                weight: values.weight,
                                is_milestone: values.is_milestone || false,
                                planned_start_date: values.planned_start_date?.format("YYYY-MM-DD"),
                                planned_end_date: values.planned_end_date?.format("YYYY-MM-DD"),
                                progress: values.progress,
                                status: values.status,
                                actual_start_date: values.actual_start_date?.format("YYYY-MM-DD"),
                                actual_end_date: values.actual_end_date?.format("YYYY-MM-DD"),
                                notes: values.notes,
                                lock_version: selectedTask.lock_version,
                            }),
                        );
                    } else {
                        await axios.patch(
                            route("work-programs.tasks.progress", [program.database_id, selectedTask.database_id]),
                            cleanPayload({
                                progress: values.progress,
                                status: values.status,
                                actual_start_date: values.actual_start_date?.format("YYYY-MM-DD"),
                                actual_end_date: values.actual_end_date?.format("YYYY-MM-DD"),
                                notes: values.notes,
                                lock_version: selectedTask.lock_version,
                            }),
                        );
                    }

                    message.success(isCreate ? "Task berhasil ditambahkan." : "Task berhasil diperbarui.");
                    setSelectedTask(null);
                    setDrawerMode("edit");
                    form.resetFields();
                    await fetchDataset();
                    onChanged?.();
                } catch (requestError) {
                    message.error(requestError.response?.data?.message || "Perubahan task ditolak oleh backend.");
                    await fetchDataset();
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    const toggleCollapse = (taskId) => {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <Card>
                <div className="flex min-h-[320px] items-center justify-center">
                    <Spin>
                        <span className="sr-only">Memuat data Gantt...</span>
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
                title="Gantt tidak dapat dimuat"
                description={error}
                action={<Button icon={<ReloadOutlined />} onClick={fetchDataset}>Muat ulang</Button>}
            />
        );
    }

    if (!tasks.length) {
        return (
            <>
                <Card
                    title="Gantt Program Kerja"
                    extra={
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchDataset}>Refresh</Button>
                            {canManageTasks ? (
                                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>
                                    Tambah Task
                                </Button>
                            ) : null}
                        </Space>
                    }
                >
                    {programLocked ? (
                        <Alert
                            className="mb-4"
                            type="info"
                            showIcon
                            title="Gantt dikunci"
                            description="Program kerja sudah selesai atau final. Task baru hanya bisa ditambahkan setelah ketua/reviewer membuka revisi program."
                        />
                    ) : null}
                    <Empty
                        description={
                            canManageTasks
                                ? "Belum ada task. Tambahkan aktivitas dulu sebelum program kerja dijadwalkan."
                                : "Belum ada task untuk ditampilkan sebagai Gantt."
                        }
                    >
                        {canManageTasks ? (
                            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>
                                Tambah Task Pertama
                            </Button>
                        ) : null}
                    </Empty>
                </Card>

                <Drawer
                    title="Tambah Task Gantt"
                    size={520}
                    open={Boolean(selectedTask)}
                    onClose={closeTask}
                    extra={
                        <Space>
                            <Button onClick={closeTask} disabled={saving}>Tutup</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={saveTask} loading={saving}>
                                Tambah
                            </Button>
                        </Space>
                    }
                >
                    {selectedTask ? (
                        <Form form={form} layout="vertical" disabled={saving}>
                            <Form.Item label="Nama Task / Aktivitas" name="name" rules={[{ required: true, message: "Nama task wajib diisi." }]}>
                                <Input maxLength={255} />
                            </Form.Item>
                            <Form.Item label="Kode Task" name="task_code">
                                <Input maxLength={255} placeholder="Opsional" />
                            </Form.Item>
                            <Form.Item label="Deskripsi" name="description">
                                <Input.TextArea rows={3} maxLength={2000} showCount />
                            </Form.Item>
                            <Form.Item label="PIC" name="pic_user_id">
                                <Select allowClear showSearch optionFilterProp="label" options={userOptions} />
                            </Form.Item>
                            <Form.Item label="Tim / Assignee" name="assignee_user_ids">
                                <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={userOptions} />
                            </Form.Item>
                            <Form.Item label="Tanggal Mulai Rencana" name="planned_start_date" rules={[{ required: true, message: "Tanggal mulai wajib diisi." }]}>
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label="Tanggal Selesai Rencana" name="planned_end_date" rules={[{ required: true, message: "Tanggal selesai wajib diisi." }]}>
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label="Prioritas" name="priority">
                                <Select options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} />
                            </Form.Item>
                            <Form.Item label="Bobot" name="weight">
                                <InputNumber min={0} className="w-full" />
                            </Form.Item>
                            <Form.Item label="Progress" name="progress">
                                <Space.Compact className="w-full">
                                    <InputNumber min={0} max={100} className="w-full" />
                                    <span className="inline-flex items-center rounded-r-md border border-l-0 border-zinc-300 bg-zinc-50 px-3 text-zinc-500">%</span>
                                </Space.Compact>
                            </Form.Item>
                            <Form.Item label="Status" name="status">
                                <Select options={["todo", "in_progress", "blocked", "completed", "cancelled"].map((value) => ({ value, label: STATUS_LABELS[value] }))} />
                            </Form.Item>
                            <Form.Item name="is_milestone" valuePropName="checked">
                                <Checkbox>Jadikan milestone</Checkbox>
                            </Form.Item>
                        </Form>
                    ) : null}
                </Drawer>
            </>
        );
    }

    return (
        <>
            <Card
                title="Gantt Program Kerja"
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchDataset}>Refresh</Button>
                        {canManageTasks ? (
                            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>
                                Tambah Task
                            </Button>
                        ) : null}
                    </Space>
                }
            >
                <Space orientation="vertical" size="middle" className="w-full">
                    {programLocked ? (
                        <Alert
                            type="info"
                            showIcon
                            title="Gantt dikunci"
                            description="Program kerja sudah selesai atau final. Jadwal dan task hanya bisa diubah setelah ketua/reviewer membuka revisi program."
                        />
                    ) : null}
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                        <Descriptions size="small" column={{ xs: 1, md: 4 }} bordered>
                            <Descriptions.Item label="Periode">{formatDate(program?.planned_start_date)} - {formatDate(program?.planned_end_date)}</Descriptions.Item>
                            <Descriptions.Item label="Tahun">{safeDate(program?.planned_start_date)?.year() || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Bidang">{program?.division?.name || "-"}</Descriptions.Item>
                            <Descriptions.Item label="Status">{statusTag(program?.status)}</Descriptions.Item>
                        </Descriptions>
                        <Progress type="dashboard" percent={program?.progress || 0} size={108} />
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="space-y-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Zoom</Text>
                            <Select
                                value={zoom}
                                onChange={setZoom}
                                style={{ width: 150 }}
                                options={Object.entries(ZOOM_CONFIG).map(([value, config]) => ({
                                    value,
                                    label: config.label,
                                }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Status Task</Text>
                            <Select
                                allowClear
                                value={filters.status || undefined}
                                onChange={(value) => setFilters((prev) => ({ ...prev, status: value || "" }))}
                                style={{ width: 170 }}
                                options={["todo", "in_progress", "blocked", "completed", "cancelled"].map((value) => ({
                                    value,
                                    label: STATUS_LABELS[value],
                                }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Prioritas</Text>
                            <Select
                                allowClear
                                value={filters.priority || undefined}
                                onChange={(value) => setFilters((prev) => ({ ...prev, priority: value || "" }))}
                                style={{ width: 145 }}
                                options={["low", "medium", "high", "critical"].map((value) => ({
                                    value,
                                    label: PRIORITY_LABELS[value],
                                }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">PIC</Text>
                            <Select
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                value={filters.pic_user_id || undefined}
                                onChange={(value) => setFilters((prev) => ({ ...prev, pic_user_id: value || "" }))}
                                style={{ width: 190 }}
                                options={picOptions}
                            />
                        </div>
                        <div className="space-y-1">
                            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Overdue</Text>
                            <Select
                                allowClear
                                value={filters.overdue || undefined}
                                onChange={(value) => setFilters((prev) => ({ ...prev, overdue: value || "" }))}
                                style={{ width: 140 }}
                                options={[
                                    { value: "yes", label: "Overdue" },
                                    { value: "no", label: "Tidak" },
                                ]}
                            />
                        </div>
                        <Button
                            icon={<CompressOutlined />}
                            onClick={() => setCollapsed(new Set(filteredTasks.map((task) => task.id)))}
                        >
                            Collapse
                        </Button>
                        <Button onClick={() => setCollapsed(new Set())}>Expand</Button>
                    </div>

                    <div className="lg:hidden">
                        <Space orientation="vertical" className="w-full">
                            {visibleTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left"
                                >
                                    <button type="button" onClick={() => openTask(task)} className="w-full text-left">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-semibold text-zinc-950">{task.task_code || `TASK-${task.database_id}`} - {task.name}</span>
                                            {task.is_milestone ? <Tag color="purple">Milestone</Tag> : null}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                                            <span>{formatDate(task.planned_start_date)} - {formatDate(task.planned_end_date)}</span>
                                            {statusTag(task.status)}
                                            {priorityTag(task.priority)}
                                            {isOverdue(task) ? <Tag color="red">Overdue</Tag> : null}
                                        </div>
                                        <Progress className="mt-2" percent={task.progress || 0} size="small" />
                                    </button>
                                    {taskCalendarUrl(task, program) ? (
                                        <Button
                                            className="mt-3"
                                            size="small"
                                            icon={<CalendarOutlined />}
                                            href={taskCalendarUrl(task, program)}
                                            target="_blank"
                                        >
                                            Tambahkan Reminder
                                        </Button>
                                    ) : null}
                                </div>
                            ))}
                        </Space>
                    </div>

                    <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 lg:block">
                        <div className="grid grid-cols-[360px_1fr] bg-zinc-50">
                            <div className="border-r border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Task Tree
                            </div>
                            <div className="overflow-x-auto">
                                <div className="flex" style={{ width: timelineWidth }}>
                                    {columns.map((column) => (
                                        <div
                                            key={column.key}
                                            className="border-r border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-500"
                                            style={{ width: ZOOM_CONFIG[zoom].width }}
                                        >
                                            {column.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid max-h-[640px] grid-cols-[360px_1fr] overflow-y-auto">
                            <div className="border-r border-zinc-200">
                                {visibleTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex h-12 items-center gap-2 border-b border-zinc-100 px-3"
                                        style={{ paddingLeft: 12 + task.depth * 18 }}
                                    >
                                        {task.hasChildren ? (
                                            <Button
                                                size="small"
                                                type="text"
                                                icon={collapsed.has(task.id) ? <CaretRightOutlined /> : <CaretDownOutlined />}
                                                onClick={() => toggleCollapse(task.id)}
                                            />
                                        ) : (
                                            <span className="w-6" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => openTask(task)}
                                            className="min-w-0 flex-1 text-left"
                                        >
                                            <div className="truncate text-sm font-semibold text-zinc-950">
                                                {task.task_code || `TASK-${task.database_id}`} - {task.name}
                                            </div>
                                            <div className="truncate text-xs text-zinc-500">{task.pic?.name || "PIC belum ada"}</div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="overflow-x-auto">
                                <div className="relative" style={{ width: timelineWidth, height: visibleTasks.length * rowHeight }}>
                                    {columns.map((column, index) => (
                                        <div
                                            key={column.key}
                                            className={index % 2 ? "absolute top-0 h-full bg-zinc-50/55" : "absolute top-0 h-full bg-white"}
                                            style={{
                                                left: index * ZOOM_CONFIG[zoom].width,
                                                width: ZOOM_CONFIG[zoom].width,
                                            }}
                                        />
                                    ))}
                                    {todayX >= 0 && todayX <= timelineWidth ? (
                                        <div
                                            className="absolute top-0 z-20 h-full border-l-2 border-red-500"
                                            style={{ left: todayX }}
                                        >
                                            <span className="absolute -left-8 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                Hari ini
                                            </span>
                                        </div>
                                    ) : null}
                                    <svg className="pointer-events-none absolute inset-0 z-10" width={timelineWidth} height={visibleTasks.length * rowHeight}>
                                        {visibleDependencies.map((dependency) => {
                                            const source = taskRowMap.get(dependency.source);
                                            const target = taskRowMap.get(dependency.target);
                                            const startX = source.endX + 4;
                                            const endX = target.startX - 4;
                                            const middleX = Math.max(startX + 14, (startX + endX) / 2);
                                            const path = `M ${startX} ${source.y} L ${middleX} ${source.y} L ${middleX} ${target.y} L ${endX} ${target.y}`;

                                            return (
                                                <g key={dependency.id}>
                                                    <path d={path} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray={dependency.lag_days ? "4 3" : undefined} />
                                                    <path d={`M ${endX} ${target.y} l -6 -4 v 8 z`} fill="#64748b" />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    {visibleTasks.map((task, index) => {
                                        const left = positionForDate(task.planned_start_date, columns, zoom);
                                        const width = widthForTask(task, columns, zoom);
                                        const overdue = isOverdue(task);
                                        const top = index * rowHeight + 12;

                                        return (
                                            <Tooltip
                                                key={task.id}
                                                title={
                                                    <div>
                                                        <div className="font-semibold">{task.name}</div>
                                                        <div>{formatDate(task.planned_start_date)} - {formatDate(task.planned_end_date)}</div>
                                                        <div>Progress {task.progress || 0}%</div>
                                                    </div>
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => openTask(task)}
                                                    className={`absolute z-30 h-6 border text-left text-xs font-semibold shadow-sm transition hover:brightness-95 ${
                                                        overdue
                                                            ? "border-red-300 bg-red-100 text-red-900"
                                                            : task.is_milestone
                                                              ? "border-purple-300 bg-purple-100 text-purple-900"
                                                              : "border-sky-300 bg-sky-100 text-sky-950"
                                                    }`}
                                                    style={{
                                                        left,
                                                        top,
                                                        width,
                                                        transform: task.is_milestone ? "rotate(45deg)" : undefined,
                                                        borderRadius: task.is_milestone ? 3 : 8,
                                                    }}
                                                >
                                                    {task.is_milestone ? (
                                                        <span className="sr-only">Milestone {task.name}</span>
                                                    ) : (
                                                        <span className="block h-full overflow-hidden rounded-lg">
                                                            <span
                                                                className="block h-full bg-sky-500/45"
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            />
                                                            <span className="absolute inset-0 truncate px-2 leading-6">
                                                                {task.name}
                                                            </span>
                                                        </span>
                                                    )}
                                                </button>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Paragraph className="mb-0 text-xs text-zinc-500">
                        Gantt ini memakai custom fallback tanpa dependency Gantt komersial. Perubahan tidak dioptimistic-update; timeline dimuat ulang setelah backend menerima data.
                    </Paragraph>
                </Space>
            </Card>

            <Drawer
                title={drawerMode === "create" ? "Tambah Task Gantt" : "Detail Task Gantt"}
                size={520}
                open={Boolean(selectedTask)}
                onClose={closeTask}
                extra={
                    <Space>
                        {drawerMode === "edit" && taskCalendarUrl(selectedTask, program) ? (
                            <Button icon={<CalendarOutlined />} href={taskCalendarUrl(selectedTask, program)} target="_blank">
                                Reminder
                            </Button>
                        ) : null}
                        <Button onClick={closeTask} disabled={saving}>Tutup</Button>
                        <Button
                            type="primary"
                            icon={drawerMode === "create" ? <PlusOutlined /> : <EditOutlined />}
                            onClick={saveTask}
                            loading={saving}
                            disabled={drawerMode === "create" ? !canManageTasks : !canEditAny}
                        >
                            {drawerMode === "create" ? "Tambah" : "Simpan"}
                        </Button>
                    </Space>
                }
            >
                {selectedTask ? (
                    <Space orientation="vertical" size="middle" className="w-full">
                        {drawerMode === "edit" && !canEditAny ? (
                            <Alert type="info" showIcon title="Anda dapat melihat task ini, tetapi tidak memiliki aksi update yang tersedia." />
                        ) : null}
                        {drawerMode === "edit" ? (
                            <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label="Task">{selectedTask.task_code || `TASK-${selectedTask.database_id}`} - {selectedTask.name}</Descriptions.Item>
                                <Descriptions.Item label="PIC">{selectedTask.pic?.name || "-"}</Descriptions.Item>
                                <Descriptions.Item label="Assignee">
                                    {(selectedTask.assignees || []).map((assignee) => assignee.name).join(", ") || "-"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Milestone">{selectedTask.is_milestone ? "Ya" : "Tidak"}</Descriptions.Item>
                                <Descriptions.Item label="Dependency Keluar">
                                    {(dataset?.dependencies || []).filter((dependency) => dependency.source === selectedTask.id).length}
                                </Descriptions.Item>
                            </Descriptions>
                        ) : (
                            <Alert type="info" showIcon title="Task baru akan muncul sebagai Aktivitas, Gantt, dan Tim sesuai PIC/assignee yang dipilih." />
                        )}
                        <Form form={form} layout="vertical" disabled={saving || !canEditAny}>
                            {canManageTasks ? (
                                <>
                                    <Form.Item
                                        label="Nama Task / Aktivitas"
                                        name="name"
                                        rules={[{ required: true, message: "Nama task wajib diisi." }]}
                                    >
                                        <Input maxLength={255} />
                                    </Form.Item>
                                    <Form.Item label="Kode Task" name="task_code">
                                        <Input maxLength={255} placeholder="Opsional" />
                                    </Form.Item>
                                    <Form.Item label="Parent Task" name="parent_task_id">
                                        <Select
                                            allowClear
                                            showSearch
                                            optionFilterProp="label"
                                            options={parentTaskOptions.filter((option) => option.value !== selectedTask.database_id)}
                                            placeholder="Opsional"
                                        />
                                    </Form.Item>
                                    <Form.Item label="Deskripsi" name="description">
                                        <Input.TextArea rows={3} maxLength={2000} showCount />
                                    </Form.Item>
                                    <Form.Item label="PIC" name="pic_user_id">
                                        <Select allowClear showSearch optionFilterProp="label" options={userOptions} />
                                    </Form.Item>
                                    <Form.Item label="Tim / Assignee" name="assignee_user_ids">
                                        <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={userOptions} />
                                    </Form.Item>
                                </>
                            ) : null}
                            <Form.Item
                                label="Tanggal Mulai Rencana"
                                name="planned_start_date"
                                rules={canManageTasks ? [{ required: true, message: "Tanggal mulai wajib diisi." }] : []}
                            >
                                <DatePicker className="w-full" disabled={!canManageTasks} />
                            </Form.Item>
                            <Form.Item
                                label="Tanggal Selesai Rencana"
                                name="planned_end_date"
                                rules={canManageTasks ? [{ required: true, message: "Tanggal selesai wajib diisi." }] : []}
                            >
                                <DatePicker className="w-full" disabled={!canManageTasks} />
                            </Form.Item>
                            <Form.Item label="Progress" name="progress" rules={[{ required: true, message: "Progress wajib diisi." }]}>
                                <Space.Compact className="w-full">
                                    <InputNumber min={0} max={100} className="w-full" />
                                    <span className="inline-flex items-center rounded-r-md border border-l-0 border-zinc-300 bg-zinc-50 px-3 text-zinc-500">%</span>
                                </Space.Compact>
                            </Form.Item>
                            <Form.Item label="Status" name="status" rules={[{ required: true, message: "Status wajib dipilih." }]}>
                                <Select
                                    options={["todo", "in_progress", "blocked", "completed", "cancelled"].map((value) => ({
                                        value,
                                        label: STATUS_LABELS[value],
                                    }))}
                                />
                            </Form.Item>
                            {canManageTasks ? (
                                <>
                                    <Form.Item label="Prioritas" name="priority">
                                        <Select options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} />
                                    </Form.Item>
                                    <Form.Item label="Bobot" name="weight">
                                        <InputNumber min={0} className="w-full" />
                                    </Form.Item>
                                    <Form.Item name="is_milestone" valuePropName="checked">
                                        <Checkbox>Jadikan milestone</Checkbox>
                                    </Form.Item>
                                </>
                            ) : null}
                            <Form.Item label="Tanggal Mulai Aktual" name="actual_start_date">
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label="Tanggal Selesai Aktual" name="actual_end_date">
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label="Catatan Update" name="notes">
                                <Input.TextArea rows={3} maxLength={1000} showCount />
                            </Form.Item>
                        </Form>
                    </Space>
                ) : null}
            </Drawer>
        </>
    );
}
