import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import {
    Button,
    Card,
    Col,
    DatePicker,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Typography,
} from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

function formatIDR(value) {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(value || 0);
    } catch {
        return `Rp ${String(value || 0)}`;
    }
}

function MiniLineChart({ title, series }) {
    const w = 640;
    const h = 180;
    const pad = 28;
    const maxY = Math.max(...series.map((s) => s.value), 1);
    const xStep = (w - pad * 2) / Math.max(series.length - 1, 1);

    const mapY = (v) => h - pad - (v / maxY) * (h - pad * 2);
    const points = series.map((s, i) => `${pad + i * xStep},${mapY(s.value)}`).join(" ");

    return (
        <Card title={<Text strong>{title}</Text>} style={{ borderRadius: 12 }}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d9d9d9" />
                <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d9d9d9" />
                <polyline fill="none" stroke="#1677ff" strokeWidth="3" points={points} />
                {series.map((s, i) => (
                    <circle key={s.label} cx={pad + i * xStep} cy={mapY(s.value)} r="4" fill="#1677ff" />
                ))}
                {series.map((s, i) => (
                    <text
                        key={s.label}
                        x={pad + i * xStep}
                        y={h - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#8c8c8c"
                    >
                        {s.label}
                    </text>
                ))}
            </svg>
        </Card>
    );
}

function StackedBarChart({ title, series }) {
    const w = 640;
    const h = 180;
    const pad = 28;
    const maxY = Math.max(...series.map((s) => s.in + s.out), 1);
    const barWidth = (w - pad * 2) / Math.max(series.length, 1) - 8;

    return (
        <Card title={<Text strong>{title}</Text>} style={{ borderRadius: 12 }}>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d9d9d9" />
                {series.map((s, i) => {
                    const x = pad + i * (barWidth + 8);
                    const inHeight = (s.in / maxY) * (h - pad * 2);
                    const outHeight = (s.out / maxY) * (h - pad * 2);
                    return (
                        <g key={s.label}>
                            <rect x={x} y={h - pad - inHeight} width={barWidth} height={inHeight} fill="#1677ff" />
                            <rect x={x} y={h - pad - inHeight - outHeight} width={barWidth} height={outHeight} fill="#fa541c" />
                            <text x={x + barWidth / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#8c8c8c">
                                {s.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </Card>
    );
}

export default function CashReport() {
    const { props } = usePage();
    const { summary, monthly, by_category: byCategory, by_method: byMethod, filters, categories, methods } = props;

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
        [monthly]
    );

    return (
        <AppLayout title="Laporan Kas">
            <PageShell>
                <PageHeader
                    title="Laporan Kas"
                    extra={
                        <Button icon={<FilePdfOutlined />} onClick={exportPdf}>
                            Export PDF
                        </Button>
                    }
                />

                <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
                    <Space wrap size={10}>
                        <RangePicker
                            value={filterState.range}
                            onChange={(value) => setFilterState((prev) => ({ ...prev, range: value || [] }))}
                            format="DD/MM/YYYY"
                        />
                        <Select
                            allowClear
                            placeholder="Kategori"
                            style={{ width: 200 }}
                            value={filterState.category_id || undefined}
                            onChange={(value) => setFilterState((prev) => ({ ...prev, category_id: value || "" }))}
                            options={categories.map((category) => ({ value: category.id, label: category.name }))}
                        />
                        <Select
                            allowClear
                            placeholder="Metode"
                            style={{ width: 200 }}
                            value={filterState.method_id || undefined}
                            onChange={(value) => setFilterState((prev) => ({ ...prev, method_id: value || "" }))}
                            options={methods.map((method) => ({ value: method.id, label: method.name }))}
                        />
                        <Space>
                            <Text>Include Iuran</Text>
                            <Switch
                                checked={filterState.include_dues}
                                onChange={(checked) => setFilterState((prev) => ({ ...prev, include_dues: checked }))}
                            />
                        </Space>
                        <Button type="primary" onClick={applyFilters}>
                            Terapkan
                        </Button>
                    </Space>
                </Card>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={4}>
                        <Card style={{ borderRadius: 12, background: "#dff4ea" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#135200", fontWeight: 600 }}>Total Masuk</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#135200" }}>
                                {formatIDR(summary.total_in)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={4}>
                        <Card style={{ borderRadius: 12, background: "#ffe3e3" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#a8071a", fontWeight: 600 }}>Total Keluar</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#a8071a" }}>
                                {formatIDR(summary.total_out)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={4}>
                        <Card style={{ borderRadius: 12, background: "#dbeafe" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#003a8c", fontWeight: 600 }}>Net</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#003a8c" }}>
                                {formatIDR(summary.net)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={4}>
                        <Card style={{ borderRadius: 12, background: "#fff7e6" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#ad4e00", fontWeight: 600 }}>Saldo Awal</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#ad4e00" }}>
                                {formatIDR(summary.opening_balance)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={4}>
                        <Card style={{ borderRadius: 12, background: "#fff7e6" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#ad4e00", fontWeight: 600 }}>Saldo Akhir</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#ad4e00" }}>
                                {formatIDR(summary.closing_balance)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={12}>
                        <MiniLineChart
                            title="Net Cashflow per Bulan"
                            series={monthlySeries.map((row) => ({ label: row.label, value: row.value }))}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <StackedBarChart
                            title="Pemasukan vs Pengeluaran"
                            series={monthlySeries.map((row) => ({ label: row.label, in: row.in, out: row.out }))}
                        />
                    </Col>
                </Row>

                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <Card title={<Text strong>Rekap Per Periode</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={monthly}
                                rowKey="period"
                                columns={[
                                    { title: "Periode", dataIndex: "period", key: "period" },
                                    {
                                        title: "Masuk",
                                        dataIndex: "total_in",
                                        key: "total_in",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Keluar",
                                        dataIndex: "total_out",
                                        key: "total_out",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Net",
                                        dataIndex: "net",
                                        key: "net",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title={<Text strong>Rekap per Kategori</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={byCategory}
                                rowKey="id"
                                columns={[
                                    { title: "Kategori", dataIndex: "name", key: "name" },
                                    {
                                        title: "Masuk",
                                        dataIndex: "total_in",
                                        key: "total_in",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Keluar",
                                        dataIndex: "total_out",
                                        key: "total_out",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Net",
                                        dataIndex: "net",
                                        key: "net",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24}>
                        <Card title={<Text strong>Rekap per Metode</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={byMethod}
                                rowKey={(record) => record.id || record.name}
                                columns={[
                                    { title: "Metode", dataIndex: "name", key: "name" },
                                    {
                                        title: "Masuk",
                                        dataIndex: "total_in",
                                        key: "total_in",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Keluar",
                                        dataIndex: "total_out",
                                        key: "total_out",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Net",
                                        dataIndex: "net",
                                        key: "net",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                </Row>
            </PageShell>
        </AppLayout>
    );
}
