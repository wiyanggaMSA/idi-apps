import React, { useMemo, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Dropdown,
  Input,
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
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Text, Link } = Typography;

function buildMockMembers() {
  return [
    {
      key: 1,
      member_no: "A-0001",
      name: "Andi Pratama",
      phone: "0812-1111-2222",
      division: "Staffang",
      status: "AKTIF",
      dues: "Bayar",
    },
    {
      key: 2,
      member_no: "A-0002",
      name: "Siti Aisyah",
      phone: "0813-3333-4444",
      division: "Pendlang",
      status: "AKTIF",
      dues: "Bayar",
    },
    {
      key: 3,
      member_no: "A-0003",
      name: "Morg Koran",
      phone: "0812-8888-9999",
      division: "Voga",
      status: "AKTIF",
      dues: "Menunggak",
    },
    {
      key: 4,
      member_no: "A-0004",
      name: "Andi Oyida",
      phone: "0812-5555-6666",
      division: "Semut",
      status: "AKTIF",
      dues: "Bayar",
    },
    {
      key: 5,
      member_no: "A-0005",
      name: "Raka Norvan",
      phone: "0811-9999-7777",
      division: "Kunges",
      status: "AKTIF",
      dues: "Menunggak",
    },
    {
      key: 6,
      member_no: "A-0006",
      name: "Jatti Akir",
      phone: "0812-1010-2020",
      division: "Bansing",
      status: "AKTIF",
      dues: "Bayar",
    },
  ];
}

export default function MembersIndex() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("AKTIF");
  const [division, setDivision] = useState("ALL");

  const raw = useMemo(() => buildMockMembers(), []);

  const divisions = useMemo(() => {
    const uniq = Array.from(new Set(raw.map((r) => r.division)));
    return ["ALL", ...uniq];
  }, [raw]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return raw.filter((r) => {
      const matchSearch =
        !s ||
        r.member_no.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        r.phone.toLowerCase().includes(s);

      const matchStatus = status === "ALL" ? true : r.status === status;
      const matchDivision = division === "ALL" ? true : r.division === division;

      return matchSearch && matchStatus && matchDivision;
    });
  }, [raw, search, status, division]);

  const handleAdd = () => {
    message.info("TODO: buka modal/form tambah anggota");
  };

  const handleExport = () => {
    message.success("TODO: export data (CSV/Excel)");
  };

  const columns = [
    {
      title: "No. Anggota",
      dataIndex: "member_no",
      key: "member_no",
      width: 160,
      render: (v, row) => (
        <Space>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: "1px solid #b7d7ff",
              background: "#e6f4ff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ⧉
          </span>
          <Link onClick={() => message.info(`TODO: buka detail ${row.name}`)}>
            {v}
          </Link>
        </Space>
      ),
    },
    { title: "Nama", dataIndex: "name", key: "name" },
    { title: "Telepon", dataIndex: "phone", key: "phone", width: 160 },
    { title: "Divisi", dataIndex: "division", key: "division", width: 140 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => <Tag color="green" style={{ fontWeight: 700 }}>{v}</Tag>,
    },
    {
      title: "Iuran",
      dataIndex: "dues",
      key: "dues",
      width: 120,
      render: (v) => {
        if (v === "Menunggak") {
          return <Text style={{ color: "#fa8c16", fontWeight: 700 }}>Menunggak</Text>;
        }
        return <Link style={{ fontWeight: 700 }}>Bayar</Link>;
      },
    },
    {
      title: "Aksi",
      key: "actions",
      width: 100,
      align: "right",
      render: (_, row) => {
        const items = [
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Edit",
            onClick: () => message.info(`TODO: edit ${row.name}`),
          },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            danger: true,
            label: "Hapus",
            onClick: () => message.warning(`TODO: hapus ${row.name}`),
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
    <AppLayout title="Data Anggota">
      <PageShell>
        <PageHeader
          title="Data Anggota"
          extra={
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Tambah Anggota
              </Button>
              <Button icon={<UploadOutlined />} onClick={handleExport}>
                Export
              </Button>
            </Space>
          }
        />

        {/* Filter bar (mirip gambar) */}
        <Card
          style={{ borderRadius: 12, marginBottom: 12 }}
          bodyStyle={{ padding: 12 }}
        >
          <Space wrap size={10} style={{ width: "100%" }}>
            <Input
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchOutlined />}
              placeholder="Cari Anggota..."
              style={{ width: 260 }}
            />

            <Select
              value={status}
              onChange={setStatus}
              style={{ width: 170 }}
              options={[
                { value: "AKTIF", label: "Status: Aktif" },
                { value: "NONAKTIF", label: "Status: Nonaktif" },
                { value: "ALL", label: "Status: Semua" },
              ]}
            />

            <Select
              value={division}
              onChange={setDivision}
              style={{ width: 170 }}
              options={divisions.map((d) => ({
                value: d,
                label: d === "ALL" ? "Divisi: Semua" : `Divisi: ${d}`,
              }))}
            />
          </Space>
        </Card>

        {/* Table (mirip gambar: header abu, border halus, pagination bawah) */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="key"
            size="middle"
            pagination={{
              pageSize: 6,
              position: ["bottomCenter"],
              showSizeChanger: false,
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
