import React, { useEffect, useState, useTransition } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, DatePicker, Drawer, Empty, Form, Input, List, Modal, Select, Space, Table, Tag, Upload } from "antd";
import { DownloadOutlined, InboxOutlined, PaperClipOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";

const statusColor = {
  planned: "blue",
  done: "green",
  cancelled: "red",
};

const canPreview = (mime) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);

export default function AgendaIndex() {
  const { agendas, filters = {} } = usePage().props;
  const [open, setOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState(filters.search || "");
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    title: "",
    type: "internal",
    status: "planned",
    start_at: "",
    end_at: "",
    location: "",
    pic_name: "",
    notes: "",
    attachments: [],
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== (filters.search || "")) {
        startTransition(() => router.get(route("secretariat.agenda.index"), { ...filters, search, page: 1 }, { preserveState: true, replace: true }));
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    form.setData({
      title: "",
      type: "internal",
      status: "planned",
      start_at: "",
      end_at: "",
      location: "",
      pic_name: "",
      notes: "",
      attachments: [],
    });
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setData({
      title: record.title || "",
      type: record.type || "internal",
      status: record.status || "planned",
      start_at: record.start_at ? String(record.start_at).slice(0, 16) : "",
      end_at: record.end_at ? String(record.end_at).slice(0, 16) : "",
      location: record.location || "",
      pic_name: record.pic_name || "",
      notes: record.notes || "",
      attachments: [],
    });
    setOpen(true);
  };

  const submit = () => {
    const data = { ...form.data };
    const options = {
      forceFormData: form.data.attachments.length > 0,
      preserveScroll: true,
      onSuccess: () => {
        form.setData("attachments", []);
        setOpen(false);
      },
    };

    if (editing) {
      router.post(route("secretariat.agenda.update", editing.id), { ...data, _method: "patch" }, options);
      return;
    }

    router.post(route("secretariat.agenda.store"), data, options);
  };

  const applyFilter = (next) => {
    router.get(route("secretariat.agenda.index"), { ...filters, ...next, page: 1 }, { preserveState: true, replace: true });
  };

  return (
    <AppLayout title="Sekretariat - Agenda">
      <PageShell>
        <PageHeader
          eyebrow="Agenda"
          title="Agenda Organisasi"
          description="Rapat dan rencana kegiatan dengan filter ringan dan lampiran."
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tambah Agenda</Button>}
        />

        <Card className="border-white/80 shadow-sm">
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Input className="col-span-5" allowClear prefix={<SearchOutlined />} placeholder="Cari judul, lokasi, PIC..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select
              className="col-span-3"
              allowClear
              placeholder="Status"
              value={filters.status || undefined}
              onChange={(value) => applyFilter({ status: value || "" })}
              options={[
                { label: "Planned", value: "planned" },
                { label: "Done", value: "done" },
                { label: "Cancelled", value: "cancelled" },
              ]}
            />
            <DatePicker.RangePicker className="col-span-4" onChange={(_, values) => applyFilter({ date_from: values?.[0] || "", date_to: values?.[1] || "" })} />
          </div>

          <Table
            rowKey="id"
            loading={isPending}
            dataSource={agendas?.data || []}
            locale={{ emptyText: <Empty description="Belum ada agenda." /> }}
            pagination={{
              current: agendas?.current_page,
              pageSize: agendas?.per_page,
              total: agendas?.total,
              showSizeChanger: false,
              onChange: (page) => router.get(route("secretariat.agenda.index"), { ...filters, page }, { preserveState: true }),
            }}
            columns={[
              { title: "Judul", dataIndex: "title", render: (value) => <span className="font-medium text-zinc-950">{value}</span> },
              { title: "Waktu", dataIndex: "start_at", render: (value) => (value ? new Date(value).toLocaleString("id-ID") : "-") },
              { title: "Lokasi", dataIndex: "location", render: (value) => value || "-" },
              { title: "PIC", dataIndex: "pic_name", render: (value) => value || "-" },
              {
                title: "Lampiran",
                dataIndex: "documents_count",
                align: "center",
                render: (value, record) => (
                  value > 0 ? (
                    <Button size="small" icon={<PaperClipOutlined />} onClick={() => setAttachmentsOpen(record)}>
                      {value} file
                    </Button>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )
                ),
              },
              { title: "Status", dataIndex: "status", render: (value) => <Tag color={statusColor[value] || "default"}>{value}</Tag> },
              {
                title: "Aksi",
                render: (_, record) => (
                  <Space>
                    <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
                    <Button size="small" danger onClick={() => router.delete(route("secretariat.agenda.destroy", record.id))}>Hapus</Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Drawer title={editing ? "Edit Agenda" : "Tambah Agenda"} open={open} onClose={() => setOpen(false)} size="large" destroyOnClose>
          <Form layout="vertical" onFinish={submit}>
            <Form.Item label="Judul agenda" required><Input value={form.data.title} onChange={(event) => form.setData("title", event.target.value)} /></Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label="Jenis"><Select value={form.data.type} onChange={(value) => form.setData("type", value)} options={[{ label: "Internal", value: "internal" }, { label: "External", value: "external" }]} /></Form.Item>
              <Form.Item label="Status"><Select value={form.data.status} onChange={(value) => form.setData("status", value)} options={[{ label: "Planned", value: "planned" }, { label: "Done", value: "done" }, { label: "Cancelled", value: "cancelled" }]} /></Form.Item>
              <Form.Item label="Mulai" required><Input type="datetime-local" value={form.data.start_at} onChange={(event) => form.setData("start_at", event.target.value)} /></Form.Item>
              <Form.Item label="Selesai"><Input type="datetime-local" value={form.data.end_at} onChange={(event) => form.setData("end_at", event.target.value)} /></Form.Item>
            </div>
            <Form.Item label="Lokasi"><Input value={form.data.location} onChange={(event) => form.setData("location", event.target.value)} /></Form.Item>
            <Form.Item label="Peserta / PIC"><Input value={form.data.pic_name} onChange={(event) => form.setData("pic_name", event.target.value)} /></Form.Item>
            <Form.Item label="Deskripsi / catatan"><Input.TextArea rows={4} value={form.data.notes} onChange={(event) => form.setData("notes", event.target.value)} /></Form.Item>
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
              <p className="ant-upload-text">Lampiran agenda opsional</p>
            </Upload.Dragger>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={form.processing}>Simpan</Button>
            </div>
          </Form>
        </Drawer>

        <Modal
          open={Boolean(attachmentsOpen)}
          title={`Lampiran Agenda${attachmentsOpen?.title ? `: ${attachmentsOpen.title}` : ""}`}
          footer={null}
          onCancel={() => setAttachmentsOpen(null)}
          destroyOnClose
        >
          <List
            dataSource={attachmentsOpen?.documents || []}
            locale={{ emptyText: "Belum ada lampiran." }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  canPreview(item.mime_type) ? <button className="text-red-700" onClick={() => setPreviewDocument(item)}>Preview</button> : null,
                  <a href={item.download_url}><Button size="small" icon={<DownloadOutlined />}>Download</Button></a>,
                ].filter(Boolean)}
              >
                <List.Item.Meta title={item.title} description={item.original_name || item.mime_type || "-"} />
              </List.Item>
            )}
          />
        </Modal>

        <Modal open={Boolean(previewDocument)} title={previewDocument?.title} width={920} footer={null} onCancel={() => setPreviewDocument(null)} destroyOnClose>
          {previewDocument ? (
            previewDocument.mime_type === "application/pdf" ? (
              <iframe title="Preview Lampiran Agenda" src={previewDocument.preview_url} className="h-[720px] w-full rounded border" loading="lazy" />
            ) : (
              <img src={previewDocument.preview_url} alt={previewDocument.title} className="max-h-[720px] w-full rounded object-contain" />
            )
          ) : null}
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
