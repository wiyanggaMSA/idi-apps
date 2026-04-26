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

function SimpleLine({ title, series, color }) {
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

export default function FinancialSummary() {
    const { t } = useI18n();
    const { props } = usePage();
    const { summary, filters, divisions } = props;

    const [filterState, setFilterState] = useState({
        range:
            filters?.start_date && filters?.end_date
                ? [dayjs(filters.start_date), dayjs(filters.end_date)]
                : [],
        division_id: filters?.division_id || "",
        include_dues_in_cash: filters?.include_dues_in_cash ?? true,
    });

    const applyFilters = () => {
        const params = {
            division_id: filterState.division_id || undefined,
            include_dues_in_cash: filterState.include_dues_in_cash ? 1 : 0,
        };
        if (filterState.range?.length === 2) {
            params.start_date = filterState.range[0]?.format("YYYY-MM-DD");
            params.end_date = filterState.range[1]?.format("YYYY-MM-DD");
        }

        router.get(route("reports.financial-summary"), params, {
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
        if (filterState.division_id) params.append("division_id", filterState.division_id);
        params.append("include_dues_in_cash", filterState.include_dues_in_cash ? "1" : "0");
        window.open(`${route("reports.financial-summary.pdf")}?${params.toString()}`, "_blank");
    };

    const combinedSeries = useMemo(
        () =>
            (summary?.charts || []).map((row) => ({
                label: row.period,
                value: row.net,
            })),
        [summary],
    );

    const duesSeries = useMemo(
        () =>
            (summary?.charts || []).map((row) => ({
                label: row.period,
                value: row.dues_collected,
            })),
        [summary],
    );

    return (
        <AppLayout title={t("menu.financialSummary")}>
            <PageShell>
                <PageHeader
                    eyebrow="Financial Summary"
                    title={t("reports.summary.title")}
                    description={t("reports.summary.description")}
                    extra={
                        <Button icon={<FilePdfOutlined />} onClick={exportPdf}>
                            {t("common.exportPdf")}
                        </Button>
                    }
                />

                <div className="idi-grid">
                    <StatCard
                        title={t("reports.summary.cashIn")}
                        value={<MoneyDisplay value={summary.cash.total_in} emphasize tone="success" />}
                        tone="success"
                    />
                    <StatCard
                        title={t("reports.summary.cashOut")}
                        value={<MoneyDisplay value={summary.cash.total_out} emphasize tone="danger" />}
                        tone="danger"
                    />
                    <StatCard
                        title={t("reports.summary.netCash")}
                        value={<MoneyDisplay value={summary.cash.net} emphasize />}
                    />
                    <StatCard
                        title={t("reports.summary.closingBalance")}
                        value={<MoneyDisplay value={summary.cash.closing_balance} emphasize tone="inverse" />}
                        tone="primary"
                    />
                    <StatCard
                        title={t("reports.summary.duesBilled")}
                        value={<MoneyDisplay value={summary.dues.billed} emphasize />}
                    />
                    <StatCard
                        title={t("reports.summary.duesCollected")}
                        value={<MoneyDisplay value={summary.dues.collected} emphasize tone="success" />}
                        tone="success"
                    />
                    <StatCard
                        title={t("reports.summary.duesOutstanding")}
                        value={<MoneyDisplay value={summary.dues.outstanding} emphasize tone="danger" />}
                        tone="danger"
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
                        placeholder={t("common.division")}
                        style={{ width: 200 }}
                        value={filterState.division_id || undefined}
                        onChange={(value) =>
                            setFilterState((prev) => ({ ...prev, division_id: value || "" }))
                        }
                        options={divisions.map((division) => ({
                            value: division.id,
                            label: division.name,
                        }))}
                    />
                    <Space>
                        <span className="text-sm text-zinc-500">{t("reports.summary.includeDuesInCash")}</span>
                        <Switch
                            checked={filterState.include_dues_in_cash}
                            onChange={(checked) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    include_dues_in_cash: checked,
                                }))
                            }
                        />
                    </Space>
                    <Button type="primary" onClick={applyFilters}>
                        {t("common.apply")}
                    </Button>
                </FilterBar>

                <p className="text-sm text-zinc-500">
                    {t("reports.summary.note")}
                </p>

                <div className="grid gap-4 xl:grid-cols-2">
                    <SimpleLine
                        title={t("reports.summary.monthlyNet")}
                        series={combinedSeries}
                        color="#18181b"
                    />
                    <SimpleLine
                        title={t("reports.summary.monthlyDues")}
                        series={duesSeries}
                        color="#b91c1c"
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card title={t("reports.summary.topExpenses")}>
                        <DataTable
                            size="middle"
                            pagination={false}
                            dataSource={summary.top_expenses}
                            rowKey="id"
                            emptyTitle={t("reports.summary.noExpenses")}
                            emptyDescription={t("reports.summary.noExpensesDesc")}
                            columns={[
                                { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
                                { title: "Kategori", dataIndex: "category", key: "category" },
                                { title: "Keterangan", dataIndex: "description", key: "description" },
                                {
                                    title: "Jumlah",
                                    dataIndex: "amount",
                                    key: "amount",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="danger" />,
                                },
                            ]}
                        />
                    </Card>

                    <Card title={t("reports.summary.topArrears")}>
                        <DataTable
                            size="middle"
                            pagination={false}
                            dataSource={summary.top_arrears}
                            rowKey="member_id"
                            emptyTitle={t("reports.summary.noArrears")}
                            emptyDescription={t("reports.summary.noArrearsDesc")}
                            columns={[
                                { title: "Nama", dataIndex: "name", key: "name" },
                                { title: "NPA", dataIndex: "npa", key: "npa", width: 120 },
                                {
                                    title: "Outstanding",
                                    dataIndex: "outstanding",
                                    key: "outstanding",
                                    align: "right",
                                    render: (value) => <MoneyDisplay value={value} tone="danger" />,
                                },
                            ]}
                        />
                    </Card>
                </div>

                <Card title={t("reports.summary.monthlyCombined")}>
                    <DataTable
                        size="middle"
                        pagination={false}
                        dataSource={summary.charts}
                        rowKey="period"
                        emptyTitle={t("reports.summary.noCombined")}
                        emptyDescription={t("reports.summary.noCombinedDesc")}
                        columns={[
                            { title: "Periode", dataIndex: "period", key: "period", width: 110 },
                            {
                                title: "Kas Masuk",
                                dataIndex: "cash_in",
                                key: "cash_in",
                                align: "right",
                                render: (value) => <MoneyDisplay value={value} tone="success" />,
                            },
                            {
                                title: "Kas Keluar",
                                dataIndex: "cash_out",
                                key: "cash_out",
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
                                title: "Iuran Ditagih",
                                dataIndex: "dues_billed",
                                key: "dues_billed",
                                align: "right",
                                render: (value) => <MoneyDisplay value={value} />,
                            },
                            {
                                title: "Iuran Diterima",
                                dataIndex: "dues_collected",
                                key: "dues_collected",
                                align: "right",
                                render: (value) => <MoneyDisplay value={value} tone="success" />,
                            },
                            {
                                title: "Outstanding",
                                dataIndex: "dues_outstanding",
                                key: "dues_outstanding",
                                align: "right",
                                render: (value) => <MoneyDisplay value={value} tone="danger" />,
                            },
                        ]}
                    />
                </Card>
            </PageShell>
        </AppLayout>
    );
}
