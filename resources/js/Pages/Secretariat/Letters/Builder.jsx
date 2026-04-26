import React, { useMemo, useState } from "react";
import { Link, useForm, usePage } from "@inertiajs/react";
import axios from "axios";
import { Alert, Button, Card, Col, Form, Input, Row, Select, Space, Steps, Upload, message } from "antd";
import { DeleteOutlined, InboxOutlined, NumberOutlined, PlusOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import SimpleRichTextEditor from "@/Components/SimpleRichTextEditor";

const defaultLayout = () => [
  { i: "kop_surat", x: 0, y: 0, w: 12, h: 4, minW: 12, maxW: 12, minH: 4 },
  { i: "nomor_tanggal", x: 0, y: 4, w: 12, h: 4, minW: 12, maxW: 12, minH: 4 },
  { i: "isi_surat", x: 0, y: 8, w: 12, h: 14, minW: 12, maxW: 12, minH: 10 },
  { i: "tanda_tangan", x: 0, y: 22, w: 12, h: 6, minW: 12, maxW: 12, minH: 5 },
  { i: "tembusan", x: 0, y: 28, w: 12, h: 5, minW: 12, maxW: 12, minH: 4 },
];

const blockContent = (blocks, type, fallback = "") => blocks?.find((block) => block.type === type)?.content ?? fallback;

const buildBlocks = (values) => [
  { id: "kop_surat", type: "kop_surat", label: "Kop Surat", content: values.kop_text || "Kop Surat Otomatis" },
  {
    id: "nomor_tanggal",
    type: "nomor_tanggal",
    label: "Nomor & Tanggal",
    content: `Nomor: ${values.number || "{nomor_surat}"}\nLampiran: ${values.attachment || "-"}\nPerihal: ${values.subject || "{perihal}"}`,
  },
  { id: "isi_surat", type: "isi_surat", label: "Isi Surat", content: values.body_text || "" },
  { id: "tanda_tangan", type: "tanda_tangan", label: "Tanda Tangan", content: "Tanda Tangan dan QR Otomatis" },
  { id: "tembusan", type: "tembusan", label: "Tembusan", content: values.cc_text || "" },
];

const stripHtml = (value) => String(value ?? "").replace(/<[^>]*>/g, "").trim();
const sanitizeHtml = (value) => String(value ?? "")
  .replace(/<script\b[^>]*>(.*?)<\/script>/gis, "")
  .replace(/\son\w+=(["']).*?\1/gi, "");
const defaultSigner = { member_id: undefined, name: "", title: "", position: "right", qr_enabled: true };
const signerPositionOptions = [
  { label: "Kiri", value: "left" },
  { label: "Tengah", value: "center" },
  { label: "Kanan", value: "right" },
];
const normalizeSigners = (source, fallbackName = "", fallbackTitle = "", qrEnabled = true) => {
  const signers = Array.isArray(source) && source.length
    ? source
    : [{ name: fallbackName, title: fallbackTitle, position: "right", qr_enabled: qrEnabled }];

  return signers.slice(0, 3).map((signer, index) => ({
    name: signer.name || "",
    member_id: signer.member_id || undefined,
    title: signer.title || signer.role || "",
    position: ["left", "center", "right"].includes(signer.position) ? signer.position : (index === 0 ? "right" : "left"),
    qr_enabled: signer.qr_enabled !== false,
  }));
};
const signatureSlots = (signers = []) => ["left", "center", "right"].map((position) => ({
  position,
  signers: signers.filter((signer) => signer.position === position),
}));

export default function LetterComposer() {
  const { letter = null, templates = [], numberingProfiles = [], signerMembers = [] } = usePage().props;
  const [finalizing, setFinalizing] = useState(false);
  const [activeStep, setActiveStep] = useState(letter ? 1 : 0);
  const templateMap = useMemo(() => new Map(templates.map((item) => [item.id, item])), [templates]);
  const selectedTemplate = templateMap.get(Number(letter?.template_id)) || null;
  const initialSigners = normalizeSigners(
    letter?.signers_json || selectedTemplate?.signers_json,
    letter?.signer_name ?? selectedTemplate?.signer_name ?? "",
    letter?.signer_title ?? selectedTemplate?.signer_title ?? "",
    selectedTemplate?.qr_enabled !== false,
  );

  const form = useForm({
    type: letter?.type ?? "out",
    template_id: letter?.template_id ?? undefined,
    numbering_profile_id: selectedTemplate?.numbering_profile_id ?? undefined,
    classification: letter?.classification ?? selectedTemplate?.classification ?? "",
    number: letter?.number ?? "",
    attachment: "",
    date: letter?.date ? String(letter.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    subject: letter?.subject ?? "",
    recipient_text: letter?.recipient_text ?? "",
    body_text: blockContent(letter?.blocks_json, "isi_surat", letter?.content_plaintext ?? ""),
    kop_text: blockContent(letter?.blocks_json, "kop_surat", ""),
    cc_text: blockContent(letter?.blocks_json, "tembusan", letter?.cc_text ?? ""),
    signer_member_id: undefined,
    signer_name: initialSigners[0]?.name ?? "",
    signer_title: initialSigners[0]?.title ?? "",
    signers: initialSigners,
    attachments: [],
  });

  const blocks = useMemo(() => buildBlocks(form.data), [form.data]);
  const layout = useMemo(() => letter?.layout_json ?? selectedTemplate?.layout_json ?? defaultLayout(), [letter?.layout_json, selectedTemplate?.layout_json]);

  const payload = () => ({
    ...form.data,
    signer_name: form.data.signers?.[0]?.name || form.data.signer_name,
    signer_title: form.data.signers?.[0]?.title || form.data.signer_title,
    layout,
    blocks,
    content_blocks_json: blocks,
  });

  const handleTemplateChange = (templateId) => {
    const template = templateMap.get(templateId);
    form.setData({
      ...form.data,
      template_id: templateId,
      classification: template?.classification || "",
      numbering_profile_id: template?.numbering_profile_id || undefined,
      kop_text: blockContent(template?.blocks_json, "kop_surat", form.data.kop_text),
      body_text: blockContent(template?.blocks_json, "isi_surat", template?.content_text || form.data.body_text),
      cc_text: blockContent(template?.blocks_json, "tembusan", form.data.cc_text),
      signer_name: normalizeSigners(template?.signers_json, template?.signer_name, template?.signer_title, template?.qr_enabled !== false)[0]?.name || form.data.signer_name,
      signer_title: normalizeSigners(template?.signers_json, template?.signer_name, template?.signer_title, template?.qr_enabled !== false)[0]?.title || form.data.signer_title,
      signers: normalizeSigners(template?.signers_json, template?.signer_name, template?.signer_title, template?.qr_enabled !== false),
    });
    setActiveStep(1);
  };

  const saveDraft = () => {
    form.transform(payload);
    const options = {
      forceFormData: form.data.attachments.length > 0,
      preserveScroll: true,
      onSuccess: () => message.success("Draft surat disimpan."),
      onError: (errors) => message.error(Object.values(errors || {})[0] || "Gagal menyimpan draft."),
    };

    if (letter?.id) {
      form.patch(route("secretariat.letters.update", letter.id), options);
    } else {
      form.post(route("secretariat.letters.store"), options);
    }
  };

  const generateNumber = async () => {
    if (!letter?.id) {
      message.warning("Simpan draft lebih dulu sebelum generate nomor.");
      return;
    }

    const { data } = await axios.post(route("secretariat.letters.generate-number", letter.id), {
      template_id: form.data.template_id,
      date: form.data.date,
      classification: form.data.classification,
      commit: true,
    });
    form.setData("number", data.number);
    message.success("Nomor surat berhasil dibuat.");
  };

  const finalize = () => {
    if (!letter?.id) {
      message.warning("Simpan draft surat terlebih dahulu.");
      return;
    }

    setFinalizing(true);
    form.transform(payload);
    form.post(route("secretariat.letters.finalize", letter.id), {
      preserveScroll: true,
      onError: (errors) => message.error(Object.values(errors || {})[0] || "Finalisasi gagal."),
      onFinish: () => setFinalizing(false),
    });
  };

  const chooseSigner = (index, memberId) => {
    const signer = signerMembers.find((item) => item.id === memberId);
    const nextSigners = [...(form.data.signers || [{ ...defaultSigner }])];
    nextSigners[index] = {
      ...nextSigners[index],
      member_id: memberId || undefined,
      name: signer?.full_name || "",
      title: signer?.position_name || "",
    };
    form.setData({
      ...form.data,
      signer_member_id: index === 0 ? memberId : form.data.signer_member_id,
      signer_name: index === 0 ? signer?.full_name || "" : form.data.signer_name,
      signer_title: index === 0 ? signer?.position_name || "" : form.data.signer_title,
      signers: nextSigners,
    });
  };

  return (
    <AppLayout title="Sekretariat - Buat Surat">
      <PageShell>
        <PageHeader
          eyebrow="Surat"
          title={letter?.id ? "Edit Draft Surat" : "Buat Surat"}
          description="Alur dibuat bertahap: pilih template, isi data, cek draft, lalu simpan atau finalisasi."
          extra={
            <Space>
              {letter?.id ? <Link href={route("secretariat.letters.show", letter.id)}><Button>Detail</Button></Link> : null}
              <Button icon={<SaveOutlined />} onClick={saveDraft} loading={form.processing}>Simpan Draft</Button>
              <Button type="primary" icon={<SendOutlined />} disabled={!letter?.id} onClick={finalize} loading={finalizing}>
                Finalisasi
              </Button>
            </Space>
          }
        />

        <Card className="border-white/80 shadow-sm">
          <Steps
            current={activeStep}
            onChange={setActiveStep}
            items={[
              { title: "Template" },
              { title: "Data Surat" },
              { title: "Preview Draft" },
              { title: "Simpan/Finalisasi" },
            ]}
          />
        </Card>

        <Row gutter={[16, 16]}>
          <Col span={14}>
            <Card className="border-white/80 shadow-sm" title="Form Surat">
              <Form layout="vertical">
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Template surat" required>
                      <Select
                        showSearch
                        value={form.data.template_id}
                        optionFilterProp="label"
                        onChange={handleTemplateChange}
                        options={templates.map((template) => ({
                          value: template.id,
                          label: `${template.name} · ${template.number_format || "-"}`,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Jenis surat">
                      <Input value={form.data.classification} onChange={(event) => form.setData("classification", event.target.value)} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Nomor surat">
                      <Space.Compact className="w-full">
                        <Input value={form.data.number} onChange={(event) => form.setData("number", event.target.value)} placeholder="Otomatis saat finalisasi" />
                        <Button icon={<NumberOutlined />} onClick={generateNumber}>Generate</Button>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Tanggal surat" required>
                      <Input type="date" value={form.data.date} onChange={(event) => form.setData("date", event.target.value)} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Lampiran">
                  <Input value={form.data.attachment} onChange={(event) => form.setData("attachment", event.target.value)} placeholder="Contoh: 1 berkas / -" />
                </Form.Item>
                <Form.Item label="Perihal" required>
                  <Input value={form.data.subject} onChange={(event) => form.setData("subject", event.target.value)} />
                </Form.Item>
                <Form.Item label="Penerima" required>
                  <SimpleRichTextEditor documentMode minHeight={96} value={form.data.recipient_text} onChange={(value) => form.setData("recipient_text", value)} />
                </Form.Item>
                <Form.Item label="Isi surat" required>
                  <SimpleRichTextEditor documentMode value={form.data.body_text} onChange={(value) => form.setData("body_text", value)} />
                </Form.Item>
                <Form.Item label="Tembusan">
                  <SimpleRichTextEditor documentMode minHeight={86} value={form.data.cc_text} onChange={(value) => form.setData("cc_text", value)} />
                </Form.Item>

                <Card
                  size="small"
                  className="mb-4 bg-zinc-50"
                  title="Penandatangan"
                  extra={
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      disabled={(form.data.signers || []).length >= 3}
                      onClick={() => form.setData("signers", [...(form.data.signers || []), { ...defaultSigner, position: "left" }])}
                    >
                      Tambah
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {(form.data.signers || []).map((signer, index) => (
                      <div key={index} className="rounded-xl border border-zinc-200 bg-white p-3">
                        <Form.Item label={`Anggota database ${index + 1}`} className="mb-3">
                          <Select
                            allowClear
                            showSearch
                            value={signer.member_id}
                            optionFilterProp="label"
                            onChange={(memberId) => chooseSigner(index, memberId)}
                            options={signerMembers.map((member) => ({
                              value: member.id,
                              label: `${member.full_name}${member.position_name ? ` · ${member.position_name}` : ""}`,
                            }))}
                          />
                        </Form.Item>
                        <div className="grid grid-cols-[1fr_1fr_112px_80px_40px] items-end gap-3">
                          <Form.Item label={`Nama ${index + 1}`} required={index === 0} className="mb-0">
                            <Input
                              value={signer.name}
                              onChange={(event) => {
                                const next = [...form.data.signers];
                                next[index] = { ...next[index], name: event.target.value };
                                form.setData({
                                  ...form.data,
                                  signers: next,
                                  signer_name: index === 0 ? event.target.value : form.data.signer_name,
                                });
                              }}
                            />
                          </Form.Item>
                          <Form.Item label="Jabatan" required={index === 0} className="mb-0">
                            <Input
                              value={signer.title}
                              onChange={(event) => {
                                const next = [...form.data.signers];
                                next[index] = { ...next[index], title: event.target.value };
                                form.setData({
                                  ...form.data,
                                  signers: next,
                                  signer_title: index === 0 ? event.target.value : form.data.signer_title,
                                });
                              }}
                            />
                          </Form.Item>
                          <Form.Item label="Posisi" className="mb-0">
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
                          <Form.Item label="QR" className="mb-0">
                            <Select
                              value={signer.qr_enabled === false ? "off" : "on"}
                              onChange={(value) => {
                                const next = [...form.data.signers];
                                next[index] = { ...next[index], qr_enabled: value === "on" };
                                form.setData("signers", next);
                              }}
                              options={[
                                { label: "On", value: "on" },
                                { label: "Off", value: "off" },
                              ]}
                            />
                          </Form.Item>
                          <Button
                            icon={<DeleteOutlined />}
                            disabled={(form.data.signers || []).length <= 1}
                            onClick={() => form.setData("signers", form.data.signers.filter((_, itemIndex) => itemIndex !== index))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

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
                  <p className="ant-upload-text">Lampiran opsional</p>
                  <p className="ant-upload-hint">PDF, gambar, DOC/DOCX. Maks 10MB per file.</p>
                </Upload.Dragger>
              </Form>
            </Card>
          </Col>

          <Col span={10}>
            <Card className="sticky top-6 border-white/80 shadow-sm" title="Preview Draft">
              {!form.data.template_id ? (
                <Alert type="info" showIcon title="Pilih template untuk mulai membuat surat." />
              ) : (
                <div className="h-[760px] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-5">
                  <div className="mx-auto min-h-[680px] w-[520px] bg-white p-8 shadow-sm">
                    <div className="border-b-2 border-zinc-900 pb-4 text-center text-sm font-semibold">KOP SURAT</div>
                    <div className="mt-6 flex items-start justify-between gap-4 text-sm">
                      <div className="grid flex-1 grid-cols-[72px_14px_1fr] gap-y-1">
                        <span>Nomor</span><span>:</span><span>{form.data.number || "(otomatis saat finalisasi)"}</span>
                        <span>Lampiran</span><span>:</span><span>{form.data.attachment || "-"}</span>
                        <span>Perihal</span><span>:</span><span>{form.data.subject || "-"}</span>
                      </div>
                      <div className="shrink-0 text-right">Purwakarta, {form.data.date || "-"}</div>
                    </div>
                    <div className="prose prose-sm mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.data.recipient_text || "<p>Yth. ...</p>") }} />
                    <div className="prose prose-sm mt-5 max-w-none" dangerouslySetInnerHTML={{ __html: form.data.body_text || "<p>Isi surat...</p>" }} />
                    <div className="mt-10 grid grid-cols-3 gap-4 text-center text-sm">
                      {signatureSlots(form.data.signers || []).map((slot) => (
                        <div key={slot.position} className="min-h-[120px]">
                          {slot.signers.map((signer, index) => (
                            <div key={`${slot.position}-${index}`} className={index > 0 ? "mt-6" : ""}>
                              <div>{signer.title || "Jabatan"}</div>
                              <div className="my-8 text-xs text-zinc-400">{signer.qr_enabled === false ? "Tanda tangan" : "QR + tanda tangan"}</div>
                              <div className="font-semibold">{signer.name || "Nama penandatangan"}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {stripHtml(form.data.cc_text) ? (
                      <div className="prose prose-sm mt-8 max-w-none text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.data.cc_text) }} />
                    ) : null}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </PageShell>
    </AppLayout>
  );
}
