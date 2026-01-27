import React, { useMemo, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";

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

function buildPeriodOptions() {
  // contoh 12 bulan terakhir (dummy)
  const base = dayjs();
  return Array.from({ length: 12 }).map((_, i) => {
    const d = base.subtract(i, "month");
    const value = d.format("YYYY-MM");
    const label = d.format("MMMM YYYY"); // butuh locale? default EN; cukup untuk dummy
    return { value, label };
  });
}

export default function DuesIndex() {
  const [form] = Form.useForm();

  // Dummy master data
  const members = useMemo(
    () => [
      { value: 1, label: "Siti Aisyah" },
      { value: 2, label: "Andi Pratama" },
      { value: 3, label: "Morg Koran" },
      { value: 4, label: "Raka Norvan" },
    ],
    []
  );

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  // Dummy history table
  const [history, setHistory] = useState(() => [
    {
      key: 1,
      tanggal: "20-05-2024",
      nama: "Siti Aisyah",
      periode: "Mei 2024",
      jumlah: 100000,
      metode: "Transfer Bank",
      status: "BERHASIL",
    },
    {
      key: 2,
      tanggal: "20-05-2024",
      nama: "Morg Koran",
      periode: "Mei 2024",
      jumlah: 120000,
      metode: "Tunai",
      status: "GAGAL",
    },
    {
      key: 3,
      tanggal: "21-05-2024",
      nama: "Raka Norvan",
      periode: "Mei 2024",
      jumlah: 120000,
      metode: "E-Wallet",
      status: "MENUNGGU",
    },
  ]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const member = members.find((m) => m.value === values.member_id);
      const periodLabel =
        periodOptions.find((p) => p.value === values.period)?.label || values.period;

      const payload = {
        key: Date.now(),
        tanggal: dayjs(values.paid_at).format("DD-MM-YYYY"),
        nama: member?.label || "-",
        periode: periodLabel,
        jumlah: values.amount,
        metode: values.method,
        status: "BERHASIL", // dummy
      };

      setHistory((prev) => [payload, ...prev]);

      message.success("Pembayaran tersimpan (dummy). Nanti tinggal sambungkan ke backend.");
      form.resetFields(["amount", "method", "paid_at"]);
      form.setFieldsValue({ amount: 100000, method: "Transfer Bank", paid_at: dayjs() });
    } catch (e) {
      // validation error -> do nothing
    }
  };

  const columns = [
    { title: "Tanggal", dataIndex: "tanggal", key: "tanggal", width: 130 },
    { title: "Nama Anggota", dataIndex: "nama", key: "nama" },
    { title: "Periode", dataIndex: "periode", key: "periode", width: 140 },
    {
      title: "Jumlah",
      dataIndex: "jumlah",
      key: "jumlah",
      width: 140,
      align: "right",
      render: (v) => <Text strong>{formatIDR(v)}</Text>,
    },
    { title: "Metode", dataIndex: "metode", key: "metode", width: 140 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => {
        if (v === "BERHASIL") return <Tag color="green">BERHASIL</Tag>;
        if (v === "GAGAL") return <Tag color="red">GAGAL</Tag>;
        return <Tag color="gold">MENUNGGU</Tag>;
      },
    },
  ];

  // initial values (mirip contoh)
  const initialValues = {
    member_id: 1,
    period: periodOptions[0]?.value,
    amount: 100000,
    method: "Transfer Bank",
    paid_at: dayjs(),
  };

  return (
    <AppLayout title="Pembayaran Iuran">
      <PageShell>
        <PageHeader title="Pembayaran Iuran" />

        {/* Form area */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
                requiredMark={false}
              >
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Pilih Anggota"
                      name="member_id"
                      rules={[{ required: true, message: "Pilih anggota" }]}
                    >
                      <Select
                        options={members}
                        showSearch
                        placeholder="Pilih anggota..."
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Periode"
                      name="period"
                      rules={[{ required: true, message: "Pilih periode" }]}
                    >
                      <Select options={periodOptions} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Nominal Bayar"
                      name="amount"
                      rules={[{ required: true, message: "Masukkan nominal" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={1000}
                        formatter={(v) => `Rp ${String(v || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                        parser={(v) => Number(String(v || "").replace(/[^\d]/g, ""))}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Metode"
                      name="method"
                      rules={[{ required: true, message: "Pilih metode" }]}
                    >
                      <Select
                        options={[
                          { value: "Transfer Bank", label: "Transfer Bank" },
                          { value: "Tunai", label: "Tunai" },
                          { value: "E-Wallet", label: "E-Wallet" },
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Tanggal Bayar"
                      name="paid_at"
                      rules={[{ required: true, message: "Pilih tanggal bayar" }]}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12} style={{ display: "flex", alignItems: "end" }}>
                    <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                      <Button type="primary" onClick={handleSubmit}>
                        Simpan Pembayaran
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Form>
            </Col>

            {/* Right summary small (opsional, mirip feel UI) */}
            <Col xs={24} lg={10}>
              <Card
                style={{ borderRadius: 12, background: "#f5f7fb" }}
                bodyStyle={{ padding: 16 }}
              >
                <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                  Ringkasan (dummy)
                </Text>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text>Total iuran bulan ini</Text>
                    <Text strong>{formatIDR(5200000)}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text>Anggota menunggak</Text>
                    <Text strong>12</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text>Nominal tunggakan</Text>
                    <Text strong>{formatIDR(2400000)}</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* History table */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns}
            dataSource={history}
            rowKey="key"
            size="middle"
            pagination={{ pageSize: 6, position: ["bottomCenter"], showSizeChanger: false }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
