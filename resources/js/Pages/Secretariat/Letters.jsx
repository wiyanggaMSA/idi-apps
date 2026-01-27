import React, { useMemo, useState } from "react";
import { usePage, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import { Button, Card, Drawer, Form, Input, Segmented, Select, Space, Table, Tag, Typography } from "antd";

const { Text } = Typography;

export default function Letters() {
  const { letters = [], templates = [] } = usePage().props;

  const [filter, setFilter] = useState("all"); // all|in|out
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const filtered = useMemo(() => {
    if (filter === "all") return letters;
    return letters.filter((l) => l.type === filter);
  }, [letters, filter]);

  const cols = useMemo(
    () => [
      {
        title: "Tipe",
        dataIndex: "type",
        key: "type",
        width: 90,
        render: (v) => (v === "in" ? <Tag>MASUK</Tag> : <Tag color="blue">KELUAR</Tag>),
      },
      {
        title: "Nomor",
        dataIndex: "letter_no",
        key: "letter_no",
        width: 180,
        render: (v) => (v ? <Text strong>{v}</Text> : <Tag color="default">DRAFT</Tag>),
      },
      { title: "Perihal", dataIndex: "subject", key: "subject" },
      { title: "Tanggal", dataIndex: "date", key: "date", width: 120 },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (v) => {
          const map = { sent: "green", received: "gold", draft: "default", archived: "default" };
          return <Tag color={map[v] || "default"}>{String(v).toUpperCase()}</Tag>;
        },
      },
    ],
    []
  );

  const onSubmit = (values) => {
    // dummy: nanti ganti inertia post ke backend create letter
    console.log(values);
    setOpen(false);
    form.resetFields();
  };

  return (
    <AppLayout title="Sekretariat - Surat">
      <PageShell>
        <PageHeader
          title="Sekretariat — Surat"
          right={
            <Space>
              <Link href={route("secretariat.agenda")}>Agenda</Link>
              <Link href={route("secretariat.archive")}>Arsip</Link>
              <Button type="primary" onClick={() => setOpen(true)}>
                Buat / Generate Surat
              </Button>
            </Space>
          }
        />

        <Card style={{ borderRadius: 12 }}>
          <Space style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { label: "Semua", value: "all" },
                { label: "Surat Masuk", value: "in" },
                { label: "Surat Keluar", value: "out" },
              ]}
            />
            <Input.Search placeholder="Cari nomor/perihal..." style={{ maxWidth: 320 }} />
          </Space>

          <Table rowKey="id" columns={cols} dataSource={filtered} pagination={{ pageSize: 8 }} />
        </Card>

        <Drawer
          title="Buat / Generate Surat"
          open={open}
          onClose={() => setOpen(false)}
          width={520}
          destroyOnClose
        >
          <Form layout="vertical" form={form} onFinish={onSubmit}>
            <Form.Item name="type" label="Jenis Surat" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: "Surat Masuk", value: "in" },
                  { label: "Surat Keluar", value: "out" },
                ]}
              />
            </Form.Item>

            <Form.Item name="template_id" label="Template (opsional untuk auto-format)">
              <Select
                allowClear
                placeholder="Pilih template untuk generate otomatis"
                options={templates.map((t) => ({ label: `${t.name}`, value: t.id }))}
              />
            </Form.Item>

            <Form.Item name="subject" label="Perihal" rules={[{ required: true }]}>
              <Input placeholder="Contoh: Undangan Rapat..." />
            </Form.Item>

            <Form.Item name="to" label="Kepada / Penerima (opsional)">
              <Input placeholder="Nama instansi / penerima" />
            </Form.Item>

            <Form.Item name="content" label="Isi Surat (opsional, jika tidak pakai template)">
              <Input.TextArea rows={6} placeholder="Isi surat..." />
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit">
                Simpan Draft
              </Button>
            </Space>

            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                *Nanti kita tambahkan tombol “Generate Nomor Surat + Export PDF” (server-side) setelah modul DB siap.
              </Text>
            </div>
          </Form>
        </Drawer>
      </PageShell>
    </AppLayout>
  );
}
