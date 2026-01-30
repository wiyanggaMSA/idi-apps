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

function SimpleLine({ title, series }) {
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
                <polyline fill="none" stroke="#52c41a" strokeWidth="3" points={points} />
                {series.map((s, i) => (
                    <circle key={s.label} cx={pad + i * xStep} cy={mapY(s.value)} r="4" fill="#52c41a" />
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

export default function FinancialSummary() {
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
        [summary]
    );

    const duesSeries = useMemo(
        () =>
            (summary?.charts || []).map((row) => ({
                label: row.period,
                value: row.dues_collected,
            })),
        [summary]
    );

    return (
        <AppLayout title="Resume Keuangan">
            <PageShell>
                <PageHeader
                    title="Resume Keuangan"
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
                            placeholder="Divisi"
                            style={{ width: 200 }}
                            value={filterState.division_id || undefined}
                            onChange={(value) => setFilterState((prev) => ({ ...prev, division_id: value || "" }))}
                            options={divisions.map((division) => ({ value: division.id, label: division.name }))}
                        />
                        <Space>
                            <Text>Include Iuran di Kas</Text>
                            <Switch
                                checked={filterState.include_dues_in_cash}
                                onChange={(checked) =>
                                    setFilterState((prev) => ({ ...prev, include_dues_in_cash: checked }))
                                }
                            />
                        </Space>
                        <Button type="primary" onClick={applyFilters}>
                            Terapkan
                        </Button>
                    </Space>
                </Card>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#dff4ea" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#135200", fontWeight: 600 }}>Kas Masuk</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#135200" }}>
                                {formatIDR(summary.cash.total_in)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#ffe3e3" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#a8071a", fontWeight: 600 }}>Kas Keluar</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#a8071a" }}>
                                {formatIDR(summary.cash.total_out)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#dbeafe" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#003a8c", fontWeight: 600 }}>Net Kas</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#003a8c" }}>
                                {formatIDR(summary.cash.net)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#fff7e6" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#ad4e00", fontWeight: 600 }}>Saldo Akhir</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#ad4e00" }}>
                                {formatIDR(summary.cash.closing_balance)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={8}>
                        <Card style={{ borderRadius: 12, background: "#e6f7ff" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#0050b3", fontWeight: 600 }}>Iuran Ditagih</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#0050b3" }}>
                                {formatIDR(summary.dues.billed)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card style={{ borderRadius: 12, background: "#f6ffed" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#237804", fontWeight: 600 }}>Iuran Diterima</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#237804" }}>
                                {formatIDR(summary.dues.collected)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card style={{ borderRadius: 12, background: "#fff1f0" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#a8071a", fontWeight: 600 }}>Outstanding Iuran</Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#a8071a" }}>
                                {formatIDR(summary.dues.outstanding)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Text type="secondary">
                    Catatan: Iuran diterima sudah termasuk ke dalam Kas Masuk.
                </Text>

                <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                    <Col xs={24} md={12}>
                        <SimpleLine title="Net Cashflow Bulanan" series={combinedSeries} />
                    </Col>
                    <Col xs={24} md={12}>
                        <SimpleLine title="Iuran Terkumpul Bulanan" series={duesSeries} />
                    </Col>
                </Row>

                <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                    <Col xs={24} md={12}>
                        <Card title={<Text strong>Top 10 Pengeluaran</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={summary.top_expenses}
                                rowKey="id"
                                columns={[
                                    { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
                                    { title: "Kategori", dataIndex: "category", key: "category" },
                                    { title: "Keterangan", dataIndex: "description", key: "description" },
                                    {
                                        title: "Jumlah",
                                        dataIndex: "amount",
                                        key: "amount",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title={<Text strong>Top 10 Penunggak Iuran</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={summary.top_arrears}
                                rowKey="member_id"
                                columns={[
                                    { title: "Nama", dataIndex: "name", key: "name" },
                                    { title: "NPA", dataIndex: "npa", key: "npa", width: 120 },
                                    {
                                        title: "Outstanding",
                                        dataIndex: "outstanding",
                                        key: "outstanding",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24}>
                        <Card title={<Text strong>Rekap Bulanan Gabungan</Text>} style={{ borderRadius: 12 }}>
                            <Table
                                size="small"
                                pagination={false}
                                dataSource={summary.charts}
                                rowKey="period"
                                columns={[
                                    { title: "Periode", dataIndex: "period", key: "period", width: 110 },
                                    {
                                        title: "Kas Masuk",
                                        dataIndex: "cash_in",
                                        key: "cash_in",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Kas Keluar",
                                        dataIndex: "cash_out",
                                        key: "cash_out",
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
                                    {
                                        title: "Iuran Ditagih",
                                        dataIndex: "dues_billed",
                                        key: "dues_billed",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Iuran Diterima",
                                        dataIndex: "dues_collected",
                                        key: "dues_collected",
                                        align: "right",
                                        render: (v) => formatIDR(v),
                                    },
                                    {
                                        title: "Outstanding",
                                        dataIndex: "dues_outstanding",
                                        key: "dues_outstanding",
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
