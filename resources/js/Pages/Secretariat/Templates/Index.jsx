import React, { useState } from "react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Image, Input, InputNumber, Select, Space, Switch, Table, Tag, Typography, Upload } from "antd";
import { DeleteOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import SimpleRichTextEditor from "@/Components/SimpleRichTextEditor";
import useBilingual from "@/Hooks/useBilingual";

const defaultContent = `<p>Dengan hormat,</p><p>{isi_surat}</p>`;
const defaultSigner = { member_id: undefined, name: "", title: "", position: "right", qr_enabled: true };
const normalizeSigners = (record = {}) => {
  const source = Array.isArray(record.signers_json) && record.signers_json.length
    ? record.signers_json
    : [{ name: record.signer_name || "", title: record.signer_title || "", position: "right", qr_enabled: record.qr_enabled !== false }];

  return source.slice(0, 3).map((signer, index) => ({
    name: signer.name || "",
    member_id: signer.member_id || undefined,
    title: signer.title || signer.role || "",
    position: ["left", "center", "right"].includes(signer.position) ? signer.position : (index === 0 ? "right" : "left"),
    qr_enabled: signer.qr_enabled !== false,
  }));
};

export default function TemplatesIndex() {
  const { templates = [], placeholders = [], signerMembers = [] } = usePage().props;
  const { tx } = useBilingual();
  const signerPositionOptions = [
    { label: tx("Kiri", "Left"), value: "left" },
    { label: tx("Tengah", "Center"), value: "center" },
    { label: tx("Kanan", "Right"), value: "right" },
  ];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const form = useForm({
    name: "",
    code: "",
    classification: "",
    number_format: "{number}/IDI-PWK/{roman_month}/{year}",
    number_reset_policy: "yearly",
    last_number: 0,
    header_image: null,
    header_image_path: "",
    header_image_url: "",
    header_height_px: 132,
    document_mode: "flow",
    content_text: defaultContent,
    signer_name: "",
    signer_title: "",
    signers: [{ ...defaultSigner }],
    signature_enabled: true,
    qr_enabled: true,
    is_active: true,
  });

  const openCreate = () => {
    setEditing(null);
    form.setData({
      name: "",
      code: "",
      classification: "",
      number_format: "{number}/IDI-PWK/{roman_month}/{year}",
      number_reset_policy: "yearly",
      last_number: 0,
      header_image: null,
      header_image_path: "",
      header_image_url: "",
      header_height_px: 132,
      document_mode: "flow",
      content_text: defaultContent,
      signer_name: "",
      signer_title: "",
      signers: [{ ...defaultSigner }],
      signature_enabled: true,
      qr_enabled: true,
      is_active: true,
    });
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setData({
      name: record.name || "",
      code: record.code || "",
      classification: record.classification || "",
      number_format: record.number_format || "{number}/IDI-PWK/{roman_month}/{year}",
      number_reset_policy: record.number_reset_policy || "yearly",
      last_number: record.last_number || 0,
      header_image: null,
      header_image_path: record.header_image_path || "",
      header_image_url: record.header_image_url || "",
      header_height_px: record.header_height_px || 132,
      document_mode: record.document_mode || "flow",
      content_text: record.content_text || defaultContent,
      signer_name: record.signer_name || "",
      signer_title: record.signer_title || "",
      signers: normalizeSigners(record),
      signature_enabled: record.signature_enabled !== false,
      qr_enabled: record.qr_enabled !== false,
      is_active: record.is_active !== false,
    });
    setOpen(true);
  };

  const submit = () => {
    const signers = normalizeSigners({
      signers_json: form.data.signers,
      signer_name: form.data.signer_name,
      signer_title: form.data.signer_title,
      qr_enabled: form.data.qr_enabled,
    });
    const primarySigner = signers[0] || defaultSigner;
    const payload = {
      ...form.data,
      signer_name: primarySigner.name,
      signer_title: primarySigner.title,
      signers,
      header_image: form.data.header_image,
    };

    if (editing) {
      router.post(route("secretariat.templates.update", editing.id), { ...payload, _method: "patch" }, {
        forceFormData: Boolean(form.data.header_image),
        preserveScroll: true,
        onSuccess: () => setOpen(false),
      });
      return;
    }
    router.post(route("secretariat.templates.store"), payload, {
      forceFormData: Boolean(form.data.header_image),
      preserveScroll: true,
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <AppLayout title={tx("Sekretariat - Template Surat", "Secretariat - Letter Templates")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Template", "Templates")}
          title={tx("Template Surat", "Letter Templates")}
          description={tx("Atur isi template, placeholder, format nomor otomatis, penandatangan, QR, dan status aktif.", "Configure template content, placeholders, automatic numbering, signers, QR codes, and active status.")}
          extra={
            <Space>
              <Link href={route("secretariat.letters.index")}><Button>{tx("Daftar Surat", "Letter List")}</Button></Link>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{tx("Tambah Template", "Add Template")}</Button>
            </Space>
          }
        />

        <Card className="border-white/80 shadow-sm">
          <Table
            rowKey="id"
            dataSource={templates}
            pagination={false}
            columns={[
              {
                title: tx("Template", "Template"),
                dataIndex: "name",
                render: (value, record) => (
                  <div>
                    <div className="font-medium text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">{record.code || "-"}</div>
                  </div>
                ),
              },
              { title: tx("Jenis", "Type"), dataIndex: "classification", render: (value) => value || "-" },
              { title: tx("Format Nomor", "Number Format"), dataIndex: "number_format" },
              {
                title: tx("Kop", "Letterhead"),
                dataIndex: "header_image_url",
                render: (value) => value ? <Tag color="blue">{tx("Gambar resmi", "Official image")}</Tag> : <Tag>{tx("Otomatis", "Automatic")}</Tag>,
              },
              { title: tx("Nomor Terakhir", "Last Number"), dataIndex: "last_number", align: "center" },
              {
                title: tx("Status", "Status"),
                dataIndex: "is_active",
                render: (value) => <Tag color={value ? "green" : "default"}>{value ? tx("Aktif", "Active") : tx("Nonaktif", "Inactive")}</Tag>,
              },
              {
                title: tx("Aksi", "Actions"),
                render: (_, record) => (
                  <Space>
                    <Button size="small" onClick={() => openEdit(record)}>{tx("Edit", "Edit")}</Button>
                    <Link href={route("secretariat.templates.builder", record.id)}>{tx("Tata Letak", "Layout")}</Link>
                    <Button size="small" danger onClick={() => router.delete(route("secretariat.templates.destroy", record.id))}>{tx("Hapus", "Delete")}</Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <style>{`
          .secretariat-template-drawer .ant-drawer-content-wrapper {
            width: min(1180px, 94vw) !important;
          }
          .secretariat-template-drawer .ant-drawer-body {
            padding: 20px 24px 28px;
          }
          .secretariat-template-drawer .ql-container {
            min-height: 220px;
          }
        `}</style>

        <Drawer
          title={editing ? tx("Edit Template", "Edit Template") : tx("Tambah Template", "Add Template")}
          open={open}
          onClose={() => setOpen(false)}
          rootClassName="secretariat-template-drawer"
          size="large"
          destroyOnHidden
        >
          <Form layout="vertical" onFinish={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item label={tx("Nama template", "Template name")} required>
                <Input value={form.data.name} onChange={(event) => form.setData("name", event.target.value)} />
              </Form.Item>
              <Form.Item label={tx("Kode", "Code")}>
                <Input value={form.data.code} onChange={(event) => form.setData("code", event.target.value)} />
              </Form.Item>
              <Form.Item label={tx("Jenis surat", "Letter type")}>
                <Input value={form.data.classification} onChange={(event) => form.setData("classification", event.target.value)} placeholder="SEK, UND, REK..." />
              </Form.Item>
              <Form.Item label={tx("Nomor terakhir", "Last number")}>
                <InputNumber className="w-full" min={0} value={form.data.last_number} onChange={(value) => form.setData("last_number", value || 0)} />
              </Form.Item>
            </div>

            <Form.Item label={tx("Format nomor surat", "Letter number format")} required>
              <Input value={form.data.number_format} onChange={(event) => form.setData("number_format", event.target.value)} />
            </Form.Item>
            <Form.Item label={tx("Reset penomoran", "Number reset")}>
              <Select
                value={form.data.number_reset_policy}
                onChange={(value) => form.setData("number_reset_policy", value)}
                options={[
                  { label: tx("Tahunan", "Yearly"), value: "yearly" },
                  { label: tx("Bulanan", "Monthly"), value: "monthly" },
                  { label: tx("Tidak pernah", "Never"), value: "never" },
                ]}
              />
            </Form.Item>

            <Card size="small" className="mb-6 bg-zinc-50" title={tx("Kop Surat Resmi", "Official Letterhead")}>
              <div className="grid grid-cols-[minmax(0,1fr)_190px] gap-5">
                <Upload.Dragger
                  accept="image/png,image/jpeg,image/webp"
                  maxCount={1}
                  beforeUpload={(file) => {
                    form.setData("header_image", file);
                    return false;
                  }}
                  onRemove={() => form.setData("header_image", null)}
                  fileList={form.data.header_image ? [form.data.header_image] : []}
                  className="min-h-[156px]"
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">{tx("Unggah gambar kop surat", "Upload letterhead image")}</p>
                  <p className="ant-upload-hint">{tx("PNG/JPG/WEBP, disarankan rasio lebar A4 dan tinggi 120-160px.", "PNG/JPG/WEBP; an A4-width ratio and 120-160px height are recommended.")}</p>
                </Upload.Dragger>
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  {form.data.header_image_url ? (
                    <Image src={form.data.header_image_url} alt={tx("Pratinjau kop surat", "Letterhead preview")} height={132} className="object-contain" />
                  ) : (
                    <div className="flex h-[132px] items-center justify-center text-center text-xs text-zinc-400">
                      {tx("Belum ada gambar kop resmi", "No official letterhead image yet")}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-4">
                <Form.Item label={tx("Tinggi kop di PDF", "Letterhead height in PDF")} className="mb-0">
                  <InputNumber className="w-full" min={80} max={260} value={form.data.header_height_px} onChange={(value) => form.setData("header_height_px", value || 132)} />
                </Form.Item>
                <Form.Item label={tx("Mode dokumen", "Document mode")} className="mb-0">
                  <Select
                    value={form.data.document_mode}
                    onChange={(value) => form.setData("document_mode", value)}
                    options={[
                      { label: tx("Alur seperti Word", "Word-like flow"), value: "flow" },
                      { label: tx("Grid lanjutan", "Advanced grid"), value: "grid" },
                    ]}
                  />
                </Form.Item>
              </div>
            </Card>

            <Card size="small" className="mb-6 bg-white" title={tx("Isi template surat", "Letter template content")}>
              <SimpleRichTextEditor value={form.data.content_text} onChange={(value) => form.setData("content_text", value)} />
            </Card>

            <Card size="small" className="mb-4 bg-zinc-50" title={tx("Placeholder", "Placeholders")}>
              <Space wrap>
                {placeholders.map((placeholder) => (
                  <Typography.Text code copyable key={placeholder}>{placeholder}</Typography.Text>
                ))}
              </Space>
            </Card>

            <Card
              size="small"
              className="mb-4 bg-zinc-50"
              title={tx("Penandatangan & QR", "Signers & QR")}
              extra={
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={(form.data.signers || []).length >= 3}
                  onClick={() => form.setData("signers", [...(form.data.signers || []), { ...defaultSigner, position: "left" }])}
                >
                  {tx("Tambah", "Add")}
                </Button>
              }
            >
              <div className="space-y-3">
                {(form.data.signers || []).map((signer, index) => (
                  <div key={index} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <Form.Item label={`${tx("Anggota database", "Database member")} ${index + 1}`} className="mb-3">
                      <Select
                        allowClear
                        showSearch
                        value={signer.member_id}
                        optionFilterProp="label"
                        onChange={(memberId) => {
                          const member = signerMembers.find((item) => item.id === memberId);
                          const next = [...form.data.signers];
                          next[index] = {
                            ...next[index],
                            member_id: memberId || undefined,
                            name: member?.full_name || next[index].name || "",
                            title: member?.position_name || next[index].title || "",
                          };
                          form.setData("signers", next);
                        }}
                        options={signerMembers.map((member) => ({
                          value: member.id,
                          label: `${member.full_name}${member.position_name ? ` · ${member.position_name}` : ""}`,
                        }))}
                      />
                    </Form.Item>
                    <div className="grid grid-cols-[1fr_1fr_140px_100px_40px] items-end gap-3">
                      <Form.Item label={`${tx("Nama", "Name")} ${index + 1}`} className="mb-0">
                        <Input
                          value={signer.name}
                          onChange={(event) => {
                            const next = [...form.data.signers];
                            next[index] = { ...next[index], name: event.target.value };
                            form.setData("signers", next);
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={tx("Jabatan", "Position")} className="mb-0">
                        <Input
                          value={signer.title}
                          onChange={(event) => {
                            const next = [...form.data.signers];
                            next[index] = { ...next[index], title: event.target.value };
                            form.setData("signers", next);
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={tx("Posisi", "Alignment")} className="mb-0">
                        <Select
                          value={signer.position}
                          onChange={(value) => {
                            const next = [...form.data.signers];
                            next[index] = { ...next[index], position: value };
                            form.setData("signers", next);
                          }}
                          options={signerPositionOptions}
                        />
                      </Form.Item>
                      <Form.Item label={tx("QR pribadi", "Personal QR")} className="mb-0">
                        <Switch
                          checked={signer.qr_enabled !== false}
                          onChange={(value) => {
                            const next = [...form.data.signers];
                            next[index] = { ...next[index], qr_enabled: value };
                            form.setData("signers", next);
                          }}
                        />
                      </Form.Item>
                      <Button
                        icon={<DeleteOutlined />}
                        aria-label={tx("Hapus penandatangan", "Remove signer")}
                        disabled={(form.data.signers || []).length <= 1}
                        onClick={() => form.setData("signers", form.data.signers.filter((_, itemIndex) => itemIndex !== index))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Space size="large" className="mb-6">
              <span>{tx("Tanda tangan", "Signature")} <Switch checked={form.data.signature_enabled} onChange={(value) => form.setData("signature_enabled", value)} /></span>
              <span>QR Code <Switch checked={form.data.qr_enabled} onChange={(value) => form.setData("qr_enabled", value)} /></span>
              <span>{tx("Aktif", "Active")} <Switch checked={form.data.is_active} onChange={(value) => form.setData("is_active", value)} /></span>
            </Space>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>{tx("Batal", "Cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={form.processing}>{tx("Simpan", "Save")}</Button>
            </div>
          </Form>
        </Drawer>
      </PageShell>
    </AppLayout>
  );
}
