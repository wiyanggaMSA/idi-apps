import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import { FilePdfOutlined } from "@ant-design/icons";
import { Button, Card, DatePicker, Select, Space, Switch } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import FilterBar from "@/Components/App/FilterBar";
import StatCard from "@/Components/App/StatCard";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import DataTable from "@/Components/App/DataTable";
import { useI18n } from "@/Contexts/I18nContext";

const { RangePicker } = DatePicker;

function SimpleLineChart({ title, series, color }) {
    const width = 640;
    const height = 180;
    const pad = 28;
    const maxY = Math.max(...series.map((item) => item.value), 1);
    const xStep = (width - pad * 2) / Math.max(series.length - 1, 1);
    const mapY = (value) => height - pad - (value / maxY) * (height - pad * 2);
    const points = series
        .map((item, index) => `${pad + index * xStep},${mapY(item.value)}`)
        .join(" ");

    return (
        <Card title={title} className="h-full">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#d4d4d8" />
                <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#d4d4d8" />
                <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
                {series.map((item, index) => (
                    <g key={item.label}>
                        <circle
                            cx={pad + index * xStep}
                            cy={mapY(item.value)}
                            r="4"
                            fill={color}
                        />
                        <text
                            x={pad + index * xStep}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#71717a"
                        >
                            {item.label}
                        </text>
                    </g>
                ))}
            </svg>
        </Card>
    );
}

function StackedBarChart({ title, series }) {
    const width = 640;
    const height = 180;
    const pad = 28;
    const maxY = Math.max(...series.map((item) => item.in + item.out), 1);
    const barWidth = (width - pad * 2) / Math.max(series.length, 1) - 8;

    return (
        <Card title={title} className="h-full">
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#d4d4d8" />
                {series.map((item, index) => {
                    const x = pad + index * (barWidth + 8);
                    const inHeight = (item.in / maxY) * (height - pad * 2);
                    const outHeight = (item.out / maxY) * (height - pad * 2);
                    return (
                        <g key={item.label}>
                            <rect
                                x={x}
                                y={height - pad - inHeight}
                                width={barWidth}
                                height={inHeight}
                                rx="10"
                                fill="#b91c1c"
                            />
                            <rect
                                x={x}
                                y={height - pad - inHeight - outHeight}
                                width={barWidth}
                                height={outHeight}
                                rx="10"
                                fill="#18181b"
                            />
                            <text
                                x={x + barWidth / 2}
                                y={height - 8}
                                textAnchor="middle"
                                fontSize="11"
                                fill="#71717a"
                            >
                                {item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
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
                value: row.net,
                in: row.total_in,
                out: row.total_out,
            })),
        [monthly],
    );

    return (
        <AppLayout title={t("menu.cashReport")}>
            <PageShell>
                <PageHeader
                    eyebrow="Cash Report"
                    title={t("reports.cash.title")}
                    description={t("reports.cash.description")}
                    extra={
                        <Button icon={<FilePdfOutlined />} onClick={exportPdf}>
                            {t("common.exportPdf")}
                        </Button>
                    }
                />

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
                        style={{ width: 200 }}
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
                        style={{ width: 200 }}
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
                        <span className="text-sm text-zinc-500">{t("reports.cash.includeDues")}</span>
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

                <div className="grid gap-4 xl:grid-cols-2">
                    <SimpleLineChart
                        title={t("reports.cash.lineTitle")}
                        series={monthlySeries.map((row) => ({
                            label: row.label,
                            value: row.value,
                        }))}
                        color="#b91c1c"
                    />
                    <StackedBarChart
                        title={t("reports.cash.compareTitle")}
                        series={monthlySeries.map((row) => ({
                            label: row.label,
                            in: row.in,
                            out: row.out,
                        }))}
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card title={t("reports.cash.periodRecap")}>
                        <DataTable
                            size="middle"
                            pagination={false}
                            dataSource={monthly}
                            rowKey="period"
                            emptyTitle={t("reports.cash.noPeriod")}
                            emptyDescription={t("reports.cash.noPeriodDesc")}
                            columns={[
                                { title: "Periode", dataIndex: "period", key: "period" },
                                {
                                    title: "Masuk",
                                    dataIndex: "total_in",
                                    key: "total_in",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="success" />,
                                },
                                {
                                    title: "Keluar",
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

                    <Card title={t("reports.cash.categoryRecap")}>
                        <DataTable
                            size="middle"
                            pagination={false}
                            dataSource={byCategory}
                            rowKey="id"
                            emptyTitle={t("reports.cash.noCategory")}
                            emptyDescription={t("reports.cash.noCategoryDesc")}
                            columns={[
                                { title: "Kategori", dataIndex: "name", key: "name" },
                                {
                                    title: "Masuk",
                                    dataIndex: "total_in",
                                    key: "total_in",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="success" />,
                                },
                                {
                                    title: "Keluar",
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
