import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    BarChartOutlined,
    CalendarOutlined,
    DollarCircleOutlined,
    FileTextOutlined,
    PlusOutlined,
    TeamOutlined,
} from "@ant-design/icons";
import { Button, Card, DatePicker, Space } from "antd";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import StatCard from "@/Components/App/StatCard";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import DataTable from "@/Components/App/DataTable";
import StatusBadge from "@/Components/App/StatusBadge";
import { useI18n } from "@/Contexts/I18nContext";
import { formatDate, formatDateTime, formatIDR } from "@/lib/format";

function ChartCard({ title, subtitle, children, extra = null }) {
    return (
        <Card
            title={<span className="text-base font-semibold text-zinc-950">{title}</span>}
            extra={extra}
            className="h-full min-w-0"
        >
            {subtitle ? (
                <p className="mb-4 text-sm text-zinc-500">{subtitle}</p>
            ) : null}
            <div className="h-[280px] min-w-0">{children}</div>
        </Card>
    );
}

function QuickAction({ href, label, icon }) {
    return (
        <Link href={href}>
            <Button
                icon={icon}
                className="!h-11 !rounded-2xl !border-zinc-200 !bg-white !px-4 !font-medium !text-zinc-700 hover:!border-red-200 hover:!text-red-700"
            >
                {label}
            </Button>
        </Link>
    );
}

export default function DashboardIndex() {
    const { t } = useI18n();
    const { filters, kpi, charts, tables } = usePage().props;
    const selectedMonth = filters?.month ? dayjs(`${filters.month}-01`) : dayjs();

    const handleMonthChange = (value) => {
        const nextMonth = (value || dayjs()).format("YYYY-MM");
        router.get(
            route("dashboard"),
            { month: nextMonth },
            { preserveScroll: true, preserveState: true },
        );
    };

    const cashTrend = charts?.cash_trend || [];
    const duesTrend = charts?.dues_trend || [];
    const expenseCategories = charts?.expense_categories || [];

    const txCols = useMemo(
        () => [
            {
                title: t("common.date"),
                dataIndex: "date",
                key: "date",
                width: 132,
                render: (value) => formatDate(value),
            },
            {
                title: t("common.type"),
                dataIndex: "type",
                key: "type",
                width: 110,
                render: (value) =>
                    value === "in" ? (
                        <StatusBadge status="active" label={t("dashboard.in")} color="green" />
                    ) : (
                        <StatusBadge status="overdue" label={t("dashboard.out")} color="red" />
                    ),
            },
            { title: t("common.category"), dataIndex: "category", key: "category", width: 180 },
            {
                title: t("common.description"),
                dataIndex: "description",
                key: "description",
                width: 320,
                ellipsis: true,
                render: (value) => {
                    const text = String(value || "-");
                    return (
                        <span
                            className="block max-w-[320px] truncate"
                            title={text}
                        >
                            {text}
                        </span>
                    );
                },
            },
            {
                title: t("common.amount"),
                dataIndex: "amount",
                key: "amount",
                width: 180,
                align: "right",
                render: (value, record) => (
                    <MoneyDisplay
                        value={value}
                        tone={record.type === "in" ? "success" : "danger"}
                        showPrefix={record.type === "in"}
                    />
                ),
            },
        ],
        [t],
    );

    const letterCols = useMemo(
        () => [
            {
                title: t("common.type"),
                dataIndex: "type",
                key: "type",
                width: 90,
                render: (value) => (
                    <StatusBadge
                        status={value === "in" ? "inactive" : "active"}
                        label={value === "in" ? "IN" : "OUT"}
                        color={value === "in" ? "default" : "blue"}
                    />
                ),
            },
            { title: t("common.number"), dataIndex: "number", key: "number", width: 180 },
            { title: t("common.subject"), dataIndex: "subject", key: "subject" },
            {
                title: t("common.date"),
                dataIndex: "date",
                key: "date",
                width: 140,
                render: (value) => formatDate(value),
            },
            {
                title: t("common.status"),
                dataIndex: "status",
                key: "status",
                width: 130,
                render: (value) => (
                    <StatusBadge
                        status={value}
                        label={String(value || "-").toUpperCase()}
                        color={
                            value === "archived"
                                ? "green"
                                : value === "sent"
                                  ? "blue"
                                  : "gold"
                        }
                    />
                ),
            },
        ],
        [t],
    );

    const arrearsCols = useMemo(
        () => [
            { title: t("common.member"), dataIndex: "member_name", key: "member_name" },
            {
                title: t("common.outstanding"),
                dataIndex: "outstanding",
                key: "outstanding",
                width: 180,
                align: "right",
                render: (value) => <MoneyDisplay value={value} tone="danger" />,
            },
        ],
        [t],
    );

    const agendaCols = useMemo(
        () => [
            {
                title: t("common.date"),
                dataIndex: "start_at",
                key: "start_at",
                width: 180,
                render: (value) => formatDateTime(value),
            },
            { title: t("menu.agenda"), dataIndex: "title", key: "title" },
            {
                title: t("common.location"),
                dataIndex: "location",
                key: "location",
                width: 180,
                render: (value) => value || "-",
            },
            {
                title: t("common.type"),
                dataIndex: "type",
                key: "type",
                width: 120,
                render: (value) => (
                    <StatusBadge label={String(value || "-").toUpperCase()} />
                ),
            },
        ],
        [t],
    );

    return (
        <AppLayout title={t("menu.dashboard")}>
            <PageShell>
                <PageHeader
                    eyebrow={t("dashboard.eyebrow")}
                    title={t("dashboard.title")}
                    description={t("dashboard.description")}
                    extra={
                        <Space wrap>
                            <DatePicker
                                picker="month"
                                value={selectedMonth}
                                format="MMMM YYYY"
                                onChange={handleMonthChange}
                                allowClear={false}
                            />
                            <QuickAction
                                href={route("transactions.index")}
                                label={t("dashboard.addTransaction")}
                                icon={<PlusOutlined />}
                            />
                        </Space>
                    }
                />

                <section className="idi-grid">
                    <StatCard
                        title={t("dashboard.cashBalance")}
                        value={<MoneyDisplay value={kpi?.cash_balance ?? 0} emphasize tone="inverse" />}
                        hint={t("dashboard.allPaymentMethods")}
                        tone="primary"
                        icon={<DollarCircleOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.duesBalance")}
                        value={<MoneyDisplay value={kpi?.dues_balance ?? 0} emphasize tone="inverse" />}
                        hint={t("dashboard.duesBalanceHint")}
                        tone="info"
                        icon={<DollarCircleOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.totalIncome")}
                        value={<MoneyDisplay value={kpi?.cash_in} emphasize tone="success" />}
                        hint={t("dashboard.incomeMonthly")}
                        tone="success"
                        icon={<ArrowDownOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.totalExpense")}
                        value={<MoneyDisplay value={kpi?.cash_out} emphasize tone="danger" />}
                        hint={t("dashboard.expenseMonthly")}
                        tone="danger"
                        icon={<ArrowUpOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.duesArrears")}
                        value={<MoneyDisplay value={kpi?.dues_outstanding} emphasize tone="warning" />}
                        hint={t("dashboard.collectionRate", {
                            rate: kpi?.dues_collection_rate ?? 0,
                        })}
                        tone="warning"
                        icon={<BarChartOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.totalCollected")}
                        value={<MoneyDisplay value={kpi?.dues_collected} emphasize tone="success" />}
                        hint={t("dashboard.activeMembers", {
                            count: kpi?.members_active ?? 0,
                        })}
                        tone="neutral"
                        icon={<DollarCircleOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.netDuesMonth")}
                        value={<MoneyDisplay value={kpi?.dues_net_month ?? 0} emphasize tone={Number(kpi?.dues_net_month || 0) >= 0 ? "success" : "danger"} />}
                        hint={t("dashboard.netDuesHint")}
                        icon={<BarChartOutlined />}
                    />
                    <StatCard
                        title={t("dashboard.upcomingAgenda")}
                        value={kpi?.agenda_upcoming ?? 0}
                        hint={t("dashboard.lettersArchived", {
                            count: kpi?.letters_archived ?? 0,
                        })}
                        icon={<CalendarOutlined />}
                        tone="dark"
                    />
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
                    <ChartCard
                        title={t("dashboard.cashTrend")}
                        subtitle={t("dashboard.cashTrendDesc")}
                    >
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                            <LineChart data={cashTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => dayjs(value).format("D")}
                                    stroke="#71717a"
                                />
                                <YAxis
                                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                                    stroke="#71717a"
                                />
                                <Tooltip
                                    formatter={(value) => formatIDR(value)}
                                    labelFormatter={(value) =>
                                        dayjs(value).format("DD MMM YYYY")
                                    }
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="cash_in"
                                    stroke="#16a34a"
                                    name={t("dashboard.totalIncome")}
                                    strokeWidth={3}
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="cash_out"
                                    stroke="#b91c1c"
                                    name={t("dashboard.totalExpense")}
                                    strokeWidth={3}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <Card className="h-full">
                        <div className="flex h-full flex-col">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                                    {t("dashboard.quickActions")}
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-zinc-950">
                                    {t("dashboard.quickActionsTitle")}
                                </h3>
                                <p className="mt-2 text-sm text-zinc-500">
                                    {t("dashboard.quickActionsDesc")}
                                </p>
                            </div>

                            <div className="mt-6 grid gap-3">
                                <QuickAction
                                    href={route("transactions.index")}
                                    label={t("dashboard.addTransaction")}
                                    icon={<PlusOutlined />}
                                />
                                <QuickAction
                                    href={route("dues.index")}
                                    label={t("dashboard.inputDues")}
                                    icon={<DollarCircleOutlined />}
                                />
                                <QuickAction
                                    href={route("members.index")}
                                    label={t("dashboard.manageMembers")}
                                    icon={<TeamOutlined />}
                                />
                                <QuickAction
                                    href={route("reports.cash")}
                                    label={t("dashboard.openCashReport")}
                                    icon={<BarChartOutlined />}
                                />
                                <QuickAction
                                    href={route("secretariat.agenda.index")}
                                    label={t("dashboard.viewAgenda")}
                                    icon={<CalendarOutlined />}
                                />
                            </div>
                        </div>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
                    <ChartCard
                        title={t("dashboard.duesTrend")}
                        subtitle={t("dashboard.duesTrendDesc")}
                        extra={<BarChartOutlined className="text-zinc-400" />}
                    >
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                            <BarChart data={duesTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => dayjs(value).format("D")}
                                    stroke="#71717a"
                                />
                                <YAxis
                                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                                    stroke="#71717a"
                                />
                                <Tooltip
                                    formatter={(value) => formatIDR(value)}
                                    labelFormatter={(value) =>
                                        dayjs(value).format("DD MMM YYYY")
                                    }
                                />
                                <Bar
                                    dataKey="collected"
                                    fill="#b91c1c"
                                    radius={[10, 10, 0, 0]}
                                    name={t("dashboard.totalCollected")}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard
                        title={t("dashboard.topExpenseCategories")}
                        subtitle={t("dashboard.topExpenseCategoriesDesc")}
                        extra={<FileTextOutlined className="text-zinc-400" />}
                    >
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                            <BarChart
                                data={expenseCategories}
                                layout="vertical"
                                margin={{ left: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis
                                    type="number"
                                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                                    stroke="#71717a"
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={120}
                                    stroke="#71717a"
                                />
                                <Tooltip formatter={(value) => formatIDR(value)} />
                                <Bar
                                    dataKey="total"
                                    fill="#18181b"
                                    radius={[0, 10, 10, 0]}
                                    name={t("dashboard.totalExpense")}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card title={t("dashboard.recentTransactions")} className="min-w-0">
                        <DataTable
                            columns={txCols}
                            dataSource={tables?.recent_transactions || []}
                            rowKey="id"
                            size="middle"
                            pagination={false}
                            scroll={{ x: "max-content" }}
                            emptyTitle={t("dashboard.noTransactions")}
                            emptyDescription={t("dashboard.noTransactionsDesc")}
                        />
                    </Card>

                    <Card title={t("dashboard.topArrears")} className="min-w-0">
                        <DataTable
                            columns={arrearsCols}
                            dataSource={tables?.top_arrears || []}
                            rowKey={(record) => record.member_id}
                            size="middle"
                            pagination={false}
                            scroll={{ x: "max-content" }}
                            emptyTitle={t("dashboard.noArrears")}
                            emptyDescription={t("dashboard.noArrearsDesc")}
                        />
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card title={t("dashboard.upcomingAgendaTable")} className="min-w-0">
                        <DataTable
                            columns={agendaCols}
                            dataSource={tables?.upcoming_agenda || []}
                            rowKey="id"
                            size="middle"
                            pagination={false}
                            scroll={{ x: "max-content" }}
                            emptyTitle={t("dashboard.noAgenda")}
                            emptyDescription={t("dashboard.noAgendaDesc")}
                        />
                    </Card>

                    <Card title={t("dashboard.recentLetters")} className="min-w-0">
                        <DataTable
                            columns={letterCols}
                            dataSource={tables?.recent_letters || []}
                            rowKey="id"
                            size="middle"
                            pagination={false}
                            scroll={{ x: "max-content" }}
                            emptyTitle={t("dashboard.noLetters")}
                            emptyDescription={t("dashboard.noLettersDesc")}
                        />
                    </Card>
                </section>
            </PageShell>
        </AppLayout>
    );
}
