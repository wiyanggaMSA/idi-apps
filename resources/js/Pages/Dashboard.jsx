import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import { BarChartOutlined, LineChartOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Col, DatePicker, Row, Space, Table, Tag, Typography } from "antd";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  const { filters, kpi, charts, tables } = usePage().props;
  const selectedMonth = filters?.month ? dayjs(`${filters.month}-01`) : dayjs();

  const handleMonthChange = (value) => {
    const nextMonth = (value || dayjs()).format("YYYY-MM");
    router.get(route("dashboard"), { month: nextMonth }, { preserveScroll: true, preserveState: true });
  };

  const cashTrend = charts?.cash_trend || [];
  const duesTrend = charts?.dues_trend || [];
  const expenseCategories = charts?.expense_categories || [];

  const txCols = useMemo(
    () => [
      {
        title: "Tanggal",
        dataIndex: "date",
        key: "date",
        width: 120,
        render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
      },
      {
        title: "Tipe",
        dataIndex: "type",
        key: "type",
        width: 90,
        render: (v) => (v === "in" ? <Tag color="green">MASUK</Tag> : <Tag color="red">KELUAR</Tag>),
      },
      { title: "Kategori", dataIndex: "category", key: "category", width: 140 },
      { title: "Keterangan", dataIndex: "description", key: "description" },
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
      { title: "Nomor", dataIndex: "number", key: "number", width: 180 },
      { title: "Perihal", dataIndex: "subject", key: "subject" },
      { title: "Tanggal", dataIndex: "date", key: "date", width: 120, render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-") },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (v) => {
          const color = v === "archived" ? "green" : v === "sent" ? "blue" : "gold";
          return <Tag color={color}>{String(v || "").toUpperCase()}</Tag>;
        },
      },
    ],
    []
  );

  const arrearsCols = useMemo(
    () => [
      { title: "Anggota", dataIndex: "member_name", key: "member_name" },
      {
        title: "Tunggakan",
        dataIndex: "outstanding",
        key: "outstanding",
        width: 160,
        align: "right",
        render: (v) => <Text style={{ fontWeight: 700, color: "#cf1322" }}>{formatIDR(v)}</Text>,
      },
    ],
    []
  );

  const agendaCols = useMemo(
    () => [
      { title: "Tanggal", dataIndex: "start_at", key: "start_at", width: 170, render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-") },
      { title: "Agenda", dataIndex: "title", key: "title" },
      { title: "Lokasi", dataIndex: "location", key: "location", width: 160, render: (v) => v || "-" },
      { title: "Tipe", dataIndex: "type", key: "type", width: 120, render: (v) => <Tag>{String(v || "").toUpperCase()}</Tag> },
    ],
    []
  );

  return (
    <AppLayout title="Dashboard">
      <PageShell>
        <PageHeader
          title="Dashboard"
          extra={(
            <DatePicker
              picker="month"
              value={selectedMonth}
              format="MMMM YYYY"
              onChange={handleMonthChange}
              allowClear={false}
            />
          )}
        />

        {/* KPI */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Total Anggota" value={kpi?.members_total ?? 0} tone="gray" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Anggota Aktif" value={kpi?.members_active ?? 0} tone="gray" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Anggota Baru (bulan ini)" value={kpi?.members_new ?? 0} tone="blue" />
          </Col>
        </Row>
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Iuran Ditagih" value={formatIDR(kpi?.dues_billed)} tone="orange" />
          </Col>
          <Col xs={24} md={8}>
            <KPI title="Iuran Terkumpul" value={formatIDR(kpi?.dues_collected)} tone="green" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Tunggakan Iuran" value={formatIDR(kpi?.dues_outstanding)} tone="orange" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Rasio Kolektif" value={`${kpi?.dues_collection_rate ?? 0}%`} tone="blue" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Pemasukan Kas (bulan ini)" value={formatIDR(kpi?.cash_in)} tone="green" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Pengeluaran Kas (bulan ini)" value={formatIDR(kpi?.cash_out)} tone="orange" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Net Kas (bulan ini)" value={formatIDR(kpi?.cash_net)} tone="blue" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Saldo Kas (total)" value={formatIDR(kpi?.cash_balance)} tone="green" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Surat Diarsipkan" value={kpi?.letters_archived ?? 0} tone="gray" />
          </Col>
          <Col xs={24} sm={12} lg={8} xl={6}>
            <KPI title="Agenda 7 Hari ke Depan" value={kpi?.agenda_upcoming ?? 0} tone="gray" />
          </Col>
        </Row>

        {/* Chart + Recent */}
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={14}>
            <Card title={<Text strong>Tren Kas (Masuk vs Keluar)</Text>} style={{ borderRadius: 12 }}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={cashTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format("D")} />
                  <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
                  <Tooltip formatter={(value) => formatIDR(value)} labelFormatter={(v) => dayjs(v).format("DD MMM YYYY")} />
                  <Legend />
                  <Line type="monotone" dataKey="cash_in" stroke="#1677ff" name="Pemasukan" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cash_out" stroke="#fa541c" name="Pengeluaran" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Quick Actions</Text>} style={{ borderRadius: 12 }}>
              <Space wrap>
                <Link href={route("transactions.index")}>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Tambah Transaksi
                  </Button>
                </Link>
                <Link href={route("dues.index")}>
                  <Button icon={<PlusOutlined />}>Bayar Iuran</Button>
                </Link>
                <Link href={route("members.index")}>
                  <Button icon={<PlusOutlined />}>Tambah Anggota</Button>
                </Link>
                <Link href={route("secretariat.letters.create")}>
                  <Button icon={<PlusOutlined />}>Buat Surat</Button>
                </Link>
                <Link href={route("secretariat.agenda.index")}>
                  <Button icon={<PlusOutlined />}>Tambah Agenda</Button>
                </Link>
              </Space>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary">Gunakan tombol di atas untuk mempercepat input data harian.</Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title={<Text strong>Tren Iuran Terkumpul</Text>} style={{ borderRadius: 12 }} extra={<LineChartOutlined />}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={duesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format("D")} />
                  <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
                  <Tooltip formatter={(value) => formatIDR(value)} labelFormatter={(v) => dayjs(v).format("DD MMM YYYY")} />
                  <Bar dataKey="collected" fill="#52c41a" name="Iuran Terkumpul" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Top Kategori Pengeluaran</Text>} style={{ borderRadius: 12 }} extra={<BarChartOutlined />}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={expenseCategories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${Number(v) / 1000}k`} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => formatIDR(value)} />
                  <Bar dataKey="total" fill="#fa8c16" name="Pengeluaran" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title={<Text strong>Transaksi Terbaru</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={txCols}
                dataSource={tables?.recent_transactions || []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Top Tunggakan Iuran</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={arrearsCols}
                dataSource={tables?.top_arrears || []}
                rowKey={(record) => record.member_id}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title={<Text strong>Agenda 7 Hari ke Depan</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={agendaCols}
                dataSource={tables?.upcoming_agenda || []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title={<Text strong>Surat Terbaru (Arsip)</Text>} style={{ borderRadius: 12 }}>
              <Table
                columns={letterCols}
                dataSource={tables?.recent_letters || []}
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