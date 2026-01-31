import React, { useMemo, useState } from "react";
import { usePage, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import { Button, Card, Drawer, Form, Input, Space, Table, Tag } from "antd";

export default function Agenda() {
  const { events = [] } = usePage().props;
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const cols = useMemo(
    () => [
      { title: "Judul", dataIndex: "title", key: "title" },
      { title: "Waktu", dataIndex: "start_at", key: "start_at", width: 160 },
      { title: "Lokasi", dataIndex: "location", key: "location", width: 160 },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (v) => <Tag>{String(v).toUpperCase()}</Tag>,
      },
    ],
    []
  );

  const onSubmit = (v) => {
    console.log(v);
    setOpen(false);
    form.resetFields();
  };

  return (
    <AppLayout title="Sekretariat - Agenda">
      <PageShell>
        <PageHeader
          title="Sekretariat — Agenda & Kegiatan"
          extra={
            <Space>
              <Link href={route("secretariat.index")}>Surat</Link>
              <Link href={route("secretariat.archive")}>Arsip</Link>
              <Button type="primary" onClick={() => setOpen(true)}>
                Tambah Agenda
              </Button>
            </Space>
          }
        />

        <Card style={{ borderRadius: 12 }}>
          <Table rowKey="id" columns={cols} dataSource={events} pagination={{ pageSize: 8 }} />
        </Card>

        <Drawer title="Tambah Agenda" open={open} onClose={() => setOpen(false)} width={520} destroyOnClose>
          <Form layout="vertical" form={form} onFinish={onSubmit}>
            <Form.Item name="title" label="Judul" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="start_at" label="Waktu Mulai" rules={[{ required: true }]}>
              <Input placeholder="2026-01-30 15:00" />
            </Form.Item>
            <Form.Item name="location" label="Lokasi">
              <Input />
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit">
                Simpan
              </Button>
            </Space>
          </Form>
        </Drawer>
      </PageShell>
    </AppLayout>
  );
}
