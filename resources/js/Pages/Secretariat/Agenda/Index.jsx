import React, { useEffect, useState, useTransition } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, DatePicker, Drawer, Empty, Form, Input, List, Modal, Select, Space, Table, Tag, Upload } from "antd";
import { CalendarOutlined, DownloadOutlined, InboxOutlined, PaperClipOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import { buildGoogleCalendarUrl, canAddCalendarEvent } from "@/lib/googleCalendar";
import useBilingual from "@/Hooks/useBilingual";

const statusColor = {
  planned: "blue",
  done: "green",
  cancelled: "red",
};

const canPreview = (mime) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);

function agendaCalendarUrl(agenda, tx) {
  if (!canAddCalendarEvent({ start: agenda?.start_at, status: agenda?.status, allowedStatuses: ["planned"] })) return null;

  return buildGoogleCalendarUrl({
    title: agenda.title,
    start: agenda.start_at,
    end: agenda.end_at,
    location: agenda.location,
    details: [
      agenda.pic_name ? `${tx("PIC/Peserta", "PIC/Participants")}: ${agenda.pic_name}` : null,
      agenda.notes,
    ].filter(Boolean).join("\n\n"),
  });
}

export default function AgendaIndex() {
  const { agendas, filters = {} } = usePage().props;
  const { language, tx } = useBilingual();
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

  const editingCalendarUrl = agendaCalendarUrl(editing, tx);
  const statusLabels = {
    planned: tx("Direncanakan", "Planned"),
    done: tx("Selesai", "Done"),
    cancelled: tx("Dibatalkan", "Cancelled"),
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
    <AppLayout title={tx("Sekretariat - Agenda", "Secretariat - Agenda")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Agenda", "Agenda")}
          title={tx("Agenda Organisasi", "Organization Agenda")}
          description={tx("Rapat dan rencana kegiatan dengan filter ringan dan lampiran.", "Meetings and activity plans with simple filters and attachments.")}
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{tx("Tambah Agenda", "Add Agenda")}</Button>}
        />

        <Card className="border-white/80 shadow-sm">
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Input className="col-span-5" allowClear prefix={<SearchOutlined />} placeholder={tx("Cari judul, lokasi, PIC...", "Search title, location, PIC...")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select
              className="col-span-3"
              allowClear
              placeholder={tx("Status", "Status")}
              value={filters.status || undefined}
              onChange={(value) => applyFilter({ status: value || "" })}
              options={[
                { label: statusLabels.planned, value: "planned" },
                { label: statusLabels.done, value: "done" },
                { label: statusLabels.cancelled, value: "cancelled" },
              ]}
            />
            <DatePicker.RangePicker className="col-span-4" onChange={(_, values) => applyFilter({ date_from: values?.[0] || "", date_to: values?.[1] || "" })} />
          </div>

          <Table
            rowKey="id"
            loading={isPending}
            dataSource={agendas?.data || []}
            locale={{ emptyText: <Empty description={tx("Belum ada agenda.", "No agenda yet.")} /> }}
            pagination={{
              current: agendas?.current_page,
              pageSize: agendas?.per_page,
              total: agendas?.total,
              showSizeChanger: false,
              onChange: (page) => router.get(route("secretariat.agenda.index"), { ...filters, page }, { preserveState: true }),
            }}
            columns={[
              { title: tx("Judul", "Title"), dataIndex: "title", render: (value) => <span className="font-medium text-zinc-950">{value}</span> },
              { title: tx("Waktu", "Time"), dataIndex: "start_at", render: (value) => (value ? new Date(value).toLocaleString(language === "en" ? "en-US" : "id-ID") : "-") },
              { title: tx("Lokasi", "Location"), dataIndex: "location", render: (value) => value || "-" },
              { title: "PIC", dataIndex: "pic_name", render: (value) => value || "-" },
              {
                title: tx("Lampiran", "Attachments"),
                dataIndex: "documents_count",
                align: "center",
                render: (value, record) => (
                  value > 0 ? (
                    <Button size="small" icon={<PaperClipOutlined />} onClick={() => setAttachmentsOpen(record)}>
                      {value} {tx("file", "file")}
                    </Button>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )
                ),
              },
              { title: tx("Status", "Status"), dataIndex: "status", render: (value) => <Tag color={statusColor[value] || "default"}>{statusLabels[value] || value}</Tag> },
              {
                title: tx("Aksi", "Actions"),
                render: (_, record) => (
                  <Space>
                    {agendaCalendarUrl(record, tx) ? (
                      <Button size="small" icon={<CalendarOutlined />} href={agendaCalendarUrl(record, tx)} target="_blank">
                        Google Calendar
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => openEdit(record)}>{tx("Edit", "Edit")}</Button>
                    <Button size="small" danger onClick={() => router.delete(route("secretariat.agenda.destroy", record.id))}>{tx("Hapus", "Delete")}</Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Drawer
          title={editing ? tx("Edit Agenda", "Edit Agenda") : tx("Tambah Agenda", "Add Agenda")}
          open={open}
          onClose={() => setOpen(false)}
          size="large"
          destroyOnHidden
          extra={
            editingCalendarUrl ? (
              <Button icon={<CalendarOutlined />} href={editingCalendarUrl} target="_blank">
                {tx("Tambahkan ke Google Calendar", "Add to Google Calendar")}
              </Button>
            ) : null
          }
        >
          <Form layout="vertical" onFinish={submit}>
            <Form.Item label={tx("Judul agenda", "Agenda title")} required><Input value={form.data.title} onChange={(event) => form.setData("title", event.target.value)} /></Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label={tx("Jenis", "Type")}><Select value={form.data.type} onChange={(value) => form.setData("type", value)} options={[{ label: tx("Internal", "Internal"), value: "internal" }, { label: tx("Eksternal", "External"), value: "external" }]} /></Form.Item>
              <Form.Item label={tx("Status", "Status")}><Select value={form.data.status} onChange={(value) => form.setData("status", value)} options={Object.entries(statusLabels).map(([value, label]) => ({ label, value }))} /></Form.Item>
              <Form.Item label={tx("Mulai", "Start")} required><Input type="datetime-local" value={form.data.start_at} onChange={(event) => form.setData("start_at", event.target.value)} /></Form.Item>
              <Form.Item label={tx("Selesai", "End")}><Input type="datetime-local" value={form.data.end_at} onChange={(event) => form.setData("end_at", event.target.value)} /></Form.Item>
            </div>
            <Form.Item label={tx("Lokasi", "Location")}><Input value={form.data.location} onChange={(event) => form.setData("location", event.target.value)} /></Form.Item>
            <Form.Item label={tx("Peserta / PIC", "Participants / PIC")}><Input value={form.data.pic_name} onChange={(event) => form.setData("pic_name", event.target.value)} /></Form.Item>
            <Form.Item label={tx("Deskripsi / catatan", "Description / notes")}><Input.TextArea rows={4} value={form.data.notes} onChange={(event) => form.setData("notes", event.target.value)} /></Form.Item>
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
              <p className="ant-upload-text">{tx("Lampiran agenda opsional", "Optional agenda attachments")}</p>
            </Upload.Dragger>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>{tx("Batal", "Cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={form.processing}>{tx("Simpan", "Save")}</Button>
            </div>
          </Form>
        </Drawer>

        <Modal
          open={Boolean(attachmentsOpen)}
          title={`${tx("Lampiran Agenda", "Agenda Attachments")}${attachmentsOpen?.title ? `: ${attachmentsOpen.title}` : ""}`}
          footer={null}
          onCancel={() => setAttachmentsOpen(null)}
          destroyOnHidden
        >
          <List
            dataSource={attachmentsOpen?.documents || []}
            locale={{ emptyText: tx("Belum ada lampiran.", "No attachments yet.") }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  canPreview(item.mime_type) ? <button className="text-red-700" onClick={() => setPreviewDocument(item)}>{tx("Pratinjau", "Preview")}</button> : null,
                  <a href={item.download_url}><Button size="small" icon={<DownloadOutlined />}>{tx("Unduh", "Download")}</Button></a>,
                ].filter(Boolean)}
              >
                <List.Item.Meta title={item.title} description={item.original_name || item.mime_type || "-"} />
              </List.Item>
            )}
          />
        </Modal>

        <Modal open={Boolean(previewDocument)} title={previewDocument?.title} width={920} footer={null} onCancel={() => setPreviewDocument(null)} destroyOnHidden>
          {previewDocument ? (
            previewDocument.mime_type === "application/pdf" ? (
              <iframe title={tx("Pratinjau Lampiran Agenda", "Agenda Attachment Preview")} src={previewDocument.preview_url} className="h-[720px] w-full rounded border" loading="lazy" />
            ) : (
              <img src={previewDocument.preview_url} alt={previewDocument.title} className="max-h-[720px] w-full rounded object-contain" />
            )
          ) : null}
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
