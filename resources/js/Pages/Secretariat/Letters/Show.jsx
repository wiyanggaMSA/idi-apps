import React, { useMemo, useState } from "react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Button, Card, Descriptions, Empty, List, Modal, Space, Tag, Upload, message } from "antd";
import { DownloadOutlined, EditOutlined, FilePdfOutlined, InboxOutlined, PrinterOutlined, ReloadOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";

const statusColor = {
  draft: "gold",
  finalized: "blue",
  archived: "green",
};

const canPreview = (mime) => ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime);

export default function LetterShow() {
  const { letter } = usePage().props;
  const [previewDocument, setPreviewDocument] = useState(null);
  const uploadForm = useForm({ attachments: [] });
  const documents = letter?.documents || [];
  const pdfAvailable = Boolean(letter?.pdf_path);
  const pdfUrl = useMemo(() => `${letter.preview_url}${letter.preview_url.includes("?") ? "&" : "?"}t=${Date.now()}`, [letter.preview_url, letter.pdf_path]);

  const submitAttachments = () => {
    uploadForm.post(route("secretariat.letters.attachments.store", letter.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        uploadForm.reset("attachments");
        message.success("Lampiran berhasil diunggah.");
      },
    });
  };

  const printPdf = () => {
    const win = window.open(letter.preview_url, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print(), { once: true });
    }
  };

  return (
    <AppLayout title={`Surat - ${letter.subject || "-"}`}>
      <PageShell>
        <PageHeader
          eyebrow="Detail Surat"
          title={letter.subject || "Surat"}
          description="Metadata, preview PDF inline, lampiran, dan aksi workflow surat."
          extra={
            <Space>
              <Tag color={statusColor[letter.status] || "default"}>{letter.status}</Tag>
              {letter.status === "draft" ? (
                <Link href={route("secretariat.letters.edit", letter.id)}>
                  <Button icon={<EditOutlined />}>Edit Draft</Button>
                </Link>
              ) : null}
              {letter.status === "finalized" ? (
                <Link href={route("secretariat.letters.archive", letter.id)} method="patch" as="button">
                  <Button>Arsipkan</Button>
                </Link>
              ) : null}
              {letter.status !== "draft" ? (
                <>
                  <Button icon={<ReloadOutlined />} onClick={() => router.post(route("secretariat.letters.pdf.regenerate", letter.id))}>
                    Refresh PDF
                  </Button>
                  <Button icon={<PrinterOutlined />} onClick={printPdf}>Print</Button>
                  <a href={letter.download_url}>
                    <Button type="primary" icon={<DownloadOutlined />}>Download</Button>
                  </a>
                </>
              ) : null}
            </Space>
          }
        />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <Card className="border-white/80 shadow-sm" title={<Space><FilePdfOutlined /> Preview PDF</Space>}>
              {letter.status === "draft" ? (
                <Empty description="PDF final akan tersedia setelah surat difinalisasi." />
              ) : pdfAvailable ? (
                <iframe
                  title="Preview PDF Surat"
                  src={pdfUrl}
                  className="h-[780px] w-full rounded-lg border border-zinc-200 bg-zinc-50"
                  loading="lazy"
                />
              ) : (
                <Empty description="PDF belum dibuat.">
                  <Button type="primary" onClick={() => router.post(route("secretariat.letters.pdf.regenerate", letter.id))}>
                    Generate PDF
                  </Button>
                </Empty>
              )}
            </Card>
          </div>

          <div className="col-span-4 space-y-6">
            <Card title="Metadata" className="border-white/80 shadow-sm">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nomor">{letter.number || "Belum dibuat"}</Descriptions.Item>
                <Descriptions.Item label="Tanggal">{letter.date || "-"}</Descriptions.Item>
                <Descriptions.Item label="Template">{letter.template?.name || "-"}</Descriptions.Item>
                <Descriptions.Item label="Jenis">{letter.classification || "-"}</Descriptions.Item>
                <Descriptions.Item label="Penerima">{letter.recipient_text || "-"}</Descriptions.Item>
                <Descriptions.Item label="Penandatangan">
                  {Array.isArray(letter.signers_json) && letter.signers_json.length ? (
                    <div className="space-y-1">
                      {letter.signers_json.map((signer, index) => (
                        <div key={index}>
                          <span className="font-medium">{signer.name || "-"}</span>
                          <span className="text-zinc-500"> · {signer.title || "-"}</span>
                          <span className="ml-2 text-xs uppercase text-zinc-400">{signer.position || "right"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    letter.signer_name || "-"
                  )}
                </Descriptions.Item>
              </Descriptions>
              {letter.verify_url ? (
                <a className="mt-4 block text-red-700" href={letter.verify_url} target="_blank" rel="noreferrer">
                  Buka halaman verifikasi
                </a>
              ) : null}
            </Card>

            <Card title="Lampiran" className="border-white/80 shadow-sm">
              <Upload.Dragger
                multiple
                beforeUpload={(file) => {
                  uploadForm.setData("attachments", [...uploadForm.data.attachments, file]);
                  return false;
                }}
                fileList={uploadForm.data.attachments}
                onRemove={(file) => {
                  uploadForm.setData("attachments", uploadForm.data.attachments.filter((item) => item.uid !== file.uid));
                }}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Tarik file atau klik untuk upload</p>
                <p className="ant-upload-hint">PDF, gambar, DOC/DOCX. Maks 10MB per file.</p>
              </Upload.Dragger>
              <Button className="mt-3 w-full" loading={uploadForm.processing} disabled={uploadForm.data.attachments.length === 0} onClick={submitAttachments}>
                Simpan Lampiran
              </Button>

              <List
                className="mt-4"
                dataSource={documents}
                locale={{ emptyText: "Belum ada lampiran." }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      canPreview(item.mime_type) ? <button className="text-red-700" onClick={() => setPreviewDocument(item)}>Preview</button> : null,
                      <a href={item.download_url}>Download</a>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta title={item.title} description={`${item.category || "-"} · ${item.original_name || ""}`} />
                  </List.Item>
                )}
              />
            </Card>
          </div>
        </div>

        <Modal
          open={Boolean(previewDocument)}
          title={previewDocument?.title}
          width={920}
          footer={null}
          onCancel={() => setPreviewDocument(null)}
          destroyOnClose
        >
          {previewDocument?.mime_type === "application/pdf" ? (
            <iframe title="Preview Lampiran" src={previewDocument.preview_url} className="h-[720px] w-full rounded border" loading="lazy" />
          ) : (
            <img src={previewDocument?.preview_url} alt={previewDocument?.title} className="max-h-[720px] w-full rounded object-contain" />
          )}
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
