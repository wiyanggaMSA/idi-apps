import React, { useMemo } from "react";
import { usePage, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import { Card, Col, Row, Space, Table, Tag, Typography } from "antd";

const { Text } = Typography;

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

function MiniLineChart({ series }) {
  const w = 640;
  const h = 170;
  const pad = 26;

  const maxY = Math.max(...series.flatMap((s) => [s.in, s.out]), 1);
  const xStep = (w - pad * 2) / Math.max(series.length - 1, 1);
  const mapY = (v) => h - pad - (v / maxY) * (h - pad * 2);

  const pointsIn = series.map((s, i) => `${pad + i * xStep},${mapY(s.in)}`).join(" ");
  const pointsOut = series.map((s, i) => `${pad + i * xStep},${mapY(s.out)}`).join(" ");

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0.25, 0.5, 0.75].map((t) => {
          const y = pad + t * (h - pad * 2);
          return <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f0f0f0" />;
        })}

        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d9d9d9" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d9d9d9" />

        <polyline fill="none" stroke="#1677ff" strokeWidth="3" points={pointsIn} />
        <polyline fill="none" stroke="#fa541c" strokeWidth="3" points={pointsOut} />

        {series.map((s, i) => (
          <g key={s.m}>
            <circle cx={pad + i * xStep} cy={mapY(s.in)} r="4" fill="#1677ff" />
            <circle cx={pad + i * xStep} cy={mapY(s.out)} r="4" fill="#fa541c" />
            <text x={pad + i * xStep} y={h - 8} textAnchor="middle" fontSize="11" fill="#8c8c8c">
              {s.m}
            </text>
          </g>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <Space>
          <span style={{ width: 10, height: 10, background: "#1677ff", display: "inline-block", borderRadius: 2 }} />
          <Text type="secondary">Pemasukan</Text>
        </Space>
        <Space>
          <span style={{ width: 10, height: 10, background: "#fa541c", display: "inline-block", borderRadius: 2 }} />
          <Text type="secondary">Pengeluaran</Text>
        </Space>
      </div>
    </div>
  );
}

function KPI({ title, value, tone }) {
  const tones = {
    green: { bg: "#dff4ea", fg: "#135200" },
    orange: { bg: "#ffe7d6", fg: "#ad4e00" },
    blue: { bg: "#dbeafe", fg: "#003a8c" },
    gray: { bg: "#f5f7fb", fg: "#262626" },
  };
  const t = tones[tone] || tones.gray;

  return (
    <Card style={{ borderRadius: 12, background: t.bg }} bodyStyle={{ padding: 14 }}>
      <Text style={{ color: t.fg, fontWeight: 600 }}>{title}</Text>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: t.fg }}>{value}</div>
    </Card>
  );
}

export default function DashboardIndex() {
  const { kpi, trend, recentTransactions, recentLetters } = usePage().props;

  const txCols = useMemo(
    () => [
      { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
      {
        title: "Tipe",
        dataIndex: "type",
        key: "type",
        width: 90,
        render: (v) => (v === "in" ? <Tag color="green">MASUK</Tag> : <Tag color="red">KELUAR</Tag>),
      },
      { title: "Kategori", dataIndex: "category", key: "category", width: 140 },
      { title: "Keterangan", dataIndex: "desc", key: "desc" },
      {
        title: "Nominal",
        dataIndex: "amount",
        key: "amount",
        width: 160,
        align: "right",
        render: (v, r) => (
          <Text style={{ fontWeight: 700, color: r.type === "in" ? "#135200" : "#cf1322" }}>
            {formatIDR(v)}
          </Text>
        ),
      },
    ],
    []
  );

  const letterCols = useMemo(
    () => [
      { title: "Tipe", dataIndex: "type", key: "type", width: 90, render: (v) => (v === "in" ? <Tag>IN</Tag> : <Tag color="blue">OUT</Tag>) },
      { title: "Nomor", dataIndex: "no", key: "no", width: 180 },
      { title: "Perihal", dataIndex: "subject", key: "subject" },
      { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
      { title: "Status", dataIndex: "status", key: "status", width: 110, render: (v) => <Tag color={v === "sent" ? "green" : "gold"}>{String(v).toUpperCase()}</Tag> },
    ],
    []
  );

  return (
    <AppLayout title="Dashboard">
      <PageShell>
        <PageHeader title="Dashboard" />

        {/* KPI */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <KPI title="Total Pemasukan (bulan ini)" value={formatIDR(kpi?.cash_in)} tone="green" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Total Pengeluaran (bulan ini)" value={formatIDR(kpi?.cash_out)} tone="orange" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Saldo Kas" value={formatIDR(kpi?.balance)} tone="blue" />
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <KPI title="Total Anggota" value={kpi?.members_total ?? 0} tone="gray" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Anggota Aktif" value={kpi?.members_active ?? 0} tone="gray" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Menunggak Iuran" value={kpi?.dues_overdue ?? 0} tone="gray" />
          </Col>
        </Row>

        {/* Chart + Recent */}
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={14}>
            <Card title={<Text strong>Tren Pemasukan & Pengeluaran</Text>} style={{ borderRadius: 12 }}>
              <MiniLineChart series={trend || []} />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Shortcut</Text>} style={{ borderRadius: 12 }}>
              <Space wrap>
                <Link href={route("dues.index")}>Iuran</Link>
                <Link href={route("cash.index")}>Transaksi</Link>
                <Link href={route("reports.index")}>Laporan</Link>
                <Link href={route("members.index")}>Anggota</Link>
                <Link href={route("settings.index")}>Pengaturan</Link>
              </Space>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary">
                  *Shortcut ini asumsi route kamu sudah ada. Kalau belum, nanti kita sesuaikan.
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title={<Text strong>Transaksi Terbaru</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={txCols}
                dataSource={recentTransactions || []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Surat Terbaru</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={letterCols}
                dataSource={recentLetters || []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      </PageShell>
    </AppLayout>
  );
}
