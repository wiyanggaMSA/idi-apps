import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    EditOutlined,
    EyeOutlined,
    FilterOutlined,
    HistoryOutlined,
    MoreOutlined,
    PlusOutlined,
    ReloadOutlined,
    StopOutlined,
    SwapOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    Descriptions,
    Drawer,
    Dropdown,
    Empty,
    Select,
    Space,
    Spin,
    Tabs,
    Tag,
} from "antd";
import DataTable from "@/Components/App/DataTable";
import FilterBar from "@/Components/App/FilterBar";
import LoadingSkeleton from "@/Components/App/LoadingSkeleton";
import SearchInput from "@/Components/App/SearchInput";
import { formatDate } from "@/lib/format";
import AssignmentManagementDrawer from "@/Components/Organization/AssignmentManagementDrawer";
import { ORGANIZATION_DATA_CHANGED } from "@/Components/Organization/events";
import useBilingual from "@/Hooks/useBilingual";

const DEFAULT_FILTERS = {
    search: "",
    unit_id: "",
    position_id: "",
    status: "",
    role_id: "",
    account: "",
    sort: "created_at",
    direction: "desc",
    page: 1,
    per_page: 15,
};

const STATUS_COLORS = {
    draft: "gold",
    active: "green",
    ended: "default",
    replaced: "orange",
    cancelled: "red",
};

function initials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || <UserOutlined />;
}

function displayName(member) {
    if (!member) return "—";
    return member.education ? `${member.full_name}, ${member.education}` : member.full_name;
}

function AccountTag({ account }) {
    const { tx } = useBilingual();
    if (!account?.exists) return <Tag>{tx("Belum Ada", "Not Available")}</Tag>;
    return <Tag color={account.is_active ? "green" : "orange"}>{account.is_active ? tx("Aktif", "Active") : tx("Nonaktif", "Inactive")}</Tag>;
}

function MemberFilters({ filters, options, onChange, onReset, vertical = false }) {
    const { tx } = useBilingual();
    const statusLabels = { draft: tx("Draf", "Draft"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), replaced: tx("Diganti", "Replaced"), cancelled: tx("Dibatalkan", "Cancelled") };
    const fieldClass = vertical ? "w-full" : "min-w-44";

    return (
        <div className={vertical ? "grid gap-4" : "flex flex-wrap items-end gap-3"}>
            <div className={vertical ? "w-full" : "min-w-64 flex-1"}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Cari pengurus", "Search managers")}</p>
                <SearchInput value={filters.search} placeholder={tx("Nama atau nomor anggota", "Name or member number")} onChange={(event) => onChange("search", event.target.value)} />
            </div>
            <div className={vertical ? "w-full" : "min-w-52"}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Bidang / Unit", "Division / Unit")}</p>
                <Select allowClear showSearch optionFilterProp="label" className="w-full" value={filters.unit_id || undefined} placeholder={tx("Semua unit", "All units")} options={options.units || []} onChange={(value) => onChange("unit_id", value || "")} />
            </div>
            <div className={vertical ? "w-full" : "min-w-48"}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Jabatan", "Position")}</p>
                <Select allowClear showSearch optionFilterProp="label" className="w-full" value={filters.position_id || undefined} placeholder={tx("Semua jabatan", "All positions")} options={options.positions || []} onChange={(value) => onChange("position_id", value || "")} />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Status", "Status")}</p>
                <Select allowClear className="w-full" value={filters.status || undefined} placeholder={tx("Semua status", "All statuses")} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => onChange("status", value || "")} />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Peran", "Role")}</p>
                <Select allowClear showSearch optionFilterProp="label" className="w-full" value={filters.role_id || undefined} placeholder={tx("Semua peran", "All roles")} options={options.roles || []} onChange={(value) => onChange("role_id", value || "")} />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Akun Login", "Login Account")}</p>
                <Select
                    allowClear
                    className="w-full"
                    value={filters.account || undefined}
                    placeholder={tx("Semua akun", "All accounts")}
                    options={[
                        { value: "available", label: tx("Akun tersedia", "Account available") },
                        { value: "missing", label: tx("Belum tersedia", "Not available") },
                        { value: "active", label: tx("Akun aktif", "Active account") },
                        { value: "inactive", label: tx("Akun nonaktif", "Inactive account") },
                    ]}
                    onChange={(value) => onChange("account", value || "")}
                />
            </div>
            <Button onClick={onReset}>{tx("Atur Ulang", "Reset")}</Button>
        </div>
    );
}

function AssignmentDetail({ assignment }) {
    const { tx } = useBilingual();
    const statusLabels = { draft: tx("Draf", "Draft"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), replaced: tx("Diganti", "Replaced"), cancelled: tx("Dibatalkan", "Cancelled") };
    if (!assignment) return null;

    return (
        <div className="space-y-5">
            <div className="rounded-3xl bg-zinc-950 p-5 text-white">
                <div className="flex items-start gap-4">
                    <Avatar size={58} className="bg-red-700">{initials(assignment.member?.full_name)}</Avatar>
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-red-200">{tx("Profil Pengurus", "Manager Profile")}</p>
                        <h2 className="mt-2 text-xl font-semibold">{displayName(assignment.member)}</h2>
                        <p className="mt-1 text-sm text-zinc-300">NPA {assignment.member?.npa || "—"}</p>
                    </div>
                </div>
            </div>

            <Descriptions bordered column={1} size="small">
                <Descriptions.Item label={tx("Jabatan", "Position")}>{assignment.position?.title || "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Unit / Bidang", "Unit / Division")}>
                    <Space wrap>
                        <span>{assignment.unit?.name || "—"}</span>
                        {assignment.unit?.is_core_structure ? <Tag color="red">{tx("Struktur Inti", "Core Structure")}</Tag> : null}
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label={tx("Periode", "Period")}>{assignment.period?.name || "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Tanggal Mulai", "Start Date")}>{formatDate(assignment.started_at)}</Descriptions.Item>
                <Descriptions.Item label={tx("Tanggal Selesai", "End Date")}>{assignment.ended_at ? formatDate(assignment.ended_at) : "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Status", "Status")}><Tag color={STATUS_COLORS[assignment.status] || "default"}>{statusLabels[assignment.status] || assignment.status}</Tag></Descriptions.Item>
                <Descriptions.Item label={tx("Peran Portal", "Portal Role")}>{assignment.role?.name || "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Akun Login", "Login Account")}><AccountTag account={assignment.member?.account} /></Descriptions.Item>
                <Descriptions.Item label="Email">{assignment.member?.email || "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Telepon", "Phone")}>{assignment.member?.phone || "—"}</Descriptions.Item>
                <Descriptions.Item label={tx("Nomor Pengangkatan", "Appointment Number")}>{assignment.appointment_number || "—"}</Descriptions.Item>
            </Descriptions>
        </div>
    );
}

function AssignmentHistory({ loading, error, history, onRetry }) {
    const { tx } = useBilingual();
    const statusLabels = { draft: tx("Draf", "Draft"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), replaced: tx("Diganti", "Replaced"), cancelled: tx("Dibatalkan", "Cancelled") };
    if (loading) return <div className="flex min-h-48 items-center justify-center"><Spin /></div>;
    if (error) return <Alert type="error" showIcon message={tx("Riwayat gagal dimuat", "History could not be loaded")} description={error} action={<Button onClick={onRetry}>{tx("Coba Lagi", "Try Again")}</Button>} />;
    if (history.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Belum ada riwayat jabatan lain.", "No other position history yet.")} />;

    return (
        <div className="space-y-3">
            {history.map((item) => (
                <Card key={item.id} size="small" className="border-zinc-200 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-zinc-950">{item.position?.title || "—"}</p>
                            <p className="mt-1 text-sm text-zinc-600">{item.unit?.name || "—"} · {item.period?.name || "—"}</p>
                            <p className="mt-2 text-xs text-zinc-500">{formatDate(item.started_at)} — {item.ended_at ? formatDate(item.ended_at) : tx("Sekarang", "Present")}</p>
                        </div>
                        <Tag color={STATUS_COLORS[item.status] || "default"}>{statusLabels[item.status] || item.status}</Tag>
                    </div>
                </Card>
            ))}
        </div>
    );
}

export default function OrganizationMembersTable({
    period,
    filterOptions = {},
    actions = {},
    createRequest = 0,
    onCreateRequestHandled,
}) {
    const { tx } = useBilingual();
    const statusLabels = { draft: tx("Draf", "Draft"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), replaced: tx("Diganti", "Replaced"), cancelled: tx("Dibatalkan", "Cancelled") };
    const requestRef = useRef(null);
    const historyRequestRef = useRef(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [assignments, setAssignments] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [drawerTab, setDrawerTab] = useState("detail");
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [management, setManagement] = useState(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
        return () => window.clearTimeout(timeout);
    }, [filters.search]);

    useEffect(() => {
        setFilters(DEFAULT_FILTERS);
        setDebouncedSearch("");
        setSelected(null);
    }, [period?.id]);

    useEffect(() => {
        if (!createRequest || !actions.manage_assignments) return;

        setManagement({ mode: "create", assignment: null });
        onCreateRequestHandled?.();
    }, [actions.manage_assignments, createRequest, onCreateRequestHandled]);

    useEffect(() => {
        const handleChanged = (event) => {
            if (Number(event.detail?.periodId) === Number(period?.id)) {
                setReloadKey((value) => value + 1);
            }
        };
        window.addEventListener(ORGANIZATION_DATA_CHANGED, handleChanged);
        return () => window.removeEventListener(ORGANIZATION_DATA_CHANGED, handleChanged);
    }, [period?.id]);

    useEffect(() => {
        if (!period?.id) return undefined;
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError(null);

        axios.get(route("organization.periods.assignments.index", period.id), {
            params: {
                search: debouncedSearch || undefined,
                unit_id: filters.unit_id || undefined,
                position_id: filters.position_id || undefined,
                status: filters.status || undefined,
                role_id: filters.role_id || undefined,
                account: filters.account || undefined,
                sort: filters.sort,
                direction: filters.direction,
                page: filters.page,
                per_page: filters.per_page,
            },
            signal: controller.signal,
        }).then((response) => {
            setAssignments(response.data?.data || []);
            setMeta(response.data?.meta || { current_page: 1, per_page: filters.per_page, total: 0 });
        }).catch((requestError) => {
            if (requestError.code !== "ERR_CANCELED") {
                setError(requestError.response?.data?.message || tx("Daftar pengurus gagal dimuat.", "The management list could not be loaded."));
            }
        }).finally(() => {
            if (requestRef.current === controller) {
                requestRef.current = null;
                if (!controller.signal.aborted) setLoading(false);
            }
        });

        return () => controller.abort();
    }, [debouncedSearch, filters.account, filters.direction, filters.page, filters.per_page, filters.position_id, filters.role_id, filters.sort, filters.status, filters.unit_id, period?.id, reloadKey]);

    const loadHistory = useCallback((assignment) => {
        if (!assignment?.member?.id || !actions.view_history) return;
        historyRequestRef.current?.abort();
        const controller = new AbortController();
        historyRequestRef.current = controller;
        setHistoryLoading(true);
        setHistoryError(null);

        axios.get(route("organization.members.history", assignment.member.id), {
            params: { per_page: 50 },
            signal: controller.signal,
        }).then((response) => setHistory(response.data?.data || []))
            .catch((requestError) => {
                if (requestError.code !== "ERR_CANCELED") {
                    setHistoryError(requestError.response?.data?.message || tx("Riwayat jabatan gagal dimuat.", "Position history could not be loaded."));
                }
            })
            .finally(() => {
                if (historyRequestRef.current === controller) {
                    historyRequestRef.current = null;
                    if (!controller.signal.aborted) setHistoryLoading(false);
                }
            });
    }, [actions.view_history]);

    useEffect(() => () => historyRequestRef.current?.abort(), []);

    const openDetail = useCallback((assignment, tab = "detail") => {
        setSelected(assignment);
        setDrawerTab(tab);
        setHistory([]);
        if (tab === "history") loadHistory(assignment);
    }, [loadHistory]);

    const updateFilter = useCallback((key, value) => {
        setFilters((current) => ({ ...current, [key]: value, page: 1 }));
    }, []);

    const columns = useMemo(() => [
        {
            title: tx("Foto", "Photo"),
            key: "photo",
            width: 72,
            fixed: "left",
            render: (_, record) => <Avatar className="bg-zinc-900">{initials(record.member?.full_name)}</Avatar>,
        },
        {
            title: tx("Nama Anggota", "Member Name"),
            dataIndex: ["member", "full_name"],
            key: "member",
            width: 220,
            fixed: "left",
            sorter: true,
            sortOrder: filters.sort === "member" ? (filters.direction === "asc" ? "ascend" : "descend") : null,
            render: (_, record) => (
                <button type="button" className="text-left" onClick={() => openDetail(record)}>
                    <span className="block font-semibold text-zinc-950 hover:text-red-700">{displayName(record.member)}</span>
                    <span className="mt-1 block text-xs text-zinc-500">{record.member?.email || "—"}</span>
                </button>
            ),
        },
        { title: tx("Nomor Anggota", "Member Number"), dataIndex: ["member", "npa"], key: "npa", width: 145, render: (value) => value || "—" },
        { title: tx("Jabatan", "Position"), dataIndex: ["position", "title"], key: "position", width: 180, render: (value) => <span className="font-medium text-zinc-900">{value || "—"}</span> },
        {
            title: tx("Unit / Bidang", "Unit / Division"),
            key: "unit",
            width: 200,
            render: (_, record) => (
                <div>
                    <span className="block">{record.unit?.name || "—"}</span>
                    {record.unit?.is_core_structure ? <Tag className="mt-1" color="red">{tx("Struktur Inti", "Core Structure")}</Tag> : <Tag className="mt-1">{tx("Noninti", "Non-core")}</Tag>}
                </div>
            ),
        },
        { title: tx("Periode", "Period"), dataIndex: ["period", "name"], key: "period", width: 170, render: (value) => value || period?.name || "—" },
        {
            title: tx("Tanggal Mulai", "Start Date"),
            dataIndex: "started_at",
            key: "started_at",
            width: 145,
            sorter: true,
            sortOrder: filters.sort === "started_at" ? (filters.direction === "asc" ? "ascend" : "descend") : null,
            render: (value) => formatDate(value),
        },
        {
            title: tx("Status", "Status"),
            dataIndex: "status",
            key: "status",
            width: 115,
            sorter: true,
            sortOrder: filters.sort === "status" ? (filters.direction === "asc" ? "ascend" : "descend") : null,
            render: (value) => <Tag color={STATUS_COLORS[value] || "default"}>{statusLabels[value] || value}</Tag>,
        },
        { title: tx("Akun Login", "Login Account"), key: "account", width: 125, render: (_, record) => <AccountTag account={record.member?.account} /> },
        { title: tx("Peran", "Role"), dataIndex: ["role", "name"], key: "role", width: 150, render: (value) => value || "—" },
        {
            title: tx("Aksi", "Actions"),
            key: "actions",
            width: 90,
            fixed: "right",
            render: (_, record) => {
                const items = [
                    { key: "detail", icon: <EyeOutlined />, label: tx("Lihat profil", "View profile") },
                    ...(actions.view_history ? [{ key: "history", icon: <HistoryOutlined />, label: tx("Riwayat jabatan", "Position history") }] : []),
                    ...(actions.manage_assignments ? [
                        { type: "divider" },
                        { key: "edit", icon: <EditOutlined />, label: tx("Edit penugasan", "Edit assignment"), disabled: !["draft", "active"].includes(record.status) },
                        { key: "end", icon: <StopOutlined />, label: tx("Akhiri jabatan", "End position"), danger: true, disabled: !["draft", "active"].includes(record.status) },
                    ] : []),
                    ...(actions.replace_assignments ? [{ key: "replace", icon: <SwapOutlined />, label: tx("Ganti pengurus", "Replace manager"), disabled: record.status !== "active" }] : []),
                    ...(actions.manage_accounts ? [{ key: "account", icon: <UserOutlined />, label: tx("Kelola akun", "Manage account"), disabled: true }] : []),
                ];

                return (
                    <Dropdown
                        trigger={["click"]}
                        menu={{
                            items,
                            onClick: ({ key }) => {
                                if (key === "detail" || key === "history") openDetail(record, key);
                                if (["edit", "replace", "end"].includes(key)) setManagement({ mode: key, assignment: record });
                            },
                        }}
                    >
                        <Button icon={<MoreOutlined />} aria-label={`${tx("Aksi untuk", "Actions for")} ${record.member?.full_name || tx("pengurus", "manager")}`} />
                    </Dropdown>
                );
            },
        },
    ], [actions.manage_accounts, actions.manage_assignments, actions.replace_assignments, actions.view_history, filters.direction, filters.sort, openDetail, period?.name, tx]);

    const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

    if (!period) return null;

    return (
        <div className="space-y-4">
            {actions.manage_assignments ? (
                <div className="flex justify-end">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setManagement({ mode: "create", assignment: null })}>
                        {tx("Tambah Pengurus", "Add Manager")}
                    </Button>
                </div>
            ) : null}
            <div className="hidden lg:block">
                <FilterBar>
                    <MemberFilters filters={filters} options={filterOptions} onChange={updateFilter} onReset={resetFilters} />
                </FilterBar>
            </div>

            <div className="flex items-center justify-between gap-3 lg:hidden">
                <div>
                    <p className="font-semibold text-zinc-950">{meta.total || 0} {tx("pengurus", "managers")}</p>
                    <p className="text-xs text-zinc-500">{tx("Periode", "Period")} {period.name}</p>
                </div>
                <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>{tx("Filter", "Filter")}</Button>
            </div>

            {error ? <Alert type="error" showIcon message={tx("Daftar pengurus gagal dimuat", "The management list could not be loaded")} description={error} action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((value) => value + 1)}>{tx("Coba Lagi", "Try Again")}</Button>} /> : null}

            {loading && assignments.length === 0 ? (
                <Card className="organization-member-table border-zinc-200 shadow-sm" aria-busy="true">
                    <span className="sr-only">{tx("Memuat daftar pengurus", "Loading management list")}</span>
                    <LoadingSkeleton variant="table" rows={8} />
                </Card>
            ) : (
                <Card className="organization-member-table border-zinc-200 shadow-sm">
                    <DataTable
                    columns={columns}
                    dataSource={assignments}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1740 }}
                    emptyTitle={tx("Tidak ada hasil yang sesuai dengan filter", "No results match the filters")}
                    emptyDescription={tx("Ubah pencarian atau atur ulang filter untuk melihat data pengurus.", "Change the search or reset the filters to view management data.")}
                    pagination={{
                        current: meta.current_page || 1,
                        pageSize: meta.per_page || filters.per_page,
                        total: meta.total || 0,
                        showSizeChanger: true,
                        pageSizeOptions: [15, 30, 60],
                        showTotal: (total, range) => `${range[0]}–${range[1]} ${tx("dari", "of")} ${total} ${tx("pengurus", "managers")}`,
                    }}
                    onChange={(pagination, _tableFilters, sorter) => {
                        const nextSort = sorter?.columnKey || sorter?.field;
                        setFilters((current) => ({
                            ...current,
                            page: pagination.current,
                            per_page: pagination.pageSize,
                            sort: ["member", "started_at", "status", "created_at"].includes(nextSort) ? nextSort : current.sort,
                            direction: sorter?.order === "ascend" ? "asc" : sorter?.order === "descend" ? "desc" : current.direction,
                        }));
                    }}
                    />
                </Card>
            )}

            <Drawer title={tx("Filter Daftar Pengurus", "Filter Management List")} open={filterOpen} onClose={() => setFilterOpen(false)} placement="bottom" size="large" destroyOnHidden>
                <MemberFilters filters={filters} options={filterOptions} onChange={updateFilter} onReset={resetFilters} vertical />
                <Button type="primary" block className="mt-5" onClick={() => setFilterOpen(false)}>{tx("Tampilkan Hasil", "Show Results")}</Button>
            </Drawer>

            <Drawer
                title={tx("Detail Pengurus", "Manager Details")}
                open={Boolean(selected)}
                onClose={() => {
                    setSelected(null);
                    historyRequestRef.current?.abort();
                }}
                size={560}
                destroyOnHidden
            >
                {selected ? (
                    <Tabs
                        activeKey={drawerTab}
                        onChange={(key) => {
                            setDrawerTab(key);
                            if (key === "history" && history.length === 0 && !historyLoading) loadHistory(selected);
                        }}
                        items={[
                            { key: "detail", label: tx("Profil & Jabatan", "Profile & Position"), children: <AssignmentDetail assignment={selected} /> },
                            ...(actions.view_history ? [{
                                key: "history",
                                label: tx("Riwayat Jabatan", "Position History"),
                                children: <AssignmentHistory loading={historyLoading} error={historyError} history={history} onRetry={() => loadHistory(selected)} />,
                            }] : []),
                        ]}
                    />
                ) : null}
            </Drawer>

            <AssignmentManagementDrawer
                open={Boolean(management)}
                mode={management?.mode || "create"}
                assignment={management?.assignment || null}
                period={period}
                options={filterOptions}
                onClose={() => setManagement(null)}
            />
        </div>
    );
}
