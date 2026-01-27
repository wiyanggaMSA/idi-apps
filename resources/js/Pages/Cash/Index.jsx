import React, { useMemo, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
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

function buildMockTx() {
  return [
    { key: 1, date: "2024-05-01", desc: "Iuran anggota", type: "IN", category: "Iuran", method: "Transfer", amount: 200000 },
    { key: 2, date: "2024-05-02", desc: "Konsumsi rapat", type: "OUT", category: "Rapat", method: "Tunai", amount: 100000 },
    { key: 3, date: "2024-05-03", desc: "Donasi kegiatan", type: "IN", category: "Donasi", method: "Transfer", amount: 500000 },
    { key: 4, date: "2024-05-04", desc: "Cetak dokumen", type: "OUT", category: "Operasional", method: "Tunai", amount: 75000 },
    { key: 5, date: "2024-05-05", desc: "Sewa tempat", type: "OUT", category: "Operasional", method: "Transfer", amount: 300000 },
    { key: 6, date: "2024-05-06", desc: "Iuran anggota", type: "IN", category: "Iuran", method: "Transfer", amount: 250000 },
  ];
}

function SummaryCard({ title, value, tone = "blue" }) {
  const tones = {
    blue: { bg: "#dbeafe", fg: "#003a8c" },
    green: { bg: "#dff4ea", fg: "#135200" },
    red: { bg: "#ffe3e3", fg: "#a8071a" },
    orange: { bg: "#ffe7d6", fg: "#ad4e00" },
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

export default function CashIndex() {
  const raw = useMemo(() => buildMockTx(), []);

  // Filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [range, setRange] = useState([
    dayjs("2024-05-01"),
    dayjs("2024-05-31"),
  ]);

  const categories = useMemo(() => {
    const uniq = Array.from(new Set(raw.map((r) => r.category)));
    return ["ALL", ...uniq];
  }, [raw]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const [start, end] = range || [];

    return raw.filter((r) => {
      const matchSearch =
        !s ||
        r.desc.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.method.toLowerCase().includes(s);

      const matchType = type === "ALL" ? true : r.type === type;
      const matchCat = category === "ALL" ? true : r.category === category;

      const d = dayjs(r.date);
      const matchRange =
        !start || !end ? true : (d.isSame(start, "day") || d.isAfter(start, "day")) && (d.isSame(end, "day") || d.isBefore(end, "day"));

      return matchSearch && matchType && matchCat && matchRange;
    });
  }, [raw, q, type, category, range]);

  // Summary
  const summary = useMemo(() => {
    const income = filtered.filter((x) => x.type === "IN").reduce((s, x) => s + x.amount, 0);
    const expense = filtered.filter((x) => x.type === "OUT").reduce((s, x) => s + x.amount, 0);
    const balance = income - expense; // dummy: periode ini
    return { income, expense, balance };
  }, [filtered]);

  // Running balance (dummy)
  const rowsWithSaldo = useMemo(() => {
    // sort by date
    const sorted = [...filtered].sort((a, b) => (a.date > b.date ? 1 : -1));
    let saldo = 35500000; // starting saldo dummy
    return sorted.map((r) => {
      saldo = r.type === "IN" ? saldo + r.amount : saldo - r.amount;
      return { ...r, saldoAfter: saldo };
    });
  }, [filtered]);

  const handleAdd = () => message.info("TODO: buka modal tambah transaksi");
  const handleExport = () => message.success("TODO: export transaksi (CSV/Excel)");

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (v) => dayjs(v).format("DD/MM/YYYY"),
    },
    { title: "Keterangan", dataIndex: "desc", key: "desc" },
    {
      title: "Kategori",
      dataIndex: "category",
      key: "category",
      width: 140,
    },
    {
      title: "Tipe",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (v) =>
        v === "IN" ? <Tag color="green">Masuk</Tag> : <Tag color="red">Keluar</Tag>,
    },
    {
      title: "Metode",
      dataIndex: "method",
      key: "method",
      width: 120,
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (v, row) => (
        <Text strong style={{ color: row.type === "OUT" ? "#cf1322" : "#135200" }}>
          {row.type === "OUT" ? "-" : "+"} {formatIDR(v)}
        </Text>
      ),
    },
    {
      title: "Saldo",
      dataIndex: "saldoAfter",
      key: "saldoAfter",
      width: 160,
      align: "right",
      render: (v) => <Text type="secondary">{formatIDR(v)}</Text>,
    },
    {
      title: "Aksi",
      key: "aksi",
      width: 90,
      align: "right",
      render: (_, row) => {
        const items = [
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Edit",
            onClick: () => message.info(`TODO: edit transaksi #${row.key}`),
          },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            danger: true,
            label: "Hapus",
            onClick: () => message.warning(`TODO: hapus transaksi #${row.key}`),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <AppLayout title="Kas / Transaksi">
      <PageShell>
        <PageHeader
          title="Kas / Transaksi"
          extra={
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Tambah Transaksi
              </Button>
              <Button icon={<UploadOutlined />} onClick={handleExport}>
                Export
              </Button>
            </Space>
          }
        />

        {/* Filter bar */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space wrap size={10} style={{ width: "100%" }}>
            <Input
              allowClear
              value={q}
              onChange={(e) => setQ(e.target.value)}
              prefix={<SearchOutlined />}
              placeholder="Cari transaksi..."
              style={{ width: 260 }}
            />

            <Select
              value={type}
              onChange={setType}
              style={{ width: 160 }}
              options={[
                { value: "ALL", label: "Tipe: Semua" },
                { value: "IN", label: "Tipe: Masuk" },
                { value: "OUT", label: "Tipe: Keluar" },
              ]}
            />

            <Select
              value={category}
              onChange={setCategory}
              style={{ width: 180 }}
              options={categories.map((c) => ({
                value: c,
                label: c === "ALL" ? "Kategori: Semua" : `Kategori: ${c}`,
              }))}
            />

            <RangePicker
              value={range}
              onChange={(v) => setRange(v)}
              format="DD/MM/YYYY"
            />
          </Space>
        </Card>

        {/* Summary cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <SummaryCard title="Total Pemasukan (Filter)" value={summary.income} tone="green" />
          </Col>
          <Col xs={24} md={8}>
            <SummaryCard title="Total Pengeluaran (Filter)" value={summary.expense} tone="red" />
          </Col>
          <Col xs={24} md={8}>
            <SummaryCard title="Net (Pemasukan - Pengeluaran)" value={summary.balance} tone="blue" />
          </Col>
        </Row>

        {/* Table */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={rowsWithSaldo}
            rowKey="key"
            size="middle"
            pagination={{ pageSize: 8, position: ["bottomCenter"], showSizeChanger: false }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
