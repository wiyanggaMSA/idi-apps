import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import axios from "axios";
import {
    ApartmentOutlined,
    CompressOutlined,
    DownOutlined,
    DragOutlined,
    EditOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    LeftOutlined,
    MinusSquareOutlined,
    PlusSquareOutlined,
    ReloadOutlined,
    RightOutlined,
    TeamOutlined,
    UpOutlined,
    UserOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Empty,
    Skeleton,
    Space,
    Tag,
    Tooltip,
} from "antd";
import { ORGANIZATION_DATA_CHANGED } from "@/Components/Organization/events";
import useBilingual from "@/Hooks/useBilingual";

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.6;
const SCALE_STEP = 0.1;
const PAN_STEP = 72;
const chartCache = new Map();

const unitTypeLabels = (tx) => ({
    core: tx("Pengurus Inti", "Core Management"), board: tx("Dewan", "Board"),
    council: tx("Majelis", "Council"), assembly: tx("Majelis", "Assembly"),
    bureau: tx("Biro", "Bureau"), department: tx("Departemen", "Department"),
    division: tx("Divisi", "Division"), field: tx("Bidang", "Field"),
    committee: tx("Komisi", "Committee"), subdivision: tx("Subbidang", "Subdivision"),
    other: tx("Unit Lain", "Other Unit"),
});

function clampScale(value) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

function memberInitials(name = "") {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

    return initials || <UserOutlined />;
}

function memberDisplayName(member, emptyLabel) {
    if (!member) return emptyLabel;
    return member.education
        ? `${member.full_name}, ${member.education}`
        : member.full_name;
}

function decorateTree(nodes = [], parent = null, depth = 0) {
    return nodes.map((node) => {
        const positions = node.positions || [];
        const filledPositions = positions.filter((position) => position.assignment);
        const leadPosition = filledPositions.find((position) => position.position?.is_leadership)
            || filledPositions[0]
            || positions.find((position) => position.position?.is_leadership)
            || positions[0]
            || null;
        const children = decorateTree(node.children || [], node, depth + 1);

        return {
            ...node,
            parent_name: parent?.name || null,
            depth,
            positions,
            children,
            filled_positions: filledPositions.length,
            empty_positions: Math.max(0, positions.length - filledPositions.length),
            lead_position: leadPosition,
        };
    });
}

function collectCollapsibleIds(nodes, ids = new Set()) {
    nodes.forEach((node) => {
        if (node.depth >= 1 && node.children.length > 0) ids.add(node.id);
        collectCollapsibleIds(node.children, ids);
    });

    return ids;
}

function findUnit(nodes, unitId) {
    for (const node of nodes) {
        if (node.id === unitId) return node;
        const child = findUnit(node.children, unitId);
        if (child) return child;
    }

    return null;
}

function UnitTypeTag({ unit }) {
    const { tx } = useBilingual();
    const labels = unitTypeLabels(tx);
    return unit.is_core_structure ? (
        <Tag color="red">{tx("Struktur Inti", "Core Structure")}</Tag>
    ) : (
        <Tag color="blue">{labels[unit.unit_type] || unit.unit_type}</Tag>
    );
}

function NodeCard({ node, collapsed, onSelect, onToggle }) {
    const { tx } = useBilingual();
    const labels = unitTypeLabels(tx);
    const hasChildren = node.children.length > 0;
    const assignment = node.lead_position?.assignment;

    return (
        <article className={`organization-chart-node${node.is_core_structure ? " organization-chart-node--core" : ""}`}>
            <button
                type="button"
                className="organization-chart-node__main"
                onClick={() => onSelect(node.id)}
                aria-label={`${tx("Buka detail unit", "Open unit details for")} ${node.name}`}
            >
                <span className="organization-chart-node__header">
                    <span className="organization-chart-node__icon" aria-hidden="true">
                        <ApartmentOutlined />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="organization-chart-node__name">{node.name}</span>
                        <span className="organization-chart-node__type">
                            {labels[node.unit_type] || node.unit_type}
                        </span>
                    </span>
                    {node.is_core_structure ? <Tag color="red">{tx("Inti", "Core")}</Tag> : null}
                </span>

                <span className="organization-chart-node__leader">
                    <Avatar size={38} className="shrink-0 bg-zinc-900">
                        {memberInitials(assignment?.member?.full_name)}
                    </Avatar>
                    <span className="min-w-0 text-left">
                        <span className="organization-chart-node__member">
                            {memberDisplayName(assignment?.member, tx("Posisi kosong", "Vacant position"))}
                        </span>
                        <span className="organization-chart-node__position">
                            {node.lead_position?.title || tx("Belum ada jabatan", "No position yet")}
                        </span>
                    </span>
                </span>

                <span className="organization-chart-node__metrics">
                    <span><strong>{node.filled_positions}</strong> {tx("terisi", "filled")}</span>
                    <span className={node.empty_positions > 0 ? "text-amber-700" : "text-emerald-700"}>
                        <strong>{node.empty_positions}</strong> {tx("kosong", "vacant")}
                    </span>
                    {assignment ? (
                        <Tag color={assignment.status === "active" ? "green" : "gold"}>
                            {assignment.status === "active" ? tx("Aktif", "Active") : tx("Draf", "Draft")}
                        </Tag>
                    ) : null}
                </span>
            </button>

            {hasChildren ? (
                <button
                    type="button"
                    className="organization-chart-node__toggle"
                    onClick={() => onToggle(node.id)}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? tx("Buka", "Expand") : tx("Tutup", "Collapse")} ${node.children.length} ${tx("unit di bawah", "units under")} ${node.name}`}
                >
                    {collapsed ? <PlusSquareOutlined /> : <MinusSquareOutlined />}
                    <span>{node.children.length}</span>
                </button>
            ) : null}
        </article>
    );
}

function ChartBranch({ nodes, collapsedIds, onSelect, onToggle }) {
    if (nodes.length === 0) return null;

    return (
        <ul className="organization-chart-tree">
            {nodes.map((node) => {
                const collapsed = collapsedIds.has(node.id);

                return (
                    <li key={node.id}>
                        <NodeCard
                            node={node}
                            collapsed={collapsed}
                            onSelect={onSelect}
                            onToggle={onToggle}
                        />
                        {!collapsed ? (
                            <ChartBranch
                                nodes={node.children}
                                collapsedIds={collapsedIds}
                                onSelect={onSelect}
                                onToggle={onToggle}
                            />
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}

function MobileBranch({ nodes, collapsedIds, onSelect, onToggle }) {
    const { tx } = useBilingual();
    return (
        <ul className="space-y-3" aria-label={tx("Hierarki unit organisasi", "Organization unit hierarchy")}>
            {nodes.map((node) => {
                const collapsed = collapsedIds.has(node.id);
                const hasChildren = node.children.length > 0;
                const assignment = node.lead_position?.assignment;

                return (
                    <li key={node.id} style={{ "--organization-depth": node.depth }}>
                        <Card className="organization-mobile-node border-zinc-200 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => onSelect(node.id)}
                                    aria-label={`${tx("Buka detail unit", "Open unit details for")} ${node.name}`}
                                >
                                    <span className="flex flex-wrap items-center gap-2">
                                        <strong className="text-zinc-950">{node.name}</strong>
                                        <UnitTypeTag unit={node} />
                                    </span>
                                    <span className="mt-3 flex items-center gap-3">
                                        <Avatar size={36} className="shrink-0 bg-zinc-900">
                                            {memberInitials(assignment?.member?.full_name)}
                                        </Avatar>
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium text-zinc-900">
                                                {memberDisplayName(assignment?.member, tx("Posisi kosong", "Vacant position"))}
                                            </span>
                                            <span className="block truncate text-xs text-zinc-500">
                                                {node.lead_position?.title || tx("Belum ada jabatan", "No position yet")}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                                        <span>{node.filled_positions} {tx("terisi", "filled")}</span>
                                        <span>·</span>
                                        <span>{node.empty_positions} {tx("kosong", "vacant")}</span>
                                    </span>
                                </button>

                                {hasChildren ? (
                                    <Button
                                        type="text"
                                        icon={collapsed ? <RightOutlined /> : <DownOutlined />}
                                        onClick={() => onToggle(node.id)}
                                        aria-expanded={!collapsed}
                                        aria-label={`${collapsed ? tx("Buka", "Expand") : tx("Tutup", "Collapse")} ${tx("cabang", "branch")} ${node.name}`}
                                    />
                                ) : null}
                            </div>
                        </Card>

                        {!collapsed && hasChildren ? (
                            <div className="organization-mobile-children mt-3 border-l-2 border-red-100 pl-3">
                                <MobileBranch
                                    nodes={node.children}
                                    collapsedIds={collapsedIds}
                                    onSelect={onSelect}
                                    onToggle={onToggle}
                                />
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}

function UnitDrawer({ unit, open, canManage, onClose, onManage }) {
    const { tx } = useBilingual();
    const labels = unitTypeLabels(tx);
    return (
        <Drawer
            title={tx("Detail Unit Organisasi", "Organization Unit Details")}
            open={open}
            onClose={onClose}
            size={520}
            destroyOnHidden
            extra={canManage && unit ? (
                <Button type="primary" icon={<EditOutlined />} onClick={onManage}>
                    {tx("Kelola Struktur", "Manage Structure")}
                </Button>
            ) : null}
        >
            {unit ? (
                <div className="space-y-5">
                    <div className="rounded-3xl bg-gradient-to-br from-zinc-950 to-zinc-800 p-5 text-white">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
                                    {labels[unit.unit_type] || unit.unit_type}
                                </p>
                                <h2 className="mt-2 text-xl font-semibold">{unit.name}</h2>
                            </div>
                            {unit.is_core_structure ? <Tag color="red">{tx("Struktur Inti", "Core Structure")}</Tag> : null}
                        </div>
                        <p className="mt-4 text-sm leading-6 text-zinc-300">
                            {unit.description || tx("Belum ada deskripsi unit.", "No unit description yet.")}
                        </p>
                    </div>

                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label={tx("Kode", "Code")}>{unit.code || "—"}</Descriptions.Item>
                        <Descriptions.Item label={tx("Induk", "Parent")}>{unit.parent_name || tx("Akar organisasi", "Organization root")}</Descriptions.Item>
                        <Descriptions.Item label={tx("Jumlah posisi", "Total positions")}>{unit.positions.length}</Descriptions.Item>
                        <Descriptions.Item label={tx("Posisi terisi", "Filled positions")}>{unit.filled_positions}</Descriptions.Item>
                        <Descriptions.Item label={tx("Posisi kosong", "Vacant positions")}>{unit.empty_positions}</Descriptions.Item>
                    </Descriptions>

                    <Divider orientation="left">{tx("Posisi dan Pengurus", "Positions and Managers")}</Divider>

                    {unit.positions.length > 0 ? (
                        <div className="space-y-3">
                            {unit.positions.map((position) => {
                                const assignment = position.assignment;
                                const member = assignment?.member;

                                return (
                                    <Card key={position.id} size="small" className="border-zinc-200 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <Avatar size={42} className={member ? "bg-zinc-900" : "bg-zinc-300"}>
                                                {memberInitials(member?.full_name)}
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-zinc-950">{position.title}</p>
                                                        <p className="mt-1 text-sm text-zinc-600">
                                                            {memberDisplayName(member, tx("Posisi kosong", "Vacant position"))}
                                                        </p>
                                                    </div>
                                                    <Tag color={assignment ? (assignment.status === "active" ? "green" : "gold") : "default"}>
                                                        {assignment ? (assignment.status === "active" ? tx("Aktif", "Active") : tx("Draf", "Draft")) : tx("Kosong", "Vacant")}
                                                    </Tag>
                                                </div>
                                                {member ? (
                                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                                                        <span>NPA {member.npa || "—"}</span>
                                                        <span>{assignment.role?.name || tx("Tanpa peran portal", "No portal role")}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Belum ada posisi pada unit ini.", "This unit has no positions yet.")} />
                    )}
                </div>
            ) : null}
        </Drawer>
    );
}

export default function OrganizationChart({ period, canManage = false, onManage }) {
    const { tx } = useBilingual();
    const shellRef = useRef(null);
    const viewportRef = useRef(null);
    const contentRef = useRef(null);
    const dragRef = useRef(null);
    const requestRef = useRef(null);
    const [rawTree, setRawTree] = useState([]);
    const [loading, setLoading] = useState(Boolean(period));
    const [error, setError] = useState(null);
    const [collapsedIds, setCollapsedIds] = useState(new Set());
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const tree = useMemo(() => decorateTree(rawTree), [rawTree]);
    const selectedUnit = useMemo(
        () => findUnit(tree, selectedUnitId),
        [selectedUnitId, tree],
    );

    const loadChart = useCallback(async ({ force = false } = {}) => {
        requestRef.current?.abort();

        if (!period?.id) {
            setRawTree([]);
            setLoading(false);
            return undefined;
        }

        if (!force && chartCache.has(period.id)) {
            const cachedTree = chartCache.get(period.id);
            const decorated = decorateTree(cachedTree);
            setRawTree(cachedTree);
            setCollapsedIds(collectCollapsibleIds(decorated));
            setError(null);
            setLoading(false);
            return undefined;
        }

        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(route("organization.periods.chart", period.id), {
                signal: controller.signal,
            });
            const nextTree = response.data?.data || [];
            chartCache.set(period.id, nextTree);
            setRawTree(nextTree);
            setCollapsedIds(collectCollapsibleIds(decorateTree(nextTree)));
        } catch (requestError) {
            if (requestError.code !== "ERR_CANCELED") {
                setError(requestError.response?.data?.message || tx("Struktur organisasi gagal dimuat.", "The organization structure could not be loaded."));
            }
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null;
                if (!controller.signal.aborted) setLoading(false);
            }
        }
    }, [period?.id]);

    useEffect(() => {
        setSelectedUnitId(null);
        setPan({ x: 0, y: 0 });
        setScale(1);
        loadChart();

        return () => requestRef.current?.abort();
    }, [loadChart]);

    useEffect(() => {
        const handleChanged = (event) => {
            if (Number(event.detail?.periodId) !== Number(period?.id)) return;

            chartCache.delete(period.id);
            loadChart({ force: true });
        };

        window.addEventListener(ORGANIZATION_DATA_CHANGED, handleChanged);
        return () => window.removeEventListener(ORGANIZATION_DATA_CHANGED, handleChanged);
    }, [loadChart, period?.id]);

    useEffect(() => {
        const handleFullscreen = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
        document.addEventListener("fullscreenchange", handleFullscreen);
        return () => document.removeEventListener("fullscreenchange", handleFullscreen);
    }, []);

    const toggleNode = useCallback((unitId) => {
        setCollapsedIds((current) => {
            const next = new Set(current);
            if (next.has(unitId)) next.delete(unitId);
            else next.add(unitId);
            return next;
        });
    }, []);

    const fitToScreen = useCallback(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;

        const availableWidth = Math.max(1, viewport.clientWidth - 48);
        const availableHeight = Math.max(1, viewport.clientHeight - 48);
        const contentWidth = Math.max(1, content.scrollWidth);
        const contentHeight = Math.max(1, content.scrollHeight);
        const nextScale = clampScale(Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight));

        setScale(nextScale);
        setPan({ x: 0, y: 0 });
    }, []);

    useEffect(() => {
        if (!loading && tree.length > 0) {
            const frame = window.requestAnimationFrame(fitToScreen);
            return () => window.cancelAnimationFrame(frame);
        }

        return undefined;
    }, [fitToScreen, loading, tree]);

    const handlePointerDown = (event) => {
        if (event.button !== 0 || event.target.closest("button")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pan };
        setIsPanning(true);
    };

    const handlePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setPan({
            x: drag.pan.x + event.clientX - drag.x,
            y: drag.pan.y + event.clientY - drag.y,
        });
    };

    const stopPanning = (event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
            setIsPanning(false);
        }
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenEnabled || !shellRef.current) return;
        if (document.fullscreenElement) await document.exitFullscreen();
        else await shellRef.current.requestFullscreen();
    };

    if (!period) return null;

    if (loading) {
        return (
            <div aria-live="polite" aria-busy="true" className="space-y-4 p-2">
                <span className="sr-only">{tx("Memuat bagan organisasi", "Loading organization chart")}</span>
                <Skeleton active paragraph={{ rows: 2 }} />
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((item) => <Skeleton.Node key={item} active className="!h-48 !w-full" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                type="error"
                showIcon
                message={tx("Bagan organisasi gagal dimuat", "The organization chart could not be loaded")}
                description={error}
                action={<Button icon={<ReloadOutlined />} onClick={() => loadChart({ force: true })}>{tx("Coba Lagi", "Try Again")}</Button>}
            />
        );
    }

    if (tree.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={tx("Belum ada struktur organisasi aktif pada periode ini.", "There is no active organization structure for this period yet.")}
            >
                {canManage ? <Button type="primary" icon={<EditOutlined />} onClick={onManage}>{tx("Kelola Struktur", "Manage Structure")}</Button> : null}
            </Empty>
        );
    }

    return (
        <div ref={shellRef} className="organization-chart-shell rounded-2xl bg-white">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">{tx("Bagan Organisasi", "Organization Chart")}</p>
                    <h2 className="mt-1 text-lg font-semibold text-zinc-950">{tx("Struktur", "Structure")} {period.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{tx("Pilih simpul untuk melihat detail unit dan posisi.", "Select a node to view unit and position details.")}</p>
                </div>

                <div className="hidden flex-wrap items-center gap-2 lg:flex" role="toolbar" aria-label={tx("Kontrol bagan organisasi", "Organization chart controls")}>
                    <Tooltip title={tx("Geser kiri", "Pan left")}><Button icon={<LeftOutlined />} aria-label={tx("Geser bagan ke kiri", "Pan chart left")} onClick={() => setPan((value) => ({ ...value, x: value.x - PAN_STEP }))} /></Tooltip>
                    <Tooltip title={tx("Geser atas", "Pan up")}><Button icon={<UpOutlined />} aria-label={tx("Geser bagan ke atas", "Pan chart up")} onClick={() => setPan((value) => ({ ...value, y: value.y - PAN_STEP }))} /></Tooltip>
                    <Tooltip title={tx("Geser bawah", "Pan down")}><Button icon={<DownOutlined />} aria-label={tx("Geser bagan ke bawah", "Pan chart down")} onClick={() => setPan((value) => ({ ...value, y: value.y + PAN_STEP }))} /></Tooltip>
                    <Tooltip title={tx("Geser kanan", "Pan right")}><Button icon={<RightOutlined />} aria-label={tx("Geser bagan ke kanan", "Pan chart right")} onClick={() => setPan((value) => ({ ...value, x: value.x + PAN_STEP }))} /></Tooltip>
                    <Divider type="vertical" className="h-7" />
                    <Tooltip title={tx("Perkecil", "Zoom out")}><Button icon={<ZoomOutOutlined />} aria-label={tx("Perkecil bagan", "Zoom out chart")} disabled={scale <= MIN_SCALE} onClick={() => setScale((value) => clampScale(value - SCALE_STEP))} /></Tooltip>
                    <span className="min-w-14 text-center text-xs font-semibold text-zinc-600" aria-live="polite">{Math.round(scale * 100)}%</span>
                    <Tooltip title={tx("Perbesar", "Zoom in")}><Button icon={<ZoomInOutlined />} aria-label={tx("Perbesar bagan", "Zoom in chart")} disabled={scale >= MAX_SCALE} onClick={() => setScale((value) => clampScale(value + SCALE_STEP))} /></Tooltip>
                    <Button icon={<CompressOutlined />} onClick={fitToScreen}>{tx("Sesuaikan", "Fit")}</Button>
                    {document.fullscreenEnabled ? (
                        <Tooltip title={isFullscreen ? tx("Keluar layar penuh", "Exit fullscreen") : tx("Layar penuh", "Fullscreen")}>
                            <Button icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={toggleFullscreen} aria-label={isFullscreen ? tx("Keluar dari layar penuh", "Exit fullscreen") : tx("Tampilkan layar penuh", "Enter fullscreen")} />
                        </Tooltip>
                    ) : null}
                </div>
            </div>

            <div className="hidden lg:block">
                <div
                    ref={viewportRef}
                    className={`organization-chart-viewport${isPanning ? " is-panning" : ""}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopPanning}
                    onPointerCancel={stopPanning}
                    aria-label={tx("Bagan hierarki organisasi. Seret area kosong untuk menggeser.", "Organization hierarchy chart. Drag an empty area to pan.")}
                >
                    <div
                        ref={contentRef}
                        className="organization-chart-canvas"
                        style={{
                            "--chart-scale": scale,
                            "--chart-pan-x": `${pan.x}px`,
                            "--chart-pan-y": `${pan.y}px`,
                        }}
                    >
                        <div className="organization-chart-root">
                            <span className="organization-chart-root__icon"><TeamOutlined /></span>
                            <span>
                                <strong>{period.name}</strong>
                                <small>{tree.length} {tx("akar organisasi", "organization roots")}</small>
                            </span>
                        </div>
                        <ChartBranch
                            nodes={tree}
                            collapsedIds={collapsedIds}
                            onSelect={setSelectedUnitId}
                            onToggle={toggleNode}
                        />
                    </div>
                    <div className="organization-chart-pan-hint" aria-hidden="true">
                        <DragOutlined /> {tx("Seret area kosong untuk menggeser", "Drag an empty area to pan")}
                    </div>
                </div>
            </div>

            <div className="lg:hidden">
                <Alert
                    className="mb-4"
                    type="info"
                    showIcon
                    message={tx("Tampilan hierarki vertikal", "Vertical hierarchy view")}
                    description={tx("Cabang struktur dapat dibuka dan ditutup agar nyaman digunakan di layar kecil.", "Structure branches can be expanded and collapsed for easier use on small screens.")}
                />
                <div className="mb-3 rounded-2xl bg-zinc-950 p-4 text-white">
                    <div className="flex items-center gap-3">
                        <Avatar className="bg-red-700" icon={<TeamOutlined />} />
                        <div>
                            <p className="font-semibold">{period.name}</p>
                            <p className="text-xs text-zinc-400">{tree.length} {tx("akar organisasi", "organization roots")}</p>
                        </div>
                    </div>
                </div>
                <MobileBranch
                    nodes={tree}
                    collapsedIds={collapsedIds}
                    onSelect={setSelectedUnitId}
                    onToggle={toggleNode}
                />
            </div>

            <UnitDrawer
                unit={selectedUnit}
                open={Boolean(selectedUnit)}
                canManage={canManage}
                onClose={() => setSelectedUnitId(null)}
                onManage={() => {
                    setSelectedUnitId(null);
                    onManage?.();
                }}
            />
        </div>
    );
}
