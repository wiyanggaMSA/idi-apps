import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { Alert, Card, Divider, Form, InputNumber, Segmented, Select, Space, Switch, Typography } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import LetterGridBuilder from "@/Components/LetterGridBuilder";

export default function TemplateBuilder() {
  const { template } = usePage().props;
  const initialStyle = template?.margin_json ?? {};
  const pxToMm = (value, fallback) => Number(((Number(value ?? fallback) * 25.4) / 96).toFixed(1));
  const [styleSettings, setStyleSettings] = useState({
    font_family: initialStyle?.font_family ?? "Times New Roman",
    font_size: Number(initialStyle?.font_size ?? 11),
    line_height: Number(initialStyle?.line_height ?? 1.25),
    paragraph_spacing: Number(initialStyle?.paragraph_spacing ?? 2),
    repeat_header: Boolean(initialStyle?.repeat_header ?? true),
    signature_qr_position: initialStyle?.signature_qr_position === "left" ? "left" : "right",
    header_height_px: Number(template?.header_height_px ?? initialStyle?.header_height_px ?? 132),
    document_mode: template?.document_mode ?? initialStyle?.document_mode ?? "flow",
    paper_format: initialStyle?.paper_format ?? template?.paper ?? "A4",
    orientation: initialStyle?.orientation === "L" ? "L" : "P",
    margin_top_mm: Number(initialStyle?.margin_top_mm ?? 10),
    margin_right_mm: Number(initialStyle?.margin_right_mm ?? pxToMm(initialStyle?.margin_right_px, 64)),
    margin_bottom_mm: Number(initialStyle?.margin_bottom_mm ?? pxToMm(initialStyle?.margin_bottom_px, 72)),
    margin_left_mm: Number(initialStyle?.margin_left_mm ?? pxToMm(initialStyle?.margin_left_px, 64)),
    content_top_gap_mm: Number(initialStyle?.content_top_gap_mm ?? pxToMm(initialStyle?.content_top_gap_px, 11)),
  });

  const sidebarExtras = useMemo(
    () => (
      <>
        <Alert
          type="info"
          showIcon
          title="Mode Flow Document"
          description="Gunakan gambar kop resmi dari halaman Template untuk hasil PDF paling presisi. Builder ini mengatur urutan blok, isi default, dan gaya dokumen."
        />
        <Divider style={{ margin: "12px 0" }} />
        <Typography.Text strong>Gaya Dokumen (PDF)</Typography.Text>
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Font Utama">
            <Select
              value={styleSettings.font_family}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, font_family: value }))}
              options={[
                { label: "Times New Roman (formal)", value: "Times New Roman" },
                { label: "Arial (modern)", value: "Arial" },
                { label: "Calibri (rapi)", value: "Calibri" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Ukuran Font Isi">
            <InputNumber
              min={10}
              max={20}
              step={1}
              style={{ width: "100%" }}
              value={styleSettings.font_size}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, font_size: Number(value ?? 16) }))}
            />
          </Form.Item>
          <Form.Item label="Ukuran Kertas">
            <Select
              value={styleSettings.paper_format}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, paper_format: value }))}
              options={[
                { label: "A4", value: "A4" },
                { label: "A5", value: "A5" },
                { label: "Letter", value: "Letter" },
                { label: "Legal", value: "Legal" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Orientasi">
            <Segmented
              block
              value={styleSettings.orientation}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, orientation: value }))}
              options={[
                { label: "Portrait", value: "P" },
                { label: "Landscape", value: "L" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Line Height">
            <Select
              value={styleSettings.line_height}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, line_height: Number(value) }))}
              options={[
                { label: "Padat (1.25)", value: 1.25 },
                { label: "Rapat (1.3)", value: 1.3 },
                { label: "Sedang (1.45)", value: 1.45 },
                { label: "Lapang (1.6)", value: 1.6 },
                { label: "Sangat Lapang (1.8)", value: 1.8 },
              ]}
            />
          </Form.Item>
          <Form.Item label="Spasi Antar Paragraf (px)">
            <InputNumber
              min={0}
              max={32}
              step={1}
              style={{ width: "100%" }}
              value={styleSettings.paragraph_spacing}
              onChange={(value) =>
                setStyleSettings((prev) => ({ ...prev, paragraph_spacing: Number(value ?? 8) }))
              }
            />
          </Form.Item>
          <Form.Item label="Kop Berulang di Tiap Halaman">
            <Switch
              checked={styleSettings.repeat_header}
              onChange={(checked) => setStyleSettings((prev) => ({ ...prev, repeat_header: checked }))}
            />
          </Form.Item>
          <Form.Item label="Tinggi Gambar Kop (px)">
            <InputNumber
              min={80}
              max={260}
              step={4}
              style={{ width: "100%" }}
              value={styleSettings.header_height_px}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, header_height_px: Number(value ?? 132) }))}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Form.Item label="Margin Atas (mm)">
              <InputNumber
                min={5}
                max={50}
                step={1}
                style={{ width: "100%" }}
                value={styleSettings.margin_top_mm}
                onChange={(value) => setStyleSettings((prev) => ({ ...prev, margin_top_mm: Number(value ?? 10) }))}
              />
            </Form.Item>
            <Form.Item label="Margin Kanan (mm)">
              <InputNumber
                min={5}
                max={50}
                step={1}
                style={{ width: "100%" }}
                value={styleSettings.margin_right_mm}
                onChange={(value) => setStyleSettings((prev) => ({ ...prev, margin_right_mm: Number(value ?? 18) }))}
              />
            </Form.Item>
            <Form.Item label="Margin Bawah (mm)">
              <InputNumber
                min={5}
                max={50}
                step={1}
                style={{ width: "100%" }}
                value={styleSettings.margin_bottom_mm}
                onChange={(value) => setStyleSettings((prev) => ({ ...prev, margin_bottom_mm: Number(value ?? 20) }))}
              />
            </Form.Item>
            <Form.Item label="Margin Kiri (mm)">
              <InputNumber
                min={5}
                max={50}
                step={1}
                style={{ width: "100%" }}
                value={styleSettings.margin_left_mm}
                onChange={(value) => setStyleSettings((prev) => ({ ...prev, margin_left_mm: Number(value ?? 18) }))}
              />
            </Form.Item>
          </div>
          <Form.Item label="Jarak Isi dari Kop (mm)">
            <InputNumber
              min={0}
              max={40}
              step={1}
              style={{ width: "100%" }}
              value={styleSettings.content_top_gap_mm}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, content_top_gap_mm: Number(value ?? 3) }))}
            />
          </Form.Item>
          <Form.Item label="Mode Dokumen">
            <Select
              value={styleSettings.document_mode}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, document_mode: value }))}
              options={[
                { label: "Flow seperti Word", value: "flow" },
                { label: "Grid lanjutan", value: "grid" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Posisi QR Tanda Tangan">
            <Select
              value={styleSettings.signature_qr_position}
              onChange={(value) => setStyleSettings((prev) => ({ ...prev, signature_qr_position: value }))}
              options={[
                { label: "Kanan", value: "right" },
                { label: "Kiri", value: "left" },
              ]}
            />
          </Form.Item>
        </Form>
        <Divider style={{ margin: "12px 0" }} />
      </>
    ),
    [styleSettings]
  );

  return (
    <AppLayout title="Sekretariat - Builder Template">
      <PageShell>
        <PageHeader
          title={`Builder Template: ${template?.name || ""}`}
          extra={<Space />}
        />

        <Card title="Builder Template Terpadu" style={{ borderRadius: 12 }}>
          <LetterGridBuilder
            entity={template}
            saveRouteName="secretariat.templates.layout"
            showPdf={false}
            enableFinalize={false}
            enableRichText
            documentStyle={styleSettings}
            sidebarExtras={sidebarExtras}
            buildSavePayload={({ layout, blocks }) => ({
              layout,
              blocks,
              settings: styleSettings,
            })}
            saveSuccessMessage="Layout template berhasil disimpan."
            saveErrorMessage="Gagal menyimpan layout template."
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
