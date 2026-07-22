import React, { useMemo, useState } from "react";
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
  Table,
  Typography,
  message,
} from "antd";
import { FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

function formatIDR(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `Rp ${String(n || 0)}`;
  }
}

/** Simple line chart with SVG (no deps) */
function MiniLineChart({ title, series }) {
  // series: [{label, in, out}]
  const w = 640;
  const h = 180;
  const pad = 28;

  const maxY = Math.max(
    ...series.flatMap((s) => [s.in, s.out]),
    1
  );

  const xStep = (w - pad * 2) / Math.max(series.length - 1, 1);

  const mapY = (v) => {
    const y = h - pad - (v / maxY) * (h - pad * 2);
    return y;
  };

  const pointsIn = series
    .map((s, i) => `${pad + i * xStep},${mapY(s.in)}`)
    .join(" ");
  const pointsOut = series
    .map((s, i) => `${pad + i * xStep},${mapY(s.out)}`)
    .join(" ");

  return (
    <Card
      title={<Text strong>{title}</Text>}
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ overflowX: "auto" }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* grid */}
          {[0.25, 0.5, 0.75].map((t) => {
            const y = pad + t * (h - pad * 2);
            return (
              <line
                key={t}
                x1={pad}
                y1={y}
                x2={w - pad}
                y2={y}
                stroke="#f0f0f0"
              />
            );
          })}

          {/* axes */}
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d9d9d9" />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d9d9d9" />

          {/* income line */}
          <polyline
            fill="none"
            stroke="#1677ff"
            strokeWidth="3"
            points={pointsIn}
          />

          {/* expense line */}
          <polyline
            fill="none"
            stroke="#fa541c"
            strokeWidth="3"
            points={pointsOut}
          />

          {/* dots */}
          {series.map((s, i) => (
            <g key={s.label}>
              <circle cx={pad + i * xStep} cy={mapY(s.in)} r="4" fill="#1677ff" />
              <circle cx={pad + i * xStep} cy={mapY(s.out)} r="4" fill="#fa541c" />
            </g>
          ))}

          {/* x labels */}
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
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <Space>
          <span style={{ width: 10, height: 10, background: "#1677ff", display: "inline-block", borderRadius: 2 }} />
          <Text type="secondary">Pemasukan</Text>
        </Space>
        <Space>
          <span style={{ width: 10, height: 10, background: "#fa541c", display: "inline-block", borderRadius: 2 }} />
          <Text type="secondary">Pengeluaran</Text>
        </Space>
      </div>
    </Card>
  );
}

function SummaryCard({ title, value, tone = "blue" }) {
  const tones = {
    green: { bg: "#dff4ea", fg: "#135200" },
    orange: { bg: "#ffe7d6", fg: "#ad4e00" },
    blue: { bg: "#dbeafe", fg: "#003a8c" },
  };
  const t = tones[tone] || tones.blue;

  return (
    <Card style={{ borderRadius: 12, background: t.bg }} bodyStyle={{ padding: 14 }}>
      <Text style={{ color: t.fg, fontWeight: 600 }}>{title}</Text>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: t.fg }}>
        {formatIDR(value)}
      </div>
    </Card>
  );
}

export default function ReportsIndex() {
  const [range, setRange] = useState([dayjs("2024-05-01"), dayjs("2024-05-31")]);
  const [reportType, setReportType] = useState("cash");

  // Dummy summary based on type (nanti tinggal ganti dari backend)
  const summary = useMemo(() => {
    if (reportType === "cash") {
      return { income: 5200000, expense: 3100000, end: 35500000 };
    }
    if (reportType === "dues") {
      return { income: 4200000, expense: 0, end: 35500000 };
    }
    return { income: 5200000, expense: 3100000, end: 35500000 };
  }, [reportType]);

  const tableRows = useMemo(
    () => [
      { key: 1, date: "01/05/2024", desc: "Iuran anggota", in: 200000, out: 0, saldo: 35200000 },
      { key: 2, date: "02/05/2024", desc: "Konsumsi rapat", in: 0, out: 100000, saldo: 35100000 },
      { key: 3, date: "03/05/2024", desc: "Donasi kegiatan", in: 500000, out: 0, saldo: 35600000 },
      { key: 4, date: "04/05/2024", desc: "Cetak dokumen", in: 0, out: 75000, saldo: 35525000 },
      { key: 5, date: "05/05/2024", desc: "Sewa tempat", in: 0, out: 300000, saldo: 35225000 },
    ],
    []
  );

  const columns = [
    { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
    { title: "Keterangan", dataIndex: "desc", key: "desc" },
    {
      title: "Pemasukan",
      dataIndex: "in",
      key: "in",
      width: 140,
      align: "right",
      render: (v) => (v ? <Text style={{ color: "#135200", fontWeight: 700 }}>{formatIDR(v)}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: "Pengeluaran",
      dataIndex: "out",
      key: "out",
      width: 140,
      align: "right",
      render: (v) => (v ? <Text style={{ color: "#cf1322", fontWeight: 700 }}>{formatIDR(v)}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: "Saldo",
      dataIndex: "saldo",
      key: "saldo",
      width: 160,
      align: "right",
      render: (v) => <Text type="secondary">{formatIDR(v)}</Text>,
    },
  ];

  const chartSeries = useMemo(
    () => [
      { label: "Jan", in: 2200000, out: 1300000 },
      { label: "Feb", in: 3000000, out: 1700000 },
      { label: "Mar", in: 2500000, out: 1400000 },
      { label: "Apr", in: 3200000, out: 1800000 },
      { label: "Mei", in: 5200000, out: 3100000 },
      { label: "Jun", in: 4800000, out: 2900000 },
    ],
    []
  );

  const handleExportPdf = () => message.info("TODO: export PDF");
  const handleExportExcel = () => message.info("TODO: export Excel");

  return (
    <AppLayout title="Laporan Keuangan">
      <PageShell>
        <PageHeader
          title="Laporan Keuangan"
          extra={
            <Space>
              <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>
                Export PDF
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                Export Excel
              </Button>
            </Space>
          }
        />

        {/* Filters row (mirip gambar) */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space wrap size={10} style={{ width: "100%" }}>
            <RangePicker
              value={range}
              onChange={(v) => setRange(v)}
              format="DD/MM/YYYY"
            />

            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: 220 }}
              options={[
                { value: "cash", label: "Jenis Laporan: Laporan Kas" },
                { value: "dues", label: "Jenis Laporan: Laporan Iuran" },
                { value: "summary", label: "Jenis Laporan: Ringkasan" },
              ]}
            />
          </Space>
        </Card>

        {/* Summary cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <SummaryCard title="Total Pemasukan" value={summary.income} tone="green" />
          </Col>
          <Col xs={24} md={8}>
            <SummaryCard title="Total Pengeluaran" value={summary.expense} tone="orange" />
          </Col>
          <Col xs={24} md={8}>
            <SummaryCard title="Saldo Akhir" value={summary.end} tone="blue" />
          </Col>
        </Row>

        {/* Table + Chart like screenshot */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={tableRows}
            rowKey="key"
            size="middle"
            pagination={false}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>

        <MiniLineChart title="Grafik Pemasukan & Pengeluaran" series={chartSeries} />
      </PageShell>
    </AppLayout>
  );
}
