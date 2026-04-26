import React, { useEffect, useState, useTransition } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, DatePicker, Drawer, Empty, Form, Input, Modal, Select, Space, Table, Tag, Upload } from "antd";
import { DownloadOutlined, InboxOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";

const previewable = (mime) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);

export default function Archive() {
  const { documents, filters = {}, categories = [] } = usePage().props;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState(filters.search || "");
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    title: "",
    category: "arsip",
    document_number: "",
    document_date: "",
    description: "",
    attachments: [],
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== (filters.search || "")) {
        startTransition(() => router.get(route("secretariat.archive.index"), { ...filters, search, page: 1 }, { preserveState: true, replace: true }));
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const submit = () => {
    form.post(route("secretariat.archive.store"), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const applyFilter = (next) => {
    router.get(route("secretariat.archive.index"), { ...filters, ...next, page: 1 }, { preserveState: true, replace: true });
  };

  return (
    <AppLayout title="Sekretariat - Arsip">
      <PageShell>
        <PageHeader
          eyebrow="Archive"
          title="Arsip Dokumen"
          description="Arsip surat final otomatis dan dokumen manual dengan preview ringan."
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Upload Arsip</Button>}
        />

        <Card className="border-white/80 shadow-sm">
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Input className="col-span-5" allowClear prefix={<SearchOutlined />} placeholder="Cari judul, nomor, deskripsi..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select
              className="col-span-3"
              allowClear
              placeholder="Kategori"
              value={filters.category || undefined}
              onChange={(value) => applyFilter({ category: value || "" })}
              options={categories.map((category) => ({ label: category, value: category }))}
            />
            <Select
              className="col-span-3"
              allowClear
              placeholder="Source"
              value={filters.source || undefined}
              onChange={(value) => applyFilter({ source: value || "" })}
              options={[
                { label: "Manual upload", value: "manual" },
                { label: "Surat finalized", value: "letter_finalized" },
                { label: "Lampiran surat", value: "letter_attachment" },
                { label: "Agenda", value: "agenda" },
              ]}
            />
          </div>

          <Table
            rowKey="id"
            loading={isPending}
            dataSource={documents?.data || []}
            locale={{ emptyText: <Empty description="Belum ada arsip." /> }}
            pagination={{
              current: documents?.current_page,
              pageSize: documents?.per_page,
              total: documents?.total,
              showSizeChanger: false,
              onChange: (page) => router.get(route("secretariat.archive.index"), { ...filters, page }, { preserveState: true }),
            }}
            columns={[
              {
                title: "Dokumen",
                dataIndex: "title",
                render: (value, record) => (
                  <div>
                    <div className="font-medium text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">{record.original_name || record.file_path}</div>
                  </div>
                ),
              },
              { title: "Nomor", dataIndex: "document_number", render: (value) => value || "-" },
              { title: "Tanggal", dataIndex: "document_date", render: (value) => value || "-" },
              { title: "Kategori", dataIndex: "category", render: (value) => <Tag>{value || "-"}</Tag> },
              { title: "Source", dataIndex: "source", render: (value) => <Tag color={value === "letter_finalized" ? "green" : "blue"}>{value}</Tag> },
              {
                title: "Aksi",
                render: (_, record) => (
                  <Space>
                    {previewable(record.mime_type) ? <button className="text-red-700" onClick={() => setPreview(record)}>Preview</button> : null}
                    <a href={route("secretariat.documents.download", record.id)}>
                      <Button size="small" icon={<DownloadOutlined />}>Download</Button>
                    </a>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Drawer title="Upload Arsip Manual" open={open} onClose={() => setOpen(false)} size="large" destroyOnClose>
          <Form layout="vertical" onFinish={submit}>
            <Form.Item label="Judul arsip" required><Input value={form.data.title} onChange={(event) => form.setData("title", event.target.value)} /></Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="Kategori"><Input value={form.data.category} onChange={(event) => form.setData("category", event.target.value)} /></Form.Item>
              <Form.Item label="Nomor dokumen"><Input value={form.data.document_number} onChange={(event) => form.setData("document_number", event.target.value)} /></Form.Item>
            </div>
            <Form.Item label="Tanggal dokumen"><DatePicker className="w-full" onChange={(_, value) => form.setData("document_date", value)} /></Form.Item>
            <Form.Item label="Deskripsi"><Input.TextArea rows={4} value={form.data.description} onChange={(event) => form.setData("description", event.target.value)} /></Form.Item>
            <Upload.Dragger
              multiple
              beforeUpload={(file) => {
                form.setData("attachments", [...form.data.attachments, file]);
                return false;
              }}
              fileList={form.data.attachments}
              onRemove={(file) => form.setData("attachments", form.data.attachments.filter((item) => item.uid !== file.uid))}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Upload PDF, gambar, DOC/DOCX</p>
              <p className="ant-upload-hint">Maks 10MB per file.</p>
            </Upload.Dragger>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={form.processing}>Simpan Arsip</Button>
            </div>
          </Form>
        </Drawer>

        <Modal open={Boolean(preview)} title={preview?.title} width={920} footer={null} onCancel={() => setPreview(null)} destroyOnClose>
          {preview ? (
            preview.mime_type === "application/pdf" ? (
              <iframe title="Preview Arsip" src={route("secretariat.documents.preview", preview.id)} className="h-[720px] w-full rounded border" loading="lazy" />
            ) : (
              <img src={route("secretariat.documents.preview", preview.id)} alt={preview.title} className="max-h-[720px] w-full rounded object-contain" />
            )
          ) : null}
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
