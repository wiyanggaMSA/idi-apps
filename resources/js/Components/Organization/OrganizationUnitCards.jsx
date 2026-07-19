import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import {
    ApartmentOutlined,
    EyeOutlined,
    FilterOutlined,
    MoreOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    UserAddOutlined,
    UserOutlined,
} from "@ant-design/icons";
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
    Tooltip,
    Dropdown,
} from "antd";
import FilterBar from "@/Components/App/FilterBar";
import SearchInput from "@/Components/App/SearchInput";
import { PositionManagerDrawer, UnitFormDrawer } from "@/Components/Organization/StructureManagementDrawers";
import { ORGANIZATION_DATA_CHANGED } from "@/Components/Organization/events";
import useBilingual from "@/Hooks/useBilingual";

const UNIT_TYPE_LABELS = {
    core: "Pengurus Inti",
    board: "Dewan",
    council: "Majelis",
    assembly: "Majelis",
    bureau: "Biro",
    department: "Departemen",
    division: "Divisi",
    field: "Bidang",
    committee: "Komisi",
    subdivision: "Subbidang",
    other: "Unit Lain",
};

function localizedUnitType(type, tx) {
    return ({ core: tx("Pengurus Inti", "Core Management"), board: tx("Dewan", "Board"), council: tx("Majelis", "Council"), assembly: tx("Majelis", "Assembly"), bureau: tx("Biro", "Bureau"), department: tx("Departemen", "Department"), division: tx("Divisi", "Division"), field: tx("Bidang", "Field"), committee: tx("Komisi", "Committee"), subdivision: tx("Subbidang", "Subdivision"), other: tx("Unit Lain", "Other Unit") })[type] || type;
}

const DEFAULT_FILTERS = {
    search: "",
    type: "",
    core: "",
    active: "1",
    has_vacancy: "",
    sort: "display_order",
    direction: "asc",
    page: 1,
    per_page: 12,
};

function initials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || <UserOutlined />;
}

function currentAssignments(unit) {
    return (unit.positions || [])
        .map((position) => ({ position, assignment: position.assignment }))
        .filter((item) => item.assignment);
}

function UnitFilters({ filters, typeOptions, onChange, onReset, vertical = false }) {
    const { tx } = useBilingual();
    const fieldClass = vertical ? "w-full" : "min-w-40";

    return (
        <div className={vertical ? "grid gap-4" : "flex flex-wrap items-end gap-3"}>
            <div className={vertical ? "w-full" : "min-w-64 flex-1"}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Cari unit", "Search units")}</p>
                <SearchInput
                    value={filters.search}
                    placeholder={tx("Nama atau kode unit", "Unit name or code")}
                    onChange={(event) => onChange("search", event.target.value)}
                />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Tipe", "Type")}</p>
                <Select
                    allowClear
                    className="w-full"
                    value={filters.type || undefined}
                    placeholder={tx("Semua tipe", "All types")}
                    options={typeOptions}
                    onChange={(value) => onChange("type", value || "")}
                />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Struktur", "Structure")}</p>
                <Select
                    allowClear
                    className="w-full"
                    value={filters.core || undefined}
                    placeholder={tx("Semua struktur", "All structures")}
                    options={[
                        { value: "1", label: tx("Struktur Inti", "Core Structure") },
                        { value: "0", label: tx("Noninti", "Non-core") },
                    ]}
                    onChange={(value) => onChange("core", value || "")}
                />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Status", "Status")}</p>
                <Select
                    allowClear
                    className="w-full"
                    value={filters.active || undefined}
                    placeholder={tx("Semua status", "All statuses")}
                    options={[
                        { value: "1", label: tx("Aktif", "Active") },
                        { value: "0", label: tx("Nonaktif", "Inactive") },
                    ]}
                    onChange={(value) => onChange("active", value || "")}
                />
            </div>
            <div className={fieldClass}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Posisi", "Positions")}</p>
                <Select
                    allowClear
                    className="w-full"
                    value={filters.has_vacancy || undefined}
                    placeholder={tx("Semua posisi", "All positions")}
                    options={[
                        { value: "1", label: tx("Ada posisi kosong", "Has vacancies") },
                        { value: "0", label: tx("Semua terisi", "All filled") },
                    ]}
                    onChange={(value) => onChange("has_vacancy", value || "")}
                />
            </div>
            <div className={vertical ? "w-full" : "min-w-52"}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{tx("Urutkan", "Sort")}</p>
                <Select
                    className="w-full"
                    value={`${filters.sort}:${filters.direction}`}
                    options={[
                        { value: "display_order:asc", label: tx("Urutan struktur", "Structure order") },
                        { value: "name:asc", label: tx("Nama A–Z", "Name A–Z") },
                        { value: "name:desc", label: tx("Nama Z–A", "Name Z–A") },
                        { value: "positions:desc", label: tx("Posisi terbanyak", "Most positions") },
                        { value: "filled:desc", label: tx("Terisi terbanyak", "Most filled") },
                    ]}
                    onChange={(value) => {
                        const [sort, direction] = value.split(":");
                        onChange("sort", sort, { direction });
                    }}
                />
            </div>
            <Button onClick={onReset}>{tx("Atur Ulang", "Reset")}</Button>
        </div>
    );
}

function UnitDetailDrawer({ unit, open, canManage, onClose, onEdit, onPositions, onAddChild }) {
    const { tx } = useBilingual();
    const assignments = unit ? currentAssignments(unit) : [];

    return (
        <Drawer title={tx("Detail Bidang & Unit", "Division & Unit Details")} open={open} onClose={onClose} size={520} destroyOnHidden>
            {unit ? (
                <div className="space-y-5">
                    <div className="rounded-3xl bg-zinc-950 p-5 text-white">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-red-200">
                                    {localizedUnitType(unit.unit_type, tx)}
                                </p>
                                <h2 className="mt-2 text-xl font-semibold">{unit.name}</h2>
                            </div>
                            <Space wrap>
                                {unit.is_core_structure ? <Tag color="red">{tx("Struktur Inti", "Core Structure")}</Tag> : null}
                                <Tag color={unit.is_active ? "green" : "default"}>{unit.is_active ? tx("Aktif", "Active") : tx("Nonaktif", "Inactive")}</Tag>
                            </Space>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-zinc-300">{unit.description || tx("Belum ada deskripsi unit.", "No unit description yet.")}</p>
                    </div>

                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={tx("Kode", "Code")}>{unit.code || "—"}</Descriptions.Item>
                        <Descriptions.Item label={tx("Induk", "Parent")}>{unit.parent?.name || tx("Akar organisasi", "Organization root")}</Descriptions.Item>
                        <Descriptions.Item label={tx("Jumlah posisi", "Total positions")}>{unit.positions_count || 0}</Descriptions.Item>
                        <Descriptions.Item label={tx("Posisi terisi", "Filled positions")}>{unit.filled_positions_count || 0}</Descriptions.Item>
                        <Descriptions.Item label={tx("Posisi kosong", "Vacant positions")}>{Math.max(0, (unit.positions_count || 0) - (unit.filled_positions_count || 0))}</Descriptions.Item>
                    </Descriptions>

                    <div>
                        <h3 className="mb-3 font-semibold text-zinc-950">{tx("Pengurus dan Posisi", "Managers and Positions")}</h3>
                        {(unit.positions || []).length > 0 ? (
                            <div className="space-y-3">
                                {unit.positions.map((position) => (
                                    <div key={position.id} className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4">
                                        <Avatar className={position.assignment ? "bg-zinc-900" : "bg-zinc-300"}>
                                            {initials(position.assignment?.member?.full_name)}
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-zinc-950">{position.title}</p>
                                                    <p className="mt-1 text-sm text-zinc-600">
                                                        {position.assignment?.member?.full_name || tx("Posisi kosong", "Vacant position")}
                                                    </p>
                                                </div>
                                                <Tag color={position.assignment ? "green" : "default"}>
                                                    {position.assignment ? tx("Terisi", "Filled") : tx("Kosong", "Vacant")}
                                                </Tag>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Belum ada posisi.", "No positions yet.")} />}
                    </div>

                    {unit.children?.length > 0 ? (
                        <div>
                            <h3 className="mb-3 font-semibold text-zinc-950">{tx("Subunit", "Child Units")}</h3>
                            <div className="flex flex-wrap gap-2">
                                {unit.children.map((child) => <Tag key={child.id}>{child.name}</Tag>)}
                            </div>
                        </div>
                    ) : null}

                    {canManage ? (
                        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
                            <Button icon={<PlusOutlined />} onClick={onAddChild}>{tx("Tambah Subunit", "Add Subunit")}</Button>
                            <Button icon={<SettingOutlined />} onClick={onPositions}>{tx("Kelola Posisi", "Manage Positions")}</Button>
                            <Button type="primary" onClick={onEdit}>{tx("Edit Unit", "Edit Unit")}</Button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </Drawer>
    );
}

export default function OrganizationUnitCards({ period, filterOptions = {}, canManage = false }) {
    const { tx } = useBilingual();
    const requestRef = useRef(null);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [units, setUnits] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, per_page: 12, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [management, setManagement] = useState(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
        return () => window.clearTimeout(timeout);
    }, [filters.search]);

    useEffect(() => {
        setFilters(DEFAULT_FILTERS);
        setDebouncedSearch("");
        setSelectedUnit(null);
    }, [period?.id]);

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

        const query = {
            search: debouncedSearch || undefined,
            type: filters.type || undefined,
            core: filters.core || undefined,
            active: filters.active || undefined,
            has_vacancy: filters.has_vacancy || undefined,
            sort: filters.sort,
            direction: filters.direction,
            page: filters.page,
            per_page: filters.per_page,
        };

        axios.get(route("organization.periods.units.index", period.id), { params: query, signal: controller.signal })
            .then((response) => {
                setUnits(response.data?.data || []);
                setMeta(response.data?.meta || { current_page: 1, per_page: filters.per_page, total: 0 });
            })
            .catch((requestError) => {
                if (requestError.code !== "ERR_CANCELED") {
                    setError(requestError.response?.data?.message || tx("Daftar unit gagal dimuat.", "The unit list could not be loaded."));
                }
            })
            .finally(() => {
                if (requestRef.current === controller) {
                    requestRef.current = null;
                    if (!controller.signal.aborted) setLoading(false);
                }
            });

        return () => controller.abort();
    }, [debouncedSearch, filters.active, filters.core, filters.direction, filters.has_vacancy, filters.page, filters.per_page, filters.sort, filters.type, period?.id, reloadKey]);

    const typeOptions = useMemo(
        () => (filterOptions.unit_types || []).map((type) => ({
            value: type,
            label: ({ core: tx("Pengurus Inti", "Core Management"), board: tx("Dewan", "Board"), council: tx("Majelis", "Council"), assembly: tx("Majelis", "Assembly"), bureau: tx("Biro", "Bureau"), department: tx("Departemen", "Department"), division: tx("Divisi", "Division"), field: tx("Bidang", "Field"), committee: tx("Komisi", "Committee"), subdivision: tx("Subbidang", "Subdivision"), other: tx("Unit Lain", "Other Unit") })[type] || type,
        })),
        [filterOptions.unit_types, tx],
    );

    const updateFilter = useCallback((key, value, extra = {}) => {
        setFilters((current) => ({ ...current, [key]: value, ...extra, page: 1 }));
    }, []);

    const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);
    const refreshFilterOptions = useCallback(() => {
        router.reload({
            only: ["filterOptions"],
            preserveScroll: true,
            preserveState: true,
        });
    }, []);

    if (!period) return null;

    return (
        <div className="space-y-4">
            {canManage ? (
                <div className="flex justify-end">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setManagement({ type: "unit", unit: null, parentId: null })}>
                        {tx("Tambah Unit", "Add Unit")}
                    </Button>
                </div>
            ) : null}
            <div className="hidden lg:block">
                <FilterBar>
                    <UnitFilters filters={filters} typeOptions={typeOptions} onChange={updateFilter} onReset={resetFilters} />
                </FilterBar>
            </div>

            <div className="flex items-center justify-between gap-3 lg:hidden">
                <div>
                    <p className="font-semibold text-zinc-950">{meta.total || 0} {tx("unit", "units")}</p>
                    <p className="text-xs text-zinc-500">{tx("Periode", "Period")} {period.name}</p>
                </div>
                <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(true)}>{tx("Filter", "Filter")}</Button>
            </div>

            {error ? (
                <Alert type="error" showIcon message={tx("Data unit gagal dimuat", "Unit data could not be loaded")} description={error} action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((value) => value + 1)}>{tx("Coba Lagi", "Try Again")}</Button>} />
            ) : null}

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton.Node key={item} active className="!h-64 !w-full" />)}
                </div>
            ) : units.length > 0 ? (
                <div className="organization-unit-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {units.map((unit) => {
                        const assignments = currentAssignments(unit);
                        const leader = assignments.find((item) => item.position.position?.is_leadership) || assignments[0];
                        const vacancy = Math.max(0, (unit.positions_count || 0) - (unit.filled_positions_count || 0));

                        return (
                            <Card key={unit.id} className="organization-unit-card border-zinc-200 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${unit.is_core_structure ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-700"}`}>
                                            <ApartmentOutlined />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-semibold text-zinc-950">{unit.name}</h3>
                                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">{localizedUnitType(unit.unit_type, tx)}</p>
                                        </div>
                                    </div>
                                    <Tag color={unit.is_active ? "green" : "default"}>{unit.is_active ? tx("Aktif", "Active") : tx("Nonaktif", "Inactive")}</Tag>
                                </div>

                                <div className="mt-4 rounded-2xl bg-zinc-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{tx("Ketua / Koordinator", "Chair / Coordinator")}</p>
                                    <div className="mt-2 flex items-center gap-3">
                                        <Avatar className={leader ? "bg-zinc-900" : "bg-zinc-300"}>{initials(leader?.assignment?.member?.full_name)}</Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-zinc-900">{leader?.assignment?.member?.full_name || tx("Belum ditetapkan", "Not assigned")}</p>
                                            <p className="truncate text-xs text-zinc-500">{leader?.position?.title || tx("Posisi pimpinan kosong", "Leadership position vacant")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex -space-x-2">
                                    {assignments.slice(0, 4).map(({ assignment }) => (
                                        <Tooltip key={assignment.id} title={assignment.member?.full_name}>
                                            <Avatar className="border-2 border-white bg-zinc-800">{initials(assignment.member?.full_name)}</Avatar>
                                        </Tooltip>
                                    ))}
                                    {assignments.length > 4 ? <Avatar className="border-2 border-white bg-red-700">+{assignments.length - 4}</Avatar> : null}
                                    {assignments.length === 0 ? <span className="text-sm text-zinc-400">{tx("Belum ada pengurus", "No managers yet")}</span> : null}
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="rounded-xl bg-zinc-100 p-2"><strong className="block text-base text-zinc-950">{unit.positions_count || 0}</strong>{tx("Posisi", "Positions")}</div>
                                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><strong className="block text-base">{unit.filled_positions_count || 0}</strong>{tx("Terisi", "Filled")}</div>
                                    <div className="rounded-xl bg-amber-50 p-2 text-amber-800"><strong className="block text-base">{vacancy}</strong>{tx("Kosong", "Vacant")}</div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {unit.is_core_structure ? <Tag color="red">{tx("Struktur Inti", "Core Structure")}</Tag> : null}
                                    {unit.children_count > 0 ? <Tag>{unit.children_count} child unit</Tag> : null}
                                </div>

                                <div className="mt-5 flex flex-wrap justify-end gap-2">
                                    <Button icon={<EyeOutlined />} onClick={() => setSelectedUnit(unit)}>{tx("Detail", "Details")}</Button>
                                    {canManage ? (
                                        <Dropdown
                                            trigger={["click"]}
                                            menu={{
                                                items: [
                                                    { key: "edit", label: tx("Edit unit", "Edit unit"), icon: <SettingOutlined /> },
                                                    { key: "positions", label: tx("Kelola posisi", "Manage positions"), icon: <UserAddOutlined /> },
                                                    { key: "child", label: tx("Tambah subunit", "Add subunit"), icon: <PlusOutlined /> },
                                                ],
                                                onClick: ({ key }) => setManagement({
                                                    type: key === "positions" ? "positions" : "unit",
                                                    unit: key === "child" ? null : unit,
                                                    parentId: key === "child" ? unit.id : null,
                                                }),
                                            }}
                                        >
                                            <Button icon={<MoreOutlined />}>{tx("Kelola", "Manage")}</Button>
                                        </Dropdown>
                                    ) : null}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Tidak ada hasil yang sesuai dengan filter.", "No results match the filters.")}>
                    <Button onClick={resetFilters}>{tx("Atur Ulang Filter", "Reset Filters")}</Button>
                </Empty>
            )}

            {!loading && meta.total > 0 ? (
                <div className="flex justify-end">
                    <Pagination
                        current={meta.current_page || 1}
                        pageSize={meta.per_page || filters.per_page}
                        total={meta.total || 0}
                        showSizeChanger
                        pageSizeOptions={[12, 24, 48]}
                        showTotal={(total, range) => `${range[0]}–${range[1]} dari ${total} unit`}
                        onChange={(page, perPage) => setFilters((current) => ({ ...current, page, per_page: perPage }))}
                    />
                </div>
            ) : null}

            <Drawer title={tx("Filter Bidang & Unit", "Filter Divisions & Units")} open={filterOpen} onClose={() => setFilterOpen(false)} placement="bottom" size="large" destroyOnHidden>
                <UnitFilters filters={filters} typeOptions={typeOptions} onChange={updateFilter} onReset={resetFilters} vertical />
                <Button type="primary" block className="mt-5" onClick={() => setFilterOpen(false)}>{tx("Tampilkan Hasil", "Show Results")}</Button>
            </Drawer>

            <UnitDetailDrawer
                unit={selectedUnit}
                open={Boolean(selectedUnit)}
                canManage={canManage}
                onClose={() => setSelectedUnit(null)}
                onEdit={() => {
                    setManagement({ type: "unit", unit: selectedUnit, parentId: null });
                    setSelectedUnit(null);
                }}
                onPositions={() => {
                    setManagement({ type: "positions", unit: selectedUnit, parentId: null });
                    setSelectedUnit(null);
                }}
                onAddChild={() => {
                    setManagement({ type: "unit", unit: null, parentId: selectedUnit?.id });
                    setSelectedUnit(null);
                }}
            />

            <UnitFormDrawer
                open={management?.type === "unit"}
                unit={management?.unit || null}
                parentId={management?.parentId || null}
                period={period}
                unitOptions={filterOptions.units || []}
                onClose={() => setManagement(null)}
                onSaved={refreshFilterOptions}
            />

            <PositionManagerDrawer
                open={management?.type === "positions"}
                unit={management?.unit || null}
                period={period}
                positionOptions={filterOptions.positions || []}
                onClose={() => setManagement(null)}
            />
        </div>
    );
}
