import React, { useEffect, useState, useTransition } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, DatePicker, Drawer, Empty, Form, Input, Modal, Select, Space, Table, Tag, Upload } from "antd";
import { DownloadOutlined, InboxOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import useBilingual from "@/Hooks/useBilingual";

const previewable = (mime) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);

export default function Archive() {
  const { documents, filters = {}, categories = [] } = usePage().props;
  const { tx } = useBilingual();
  const sourceLabels = {
    manual: tx("Unggahan manual", "Manual upload"),
    letter_finalized: tx("Surat difinalisasi", "Finalized letter"),
    letter_attachment: tx("Lampiran surat", "Letter attachment"),
    agenda: tx("Agenda", "Agenda"),
  };
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
    <AppLayout title={tx("Sekretariat - Arsip", "Secretariat - Archive")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Arsip", "Archive")}
          title={tx("Arsip Dokumen", "Document Archive")}
          description={tx("Arsip surat final otomatis dan dokumen manual dengan pratinjau ringan.", "Automatically archived final letters and manually uploaded documents with a lightweight preview.")}
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{tx("Unggah Arsip", "Upload Archive")}</Button>}
        />

        <Card className="border-white/80 shadow-sm">
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Input className="col-span-5" allowClear prefix={<SearchOutlined />} placeholder={tx("Cari judul, nomor, deskripsi...", "Search title, number, description...")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select
              className="col-span-3"
              allowClear
              placeholder={tx("Kategori", "Category")}
              value={filters.category || undefined}
              onChange={(value) => applyFilter({ category: value || "" })}
              options={categories.map((category) => ({ label: category, value: category }))}
            />
            <Select
              className="col-span-3"
              allowClear
              placeholder={tx("Sumber", "Source")}
              value={filters.source || undefined}
              onChange={(value) => applyFilter({ source: value || "" })}
              options={Object.entries(sourceLabels).map(([value, label]) => ({ label, value }))}
            />
          </div>

          <Table
            rowKey="id"
            loading={isPending}
            dataSource={documents?.data || []}
            locale={{ emptyText: <Empty description={tx("Belum ada arsip.", "No archived documents yet.")} /> }}
            pagination={{
              current: documents?.current_page,
              pageSize: documents?.per_page,
              total: documents?.total,
              showSizeChanger: false,
              onChange: (page) => router.get(route("secretariat.archive.index"), { ...filters, page }, { preserveState: true }),
            }}
            columns={[
              {
                title: tx("Dokumen", "Document"),
                dataIndex: "title",
                render: (value, record) => (
                  <div>
                    <div className="font-medium text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">{record.original_name || record.file_path}</div>
                  </div>
                ),
              },
              { title: tx("Nomor", "Number"), dataIndex: "document_number", render: (value) => value || "-" },
              { title: tx("Tanggal", "Date"), dataIndex: "document_date", render: (value) => value || "-" },
              { title: tx("Kategori", "Category"), dataIndex: "category", render: (value) => <Tag>{value || "-"}</Tag> },
              { title: tx("Sumber", "Source"), dataIndex: "source", render: (value) => <Tag color={value === "letter_finalized" ? "green" : "blue"}>{sourceLabels[value] || value}</Tag> },
              {
                title: tx("Aksi", "Actions"),
                render: (_, record) => (
                  <Space>
                    {previewable(record.mime_type) ? <button className="text-red-700" onClick={() => setPreview(record)}>{tx("Pratinjau", "Preview")}</button> : null}
                    <a href={route("secretariat.documents.download", record.id)}>
                      <Button size="small" icon={<DownloadOutlined />}>{tx("Unduh", "Download")}</Button>
                    </a>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Drawer title={tx("Unggah Arsip Manual", "Upload Manual Archive")} open={open} onClose={() => setOpen(false)} size="large" destroyOnHidden>
          <Form layout="vertical" onFinish={submit}>
            <Form.Item label={tx("Judul arsip", "Archive title")} required><Input value={form.data.title} onChange={(event) => form.setData("title", event.target.value)} /></Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label={tx("Kategori", "Category")}><Input value={form.data.category} onChange={(event) => form.setData("category", event.target.value)} /></Form.Item>
              <Form.Item label={tx("Nomor dokumen", "Document number")}><Input value={form.data.document_number} onChange={(event) => form.setData("document_number", event.target.value)} /></Form.Item>
            </div>
            <Form.Item label={tx("Tanggal dokumen", "Document date")}><DatePicker className="w-full" onChange={(_, value) => form.setData("document_date", value)} /></Form.Item>
            <Form.Item label={tx("Deskripsi", "Description")}><Input.TextArea rows={4} value={form.data.description} onChange={(event) => form.setData("description", event.target.value)} /></Form.Item>
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
              <p className="ant-upload-text">{tx("Unggah PDF, gambar, DOC/DOCX", "Upload PDF, image, or DOC/DOCX files")}</p>
              <p className="ant-upload-hint">{tx("Maks. 10 MB per file.", "Max. 10 MB per file.")}</p>
            </Upload.Dragger>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>{tx("Batal", "Cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={form.processing}>{tx("Simpan Arsip", "Save Archive")}</Button>
            </div>
          </Form>
        </Drawer>

        <Modal open={Boolean(preview)} title={preview?.title} width={920} footer={null} onCancel={() => setPreview(null)} destroyOnHidden>
          {preview ? (
            preview.mime_type === "application/pdf" ? (
              <iframe title={tx("Pratinjau Arsip", "Archive Preview")} src={route("secretariat.documents.preview", preview.id)} className="h-[720px] w-full rounded border" loading="lazy" />
            ) : (
              <img src={route("secretariat.documents.preview", preview.id)} alt={preview.title} className="max-h-[720px] w-full rounded object-contain" />
            )
          ) : null}
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
