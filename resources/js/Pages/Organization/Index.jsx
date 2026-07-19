import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    ApartmentOutlined,
    AppstoreOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    FieldTimeOutlined,
    HistoryOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    StopOutlined,
    TeamOutlined,
    UserAddOutlined,
} from "@ant-design/icons";
import { Alert, Button, Select, Space, Tabs, Tag } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import EmptyState from "@/Components/App/EmptyState";
import LoadingSkeleton from "@/Components/App/LoadingSkeleton";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import StatCard from "@/Components/App/StatCard";
import { formatDate } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

const OrganizationChart = lazy(() => import("@/Components/Organization/OrganizationChart"));
const OrganizationHistoryPanel = lazy(() => import("@/Components/Organization/OrganizationHistoryPanel"));
const OrganizationMembersTable = lazy(() => import("@/Components/Organization/OrganizationMembersTable"));
const OrganizationUnitCards = lazy(() => import("@/Components/Organization/OrganizationUnitCards"));
const PeriodWorkflowDialogs = lazy(() => import("@/Components/Organization/PeriodWorkflowDialogs"));

const STATUS_COLORS = {
    draft: "gold",
    published: "blue",
    active: "green",
    ended: "default",
    archived: "default",
};

function StatePanel({
    selectedTab,
    selectedPeriod,
    filterOptions,
    actions,
    onNavigate,
    assignmentFormRequest,
    onAssignmentFormRequestHandled,
}) {
    const { tx } = useBilingual();
    if (!selectedPeriod) {
        return (
            <EmptyState
                title={tx("Belum ada periode kepengurusan", "No management period yet")}
                description={tx("Buat periode terlebih dahulu untuk mulai menyusun struktur organisasi.", "Create a period first to start building the organization structure.")}
            />
        );
    }

    if (selectedTab === "structure") {
        return (
            <OrganizationChart
                period={selectedPeriod}
                canManage={Boolean(actions.manage_structure)}
                onManage={() => onNavigate("units")}
            />
        );
    }

    if (selectedTab === "units") {
        return (
            <OrganizationUnitCards
                period={selectedPeriod}
                filterOptions={filterOptions}
                canManage={Boolean(actions.manage_structure)}
            />
        );
    }

    if (selectedTab === "members") {
        return (
            <OrganizationMembersTable
                period={selectedPeriod}
                filterOptions={filterOptions}
                actions={actions}
                createRequest={assignmentFormRequest}
                onCreateRequestHandled={onAssignmentFormRequestHandled}
            />
        );
    }

    if (!actions.view_history) {
        return (
            <EmptyState
                title={tx("Riwayat tidak tersedia", "History unavailable")}
                description={tx("Akun Anda tidak memiliki izin untuk melihat riwayat kepengurusan.", "Your account does not have permission to view management history.")}
            />
        );
    }

    return (
        <OrganizationHistoryPanel selectedPeriod={selectedPeriod} onNavigate={onNavigate} />
    );
}

export default function OrganizationIndex() {
    const { tx } = useBilingual();
    const { props } = usePage();
    const {
        periods = [],
        selectedPeriod = null,
        selectedTab = "structure",
        summary = {},
        filterOptions = {},
        actions = {},
        loadError = null,
    } = props;
    const [isNavigating, setIsNavigating] = useState(false);
    const [assignmentFormRequest, setAssignmentFormRequest] = useState(0);
    const [workflow, setWorkflow] = useState(null);
    const statusLabels = {
        draft: tx("Draf", "Draft"),
        published: tx("Dipublikasikan", "Published"),
        active: tx("Aktif", "Active"),
        ended: tx("Berakhir", "Ended"),
        archived: tx("Diarsipkan", "Archived"),
    };
    const tabItems = [
        { key: "structure", label: tx("Struktur", "Structure"), icon: <ApartmentOutlined /> },
        { key: "units", label: tx("Bidang & Unit", "Divisions & Units"), icon: <AppstoreOutlined /> },
        { key: "members", label: tx("Daftar Pengurus", "Management List"), icon: <TeamOutlined /> },
        { key: "history", label: tx("Riwayat", "History"), icon: <HistoryOutlined /> },
    ];

    useEffect(() => {
        const stopStart = router.on("start", () => setIsNavigating(true));
        const stopFinish = router.on("finish", () => setIsNavigating(false));

        return () => {
            stopStart();
            stopFinish();
        };
    }, []);

    const periodOptions = useMemo(
        () => periods.map((period) => ({ value: period.id, label: `${period.name} · ${statusLabels[period.status] || period.status}` })),
        [periods, tx],
    );

    const navigate = (tab = selectedTab, periodId = selectedPeriod?.id) => {
        router.get(
            route("secretariat.organization.index"),
            { tab, ...(periodId ? { period_id: periodId } : {}) },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ["periods", "selectedPeriod", "selectedTab", "summary", "filterOptions", "actions", "loadError"],
            },
        );
    };

    const stats = [
        { title: tx("Total Pengurus", "Total Managers"), value: summary.total_managers ?? 0, hint: tx("Penugasan berjalan", "Current assignments"), icon: <TeamOutlined />, tone: "primary" },
        { title: tx("Struktur Inti", "Core Structure"), value: summary.core_units ?? 0, hint: tx("Unit inti aktif", "Active core units"), icon: <ApartmentOutlined />, tone: "dark" },
        { title: tx("Bidang & Unit", "Divisions & Units"), value: summary.total_units ?? 0, hint: tx("Unit aktif", "Active units"), icon: <AppstoreOutlined />, tone: "info" },
        { title: tx("Posisi Terisi", "Filled Positions"), value: summary.positions_filled ?? 0, hint: tx("Slot terisi", "Filled slots"), icon: <CheckCircleOutlined />, tone: "success" },
        { title: tx("Posisi Kosong", "Vacant Positions"), value: summary.positions_empty ?? 0, hint: tx("Perlu dilengkapi", "Needs staffing"), icon: <StopOutlined />, tone: "warning" },
        {
            title: tx("Sisa Periode", "Period Remaining"),
            value: summary.remaining_days === null || summary.remaining_days === undefined ? "—" : `${summary.remaining_days} ${tx("hari", "days")}`,
            hint: selectedPeriod?.status === "ended" ? tx("Periode selesai", "Period ended") : tx("Hingga tanggal akhir", "Until the end date"),
            icon: <FieldTimeOutlined />,
            tone: "neutral",
        },
    ];

    return (
        <AppLayout title={tx("Pengurus", "Management")}>
            <div className="organization-shell">
                <PageShell>
                <PageHeader
                    eyebrow={tx("Dashboard Sekretariat", "Secretariat Dashboard")}
                    title={tx("Pengurus", "Management")}
                    description={tx("Kelola struktur kepengurusan, penempatan anggota, dan riwayat organisasi pada setiap periode.", "Manage the organization structure, member assignments, and history for each period.")}
                    extra={periodOptions.length > 0 || actions.create_period ? (
                        <Space wrap>
                            {periodOptions.length > 0 ? (
                                <Select
                                    aria-label={tx("Pilih periode kepengurusan", "Select management period")}
                                    value={selectedPeriod?.id}
                                    options={periodOptions}
                                    onChange={(value) => navigate(selectedTab, value)}
                                    className="min-w-[17rem]"
                                    popupMatchSelectWidth={false}
                                />
                            ) : null}
                            {actions.create_period ? (
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setWorkflow("create")}>
                                    {tx("Buat Periode Baru", "Create New Period")}
                                </Button>
                            ) : null}
                        </Space>
                    ) : null}
                />

                {loadError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={tx("Data pengurus gagal dimuat", "Management data could not be loaded")}
                        description={loadError}
                        action={(
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => router.reload()}
                                className="min-h-10 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2"
                            >
                                {tx("Coba Lagi", "Try Again")}
                            </Button>
                        )}
                    />
                ) : null}

                {selectedPeriod ? (
                    <section
                        aria-label={tx("Informasi periode", "Period information")}
                        className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.38)]"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-5">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                                    <CalendarOutlined />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold text-zinc-950">{selectedPeriod.name}</h2>
                                        <Tag color={STATUS_COLORS[selectedPeriod.status] || "default"}>
                                            {statusLabels[selectedPeriod.status] || selectedPeriod.status}
                                        </Tag>
                                    </div>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {formatDate(selectedPeriod.start_date)} — {formatDate(selectedPeriod.end_date)}
                                    </p>
                                </div>
                            </div>

                            <Space wrap size={[8, 8]}>
                                {actions.manage_structure ? (
                                    <Button icon={<SettingOutlined />} onClick={() => navigate("units")} className="min-h-10">
                                        {tx("Kelola Struktur", "Manage Structure")}
                                    </Button>
                                ) : null}
                                {actions.manage_assignments ? (
                                    <Button
                                        icon={<UserAddOutlined />}
                                        onClick={() => {
                                            setAssignmentFormRequest(Date.now());
                                            navigate("members");
                                        }}
                                        className="min-h-10"
                                    >
                                        {tx("Tambah Pengurus", "Add Manager")}
                                    </Button>
                                ) : null}
                                {actions.view_history ? (
                                    <Button icon={<HistoryOutlined />} onClick={() => navigate("history")} className="min-h-10">
                                        {tx("Lihat Riwayat", "View History")}
                                    </Button>
                                ) : null}
                                {actions.update_period && ["draft", "published"].includes(selectedPeriod.status) ? (
                                    <Button onClick={() => setWorkflow("edit")} className="min-h-10">{tx("Edit Periode", "Edit Period")}</Button>
                                ) : null}
                                {actions.publish_period ? (
                                    <Button type="primary" onClick={() => setWorkflow("publish")} className="min-h-10">{tx("Publikasikan Periode", "Publish Period")}</Button>
                                ) : null}
                                {actions.activate_period && selectedPeriod.status === "published" ? (
                                    <Button type="primary" onClick={() => setWorkflow("activate")} className="min-h-10">{tx("Aktifkan Periode", "Activate Period")}</Button>
                                ) : null}
                                {actions.end_period ? (
                                    <Button danger onClick={() => setWorkflow("end")} className="min-h-10">{tx("Akhiri Periode", "End Period")}</Button>
                                ) : null}
                            </Space>
                        </div>
                    </section>
                ) : null}

                {isNavigating ? (
                    <div aria-live="polite" aria-busy="true" className="space-y-4">
                        <span className="sr-only">{tx("Memuat data pengurus", "Loading management data")}</span>
                        <LoadingSkeleton variant="stats" />
                        <LoadingSkeleton variant="table" rows={5} />
                    </div>
                ) : (
                    <>
                        <section aria-label={tx("Ringkasan kepengurusan", "Management summary")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                            {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
                        </section>

                        <section className="rounded-3xl border border-white/80 bg-white/90 p-3 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.38)]">
                            <Tabs
                                activeKey={selectedTab}
                                onChange={(key) => navigate(key)}
                                items={tabItems.map((tab) => ({
                                    key: tab.key,
                                    label: (
                                        <span className="inline-flex min-h-8 items-center gap-2 px-1">
                                            {tab.icon}
                                            {tab.label}
                                        </span>
                                    ),
                                    children: (
                                        <div className="pt-2">
                                            <Suspense fallback={<LoadingSkeleton variant="table" rows={5} />}>
                                                <StatePanel
                                                    selectedTab={selectedTab}
                                                    selectedPeriod={selectedPeriod}
                                                    filterOptions={filterOptions}
                                                    actions={actions}
                                                    onNavigate={navigate}
                                                    assignmentFormRequest={assignmentFormRequest}
                                                    onAssignmentFormRequestHandled={() => setAssignmentFormRequest(0)}
                                                />
                                            </Suspense>
                                        </div>
                                    ),
                                }))}
                            />
                        </section>
                    </>
                )}

                {workflow ? (
                    <Suspense fallback={null}>
                        <PeriodWorkflowDialogs
                            mode={workflow}
                            period={selectedPeriod}
                            periods={periods}
                            onClose={() => setWorkflow(null)}
                            onCompleted={(periodId, tab) => {
                                setWorkflow(null);
                                navigate(tab, periodId);
                            }}
                            onNavigate={(tab) => {
                                setWorkflow(null);
                                navigate(tab);
                            }}
                        />
                    </Suspense>
                ) : null}
                </PageShell>
            </div>
        </AppLayout>
    );
}
