import React, { useMemo, useState } from "react";
import { usePage, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import { Button, Card, Drawer, Form, Input, Space, Table, Upload, Tag } from "antd";
import { UploadOutlined } from "@ant-design/icons";

export default function Archive() {
  const { documents = [] } = usePage().props;

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const cols = useMemo(
    () => [
      { title: "Judul", dataIndex: "title", key: "title" },
      { title: "Kategori", dataIndex: "category", key: "category", width: 140, render: (v) => <Tag>{v}</Tag> },
      { title: "Upload", dataIndex: "uploaded_at", key: "uploaded_at", width: 120 },
      { title: "File", dataIndex: "file", key: "file", width: 180 },
    ],
    []
  );

  const onSubmit = (v) => {
    console.log(v);
    setOpen(false);
    form.resetFields();
  };

  return (
    <AppLayout title="Sekretariat - Arsip">
      <PageShell>
        <PageHeader
          title="Sekretariat — Arsip Dokumen"
          right={
            <Space>
              <Link href={route("secretariat.index")}>Surat</Link>
              <Link href={route("secretariat.agenda")}>Agenda</Link>
              <Button type="primary" onClick={() => setOpen(true)}>
                Upload Dokumen
              </Button>
            </Space>
          }
        />

        <Card style={{ borderRadius: 12 }}>
          <Table rowKey="id" columns={cols} dataSource={documents} pagination={{ pageSize: 8 }} />
        </Card>

        <Drawer title="Upload Dokumen" open={open} onClose={() => setOpen(false)} width={520} destroyOnClose>
          <Form layout="vertical" form={form} onFinish={onSubmit}>
            <Form.Item name="title" label="Judul Dokumen" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="category" label="Kategori">
              <Input placeholder="SK / Notulen / Surat / dll" />
            </Form.Item>

            <Form.Item label="File">
              <Upload beforeUpload={() => false} maxCount={1}>
                <Button icon={<UploadOutlined />}>Pilih File</Button>
              </Upload>
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
