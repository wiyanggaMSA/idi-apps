import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import { FilePdfOutlined } from "@ant-design/icons";
import { Alert, Button, Card, DatePicker, Select, Space, Switch, Tag } from "antd";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import FilterBar from "@/Components/App/FilterBar";
import StatCard from "@/Components/App/StatCard";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import DataTable from "@/Components/App/DataTable";
import { useI18n } from "@/Contexts/I18nContext";

const { RangePicker } = DatePicker;

const moneyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

function formatMoney(value) {
    return moneyFormatter.format(Number(value || 0));
}

function formatCompactMoney(value) {
    const absolute = Math.abs(Number(value || 0));

    if (absolute >= 1_000_000_000) {
        return `Rp ${(Number(value) / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
    }

    if (absolute >= 1_000_000) {
        return `Rp ${(Number(value) / 1_000_000).toFixed(1).replace(".", ",")} jt`;
    }

    if (absolute >= 1_000) {
        return `Rp ${Math.round(Number(value) / 1_000)} rb`;
    }

    return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function EmptyChart({ title, description }) {
    return (
        <Card title={title} className="h-full">
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 text-center">
                <div>
                    <div className="text-xs font-semibold text-zinc-700">{description}</div>
                </div>
            </div>
        </Card>
    );
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[11px] shadow-lg">
            <div className="mb-1 font-semibold text-zinc-900">{label}</div>
            {payload.map((item) => (
                <div key={item.dataKey} className="flex min-w-40 items-center justify-between gap-4">
                    <span style={{ color: item.color }}>{item.name}</span>
                    <span className="font-semibold text-zinc-800">{formatMoney(item.value)}</span>
                </div>
            ))}
        </div>
    );
}

function NetCashflowChart({ title, data, description, netLabel, closingBalanceLabel }) {
    if (!data.length) {
        return <EmptyChart title={title} description={description} />;
    }

    return (
        <Card title={title} className="h-full">
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 24, left: 4, bottom: 4 }}>
                        <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                            width={68}
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={formatCompactMoney}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine y={0} stroke="#a1a1aa" strokeDasharray="4 4" />
                        <Line
                            type="monotone"
                            dataKey="net"
                            name={netLabel}
                            stroke="#b91c1c"
                            strokeWidth={2}
                            dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 5 }}
                        >
                            <LabelList
                                dataKey="net"
                                position="top"
                                formatter={formatCompactMoney}
                                fill="#3f3f46"
                                fontSize={10}
                            />
                        </Line>
                        <Line
                            type="monotone"
                            dataKey="closingBalance"
                            name={closingBalanceLabel}
                            stroke="#18181b"
                            strokeWidth={2}
                            dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function IncomeExpenseChart({ title, data, description, incomeLabel, expenseLabel }) {
    if (!data.length) {
        return <EmptyChart title={title} description={description} />;
    }

    return (
        <Card title={title} className="h-full">
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 16, left: 4, bottom: 4 }} barGap={6}>
                        <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                            width={68}
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={formatCompactMoney}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="in" name={incomeLabel} fill="#15803d" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="in" position="top" formatter={formatCompactMoney} fill="#3f3f46" fontSize={10} />
                        </Bar>
                        <Bar dataKey="out" name={expenseLabel} fill="#b91c1c" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="out" position="top" formatter={formatCompactMoney} fill="#3f3f46" fontSize={10} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

export default function CashReport() {
    const { t } = useI18n();
    const { props } = usePage();
    const {
        summary,
        monthly,
        by_category: byCategory,
        filters,
        categories,
        methods,
        period_status: periodStatus,
    } = props;

    const [filterState, setFilterState] = useState({
        range:
            filters?.start_date && filters?.end_date
                ? [dayjs(filters.start_date), dayjs(filters.end_date)]
                : [],
        category_id: filters?.category_id || "",
        method_id: filters?.method_id || "",
        include_dues: filters?.include_dues ?? true,
    });

    const applyFilters = () => {
        const params = {
            category_id: filterState.category_id || undefined,
            method_id: filterState.method_id || undefined,
            include_dues: filterState.include_dues ? 1 : 0,
        };
        if (filterState.range?.length === 2) {
            params.start_date = filterState.range[0]?.format("YYYY-MM-DD");
            params.end_date = filterState.range[1]?.format("YYYY-MM-DD");
        }

        router.get(route("reports.cash"), params, {
            preserveState: true,
            replace: true,
        });
    };

    const exportPdf = () => {
        const params = new URLSearchParams();
        if (filterState.range?.length === 2) {
            params.append("start_date", filterState.range[0]?.format("YYYY-MM-DD"));
            params.append("end_date", filterState.range[1]?.format("YYYY-MM-DD"));
        }
        if (filterState.category_id) params.append("category_id", filterState.category_id);
        if (filterState.method_id) params.append("method_id", filterState.method_id);
        params.append("include_dues", filterState.include_dues ? "1" : "0");
        window.open(`${route("reports.cash.pdf")}?${params.toString()}`, "_blank");
    };

    const monthlySeries = useMemo(
        () =>
            monthly.map((row) => ({
                label: row.period,
                net: row.net,
                in: row.total_in,
                out: row.total_out,
                closingBalance: row.closing_balance,
            })),
        [monthly],
    );

    return (
        <AppLayout title={t("menu.cashReport")}>
            <PageShell>
                <PageHeader
                    eyebrow={t("reports.cash.eyebrow")}
                    title={t("reports.cash.title")}
                    description={t("reports.cash.description")}
                    extra={
                        <Button icon={<FilePdfOutlined />} onClick={exportPdf}>
                            {t("common.exportPdf")}
                        </Button>
                    }
                />

                {periodStatus ? (
                    <Alert
                        type={periodStatus.is_closed ? "warning" : "info"}
                        showIcon
                        title={
                            <Space>
                                <span>{t("reports.periodStatus")}</span>
                                <Tag color={periodStatus.is_closed ? "red" : "green"}>
                                    {periodStatus.label}
                                </Tag>
                            </Space>
                        }
                        description={
                            periodStatus.is_closed
                                ? t("reports.closedPeriodDescription")
                                : t("reports.openPeriodDescription")
                        }
                    />
                ) : null}

                <div className="idi-grid">
                    <StatCard
                        title={t("reports.cash.totalIn")}
                        value={<MoneyDisplay value={summary.total_in} emphasize tone="success" />}
                        tone="success"
                    />
                    <StatCard
                        title={t("reports.cash.totalOut")}
                        value={<MoneyDisplay value={summary.total_out} emphasize tone="danger" />}
                        tone="danger"
                    />
                    <StatCard
                        title={t("reports.cash.net")}
                        value={<MoneyDisplay value={summary.net} emphasize />}
                    />
                    <StatCard
                        title={t("reports.cash.openingBalance")}
                        value={<MoneyDisplay value={summary.opening_balance} emphasize />}
                    />
                    <StatCard
                        title={t("reports.cash.closingBalance")}
                        value={<MoneyDisplay value={summary.closing_balance} emphasize tone="inverse" />}
                        tone="primary"
                    />
                </div>

                <FilterBar>
                    <RangePicker
                        value={filterState.range}
                        onChange={(value) =>
                            setFilterState((prev) => ({ ...prev, range: value || [] }))
                        }
                        format="DD/MM/YYYY"
                    />
                    <Select
                        allowClear
                        placeholder={t("common.category")}
                        style={{ width: 180 }}
                        value={filterState.category_id || undefined}
                        onChange={(value) =>
                            setFilterState((prev) => ({ ...prev, category_id: value || "" }))
                        }
                        options={categories.map((category) => ({
                            value: category.id,
                            label: category.name,
                        }))}
                    />
                    <Select
                        allowClear
                        placeholder={t("common.method")}
                        style={{ width: 180 }}
                        value={filterState.method_id || undefined}
                        onChange={(value) =>
                            setFilterState((prev) => ({ ...prev, method_id: value || "" }))
                        }
                        options={methods.map((method) => ({
                            value: method.id,
                            label: method.name,
                        }))}
                    />
                    <Space>
                        <span className="text-xs text-zinc-500">{t("reports.cash.includeDues")}</span>
                        <Switch
                            checked={filterState.include_dues}
                            onChange={(checked) =>
                                setFilterState((prev) => ({ ...prev, include_dues: checked }))
                            }
                        />
                    </Space>
                    <Button type="primary" onClick={applyFilters}>
                        {t("common.apply")}
                    </Button>
                </FilterBar>

                <div className="grid gap-3 xl:grid-cols-2">
                    <NetCashflowChart
                        title={t("reports.cash.lineTitle")}
                        data={monthlySeries}
                        description={t("reports.cash.noPeriodDesc")}
                        netLabel={t("reports.cash.net")}
                        closingBalanceLabel={t("reports.cash.closingBalance")}
                    />
                    <IncomeExpenseChart
                        title={t("reports.cash.compareTitle")}
                        data={monthlySeries}
                        description={t("reports.cash.noPeriodDesc")}
                        incomeLabel={t("reports.cash.totalIn")}
                        expenseLabel={t("reports.cash.totalOut")}
                    />
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                    <Card title={t("reports.cash.periodRecap")}>
                        <DataTable
                            className="finance-compact-table"
                            size="small"
                            pagination={false}
                            dataSource={monthly}
                            rowKey="period"
                            emptyTitle={t("reports.cash.noPeriod")}
                            emptyDescription={t("reports.cash.noPeriodDesc")}
                            columns={[
                                { title: t("reports.cash.period"), dataIndex: "period", key: "period" },
                                {
                                    title: t("reports.cash.income"),
                                    dataIndex: "total_in",
                                    key: "total_in",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="success" />,
                                },
                                {
                                    title: t("reports.cash.expense"),
                                    dataIndex: "total_out",
                                    key: "total_out",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="danger" />,
                                },
                                {
                                    title: "Net",
                                    dataIndex: "net",
                                    key: "net",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} />,
                                },
                                {
                                    title: t("reports.cash.closingBalance"),
                                    dataIndex: "closing_balance",
                                    key: "closing_balance",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} />,
                                },
                            ]}
                        />
                    </Card>

                    <Card title={t("reports.cash.categoryRecap")}>
                        <DataTable
                            className="finance-compact-table"
                            size="small"
                            pagination={false}
                            dataSource={byCategory}
                            rowKey="id"
                            emptyTitle={t("reports.cash.noCategory")}
                            emptyDescription={t("reports.cash.noCategoryDesc")}
                            columns={[
                                { title: t("reports.cash.category"), dataIndex: "name", key: "name" },
                                {
                                    title: t("reports.cash.income"),
                                    dataIndex: "total_in",
                                    key: "total_in",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="success" />,
                                },
                                {
                                    title: t("reports.cash.expense"),
                                    dataIndex: "total_out",
                                    key: "total_out",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="danger" />,
                                },
                                {
                                    title: "Net",
                                    dataIndex: "net",
                                    key: "net",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} />,
                                },
                            ]}
                        />
                    </Card>
                </div>
            </PageShell>
        </AppLayout>
    );
}
