import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import { Button, Card, Divider, Form, Input, Modal, Select, Space, Typography, message } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";

import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import DocumentRenderer from "@/Components/DocumentRenderer";
import SimpleRichTextEditor from "@/Components/SimpleRichTextEditor";

const { TextArea } = Input;
const { Text } = Typography;

const blockCatalog = [
  { type: "kop_surat", label: "Kop Surat", w: 12, h: 3, content: "Kop surat..." },
  {
    type: "nomor_tanggal",
    label: "Nomor & Tanggal",
    w: 6,
    h: 2,
    content: "Nomor: ...\nTanggal: ...",
  },
  { type: "isi_surat", label: "Isi Surat", w: 12, h: 10, content: "Isi surat..." },
  {
    type: "tanda_tangan",
    label: "Tanda Tangan",
    w: 4,
    h: 3,
    content: "Hormat kami,\n(Nama)\n(Jabatan)",
  },
  { type: "tembusan", label: "Tembusan", w: 6, h: 3, content: "Tembusan:\n- ..." },
];

const findCatalog = (type) => blockCatalog.find((item) => item.type === type);

const createBlockId = (type) => `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const defaultBlocks = () => [
  { id: "kop_surat", type: "kop_surat", label: "Kop Surat", content: "Kop Surat Otomatis" },
  {
    id: "nomor_tanggal",
    type: "nomor_tanggal",
    label: "Nomor & Tanggal",
    content: "Nomor: {nomor_surat}\nLampiran: -\nPerihal: {perihal}",
  },
  {
    id: "isi_surat",
    type: "isi_surat",
    label: "Isi Surat",
    content: "<p>Dengan hormat,</p><p>{isi_surat}</p>",
  },
  { id: "tanda_tangan", type: "tanda_tangan", label: "Tanda Tangan", content: "Tanda Tangan dan QR Otomatis" },
  { id: "tembusan", type: "tembusan", label: "Tembusan", content: "Tembusan:\n- Arsip" },
];

const defaultLayout = () => [
  { i: "kop_surat", x: 0, y: 0, w: 12, h: 4, minW: 12, maxW: 12, minH: 4 },
  { i: "nomor_tanggal", x: 0, y: 4, w: 12, h: 4, minW: 6, minH: 4 },
  { i: "isi_surat", x: 0, y: 8, w: 12, h: 14, minW: 12, maxW: 12, minH: 10 },
  { i: "tanda_tangan", x: 8, y: 22, w: 4, h: 6, minW: 4, minH: 5 },
  { i: "tembusan", x: 0, y: 28, w: 6, h: 5, minW: 6, minH: 4 },
];

const BLOCK_CONSTRAINTS = {
  kop_surat: { minW: 12, maxW: 12, minH: 4 },
  nomor_tanggal: { minW: 6, minH: 4 },
  isi_surat: { minW: 12, maxW: 12, minH: 10 },
  tanda_tangan: { minW: 4, minH: 5 },
  tembusan: { minW: 6, minH: 4 },
};

const REQUIRED_BLOCK_TYPES = new Set(["kop_surat", "nomor_tanggal", "isi_surat", "tanda_tangan"]);

const SYSTEM_DRIVEN_TYPES = new Set(["nomor_tanggal", "tanda_tangan"]);

const applyLayoutConstraints = (layoutItems, blockMap) =>
  layoutItems.map((item) => {
    const blockType = blockMap.get(item.i)?.type;
    const constraints = blockType ? BLOCK_CONSTRAINTS[blockType] : null;
    return constraints ? { ...item, ...constraints } : item;
  });

const createLayoutItem = (id, type) => {
  const template = findCatalog(type);
  const constraints = BLOCK_CONSTRAINTS[type] ?? {};
  return {
    i: id,
    x: 0,
    y: Infinity,
    w: template?.w ?? 6,
    h: template?.h ?? 3,
    ...constraints,
  };
};

/**
 * ✅ Vite-safe replacement for WidthProvider
 * Measure container width using ResizeObserver, then pass `width` prop to ReactGridLayout.
 */
function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const update = () => {
      const next = el.getBoundingClientRect().width;
      setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, width };
}

export default function LetterGridBuilder({
  letter,
  entity,
  saveRouteName = "secretariat.letters.layout",
  showPdf = true,
  enableFinalize = true,
  pdfRouteName = "secretariat.letters.pdf",
  saveSuccessMessage = "Layout surat berhasil disimpan.",
  saveErrorMessage = "Gagal menyimpan layout surat.",
  sidebarExtras = null,
  buildSavePayload = null,
  documentStyle = null,
  enableRichText = false,
  signerMembers = [],
  numberingProfiles = [],
}) {
  const { props } = usePage();
  const activeEntity = entity ?? letter;

  const gridConfig = { cols: 12, rowHeight: 24 };

  const initialBlocks = useMemo(() => {
    const storedBlocks = Array.isArray(activeEntity?.blocks_json) ? activeEntity.blocks_json : [];
    return storedBlocks.length ? storedBlocks : defaultBlocks();
  }, [activeEntity]);

  const initialLayout = useMemo(() => {
    const blockMap = new Map(initialBlocks.map((block) => [block.id, block]));
    if (Array.isArray(activeEntity?.layout_json) && activeEntity.layout_json.length) {
      return applyLayoutConstraints(activeEntity.layout_json, blockMap);
    }
    if (Array.isArray(activeEntity?.blocks_json) && activeEntity.blocks_json.length) {
      return applyLayoutConstraints(
        activeEntity.blocks_json.map((block) => createLayoutItem(block.id, block.type)),
        blockMap
      );
    }
    return applyLayoutConstraints(defaultLayout(), blockMap);
  }, [activeEntity, initialBlocks]);

  const [blocks, setBlocks] = useState(initialBlocks);
  const [layout, setLayout] = useState(initialLayout);
  const [previewMode, setPreviewMode] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeForm] = Form.useForm();

  // signer
  const [selectedSignerId, setSelectedSignerId] = useState(null);
  const [signatureData, setSignatureData] = useState(null);

  const organization = useMemo(() => {
    const orgProfile = props?.orgProfile ?? {};
    const addressLines =
      typeof orgProfile?.address === "string" && orgProfile.address.length
        ? orgProfile.address.split(/\r?\n/)
        : [];

    return {
      logo_url: orgProfile.logo_url ?? null,
      org_name: orgProfile.org_name ?? "Nama Organisasi",
      org_unit: orgProfile.org_unit ?? "Sekretariat",
      address_lines: addressLines,
      contacts: {
        tel: orgProfile.phone ?? null,
        email: orgProfile.email ?? null,
        website: orgProfile.website ?? null,
      },
      header_variant: orgProfile.header_variant ?? "logo_left",
    };
  }, [props?.orgProfile]);

  const selectedSigner = useMemo(
    () => signerMembers.find((m) => m.id === selectedSignerId) ?? null,
    [signerMembers, selectedSignerId]
  );

  // ✅ Sync when letter/entity changes
  useEffect(() => {
    setBlocks(initialBlocks);
    setLayout(initialLayout);
    setPreviewMode(false);
    setSelectedSignerId(null);
    setSignatureData(null);
  }, [initialBlocks, initialLayout]);

  useEffect(() => {
    if (!finalizeOpen || !activeEntity?.id) return;

    finalizeForm.setFieldsValue({
      numbering_profile_id: undefined,
      number: activeEntity?.number ?? "",
      classification: activeEntity?.classification ?? "",
      date: activeEntity?.date ?? "",
      subject: activeEntity?.subject ?? "",
      recipient_text: activeEntity?.recipient_text ?? "",
      cc_text: activeEntity?.cc_text ?? "",
      signer_name: selectedSigner?.full_name ?? activeEntity?.signer_name ?? "",
      signer_title: selectedSigner?.position_name ?? activeEntity?.signer_title ?? "",
    });
  }, [activeEntity, finalizeForm, finalizeOpen, selectedSigner]);

  const handleAddBlock = (type) => {
    const template = findCatalog(type);
    if (!template) return;

    const id = createBlockId(type);

    const newBlock = {
      id,
      type,
      label: template.label,
      content: template.content,
    };

    setBlocks((prev) => [...prev, newBlock]);
    setLayout((prev) => [...prev, createLayoutItem(id, type)]);
  };

  const handleDeleteBlock = (id) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setLayout((prev) => prev.filter((item) => item.i !== id));
  };

  const handleContentChange = (id, value) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, content: value } : block))
    );
  };

  const handleSave = () => {
    const savePayload =
      typeof buildSavePayload === "function"
        ? buildSavePayload({ layout, blocks, entity: activeEntity })
        : { layout, blocks };

    // Anda memilih behavior: kalau belum ada id → buat draft dulu
    if (!activeEntity?.id) {
      router.post(
        route("secretariat.letters.store"),
        savePayload,
        {
          preserveScroll: true,
          onSuccess: () => message.success("Draft surat berhasil dibuat."),
          onError: () => message.error("Gagal membuat draft surat."),
        }
      );
      return;
    }

    router.put(
      route(saveRouteName, activeEntity.id),
      savePayload,
      {
        preserveScroll: true,
        onSuccess: () => message.success(saveSuccessMessage),
        onError: () => message.error(saveErrorMessage),
      }
    );
  };

  const handleSignerChange = async (value) => {
    setSelectedSignerId(value ?? null);
    setSignatureData(null);

    // signature hanya masuk akal kalau surat sudah punya id
    if (!value || !letter?.id) return;

    try {
      const { data } = await axios.post(
        route("secretariat.letters.signature.prepare", letter.id),
        { signer_member_id: value }
      );
      setSignatureData(data);
    } catch (error) {
      const responseMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.signer_member_id?.[0] ||
        "Gagal menyiapkan tanda tangan digital.";
      message.error(responseMessage);
    }
  };

  const { ref: canvasWrapRef, width: canvasWidth } = useContainerWidth();
  const blockTypeCounts = useMemo(() => {
    return blocks.reduce((acc, block) => {
      acc[block.type] = (acc[block.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [blocks]);

  const openFinalize = () => {
    if (!enableFinalize) {
      return;
    }
    if (!activeEntity?.id) {
      message.warning("Simpan draft surat terlebih dahulu sebelum finalisasi.");
      return;
    }
    setFinalizeOpen(true);
  };

  const handleFinalize = (values) => {
    if (!activeEntity?.id) return;
    setFinalizing(true);
    router.post(
      route("secretariat.letters.finalize", activeEntity.id),
      {
        ...values,
        layout,
        blocks,
        content_blocks_json: blocks,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          message.success("Surat berhasil difinalisasi.");
          setFinalizeOpen(false);
        },
      onError: (errors) => {
        const firstError = Object.values(errors ?? {})[0];
        message.error(firstError || "Finalisasi gagal. Periksa data wajib.");
      },
        onFinish: () => setFinalizing(false),
      }
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <style>
        {`
          .react-resizable-handle {
            width: 12px;
            height: 12px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.25);
          }
        `}
      </style>

      <Card
        title="Komponen"
        style={{ borderRadius: 12 }}
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {sidebarExtras}

        {letter && (
          <>
            <div>
              <Text strong>Penandatangan</Text>
              <Select
                value={selectedSignerId}
                onChange={handleSignerChange}
                placeholder="Pilih penandatangan"
                style={{ width: "100%", marginTop: 8 }}
                options={signerMembers.map((m) => ({
                  value: m.id,
                  label: `${m.full_name}${m.position_name ? ` — ${m.position_name}` : ""}`,
                }))}
                allowClear
              />
              {!letter?.id && (
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  Buat draft dulu agar penandatangan & tanda tangan digital bisa disiapkan.
                </Text>
              )}
            </div>
            <Divider />
          </>
        )}

        <Space direction="vertical" style={{ width: "100%" }}>
          {blockCatalog.map((block) => (
            <Button key={block.type} onClick={() => handleAddBlock(block.type)}>
              {block.label}
            </Button>
          ))}
        </Space>

        <Divider />

        <Button type="primary" onClick={handleSave}>
          {activeEntity?.id ? "Simpan Layout" : "Buat Draft Surat"}
        </Button>

        {enableFinalize && activeEntity?.id && letter && (
          <Button onClick={openFinalize}>Finalisasi Surat</Button>
        )}

        {!activeEntity?.id && (
          <Text type="secondary" style={{ marginTop: 8 }}>
            Layout akan tersimpan setelah draft surat dibuat.
          </Text>
        )}
      </Card>

      <Card
        title="Canvas"
        style={{ borderRadius: 12 }}
        extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => setPreviewMode((p) => !p)}>
              {previewMode ? "Edit" : "Pratinjau"}
            </Button>

            {showPdf && (
              <Button
                icon={<DownloadOutlined />}
                href={activeEntity?.id ? route(pdfRouteName, activeEntity.id) : "#"}
                target="_blank"
                disabled={!activeEntity?.id}
              >
                Unduh PDF
              </Button>
            )}

            {enableFinalize && activeEntity?.id && letter && (
              <Button type="primary" onClick={openFinalize}>
                Finalisasi
              </Button>
            )}
          </Space>
        }
      >
        {previewMode ? (
          <div className="letter-preview-wrap">
            <DocumentRenderer
              blocks={blocks}
              layout={layout}
              gridConfig={gridConfig}
              layoutMode="flow"
              data={{
                organization,
                signature: signatureData,
                signer: selectedSigner
                  ? { name: selectedSigner.full_name, role: selectedSigner.position_name }
                  : {
                      name: letter?.signer_name ?? "",
                      role: letter?.signer_title ?? "",
                    },
                letter: {
                  number: letter?.number ?? "",
                  date: letter?.date ?? "",
                  subject: letter?.subject ?? "",
                },
                style: documentStyle ?? activeEntity?.margin_json ?? null,
              }}
            />
          </div>
        ) : (
          <div
            ref={canvasWrapRef}
            style={{
              minHeight: 760,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              backgroundImage:
                "linear-gradient(0deg, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              padding: 8,
              overflow: "hidden",
            }}
          >
            {canvasWidth > 0 && (
              <ReactGridLayout
                key={activeEntity?.id ?? "new"}
                width={canvasWidth - 16}
                layout={layout}
                cols={gridConfig.cols}
                rowHeight={gridConfig.rowHeight}
                margin={[0, 0]}
                containerPadding={[0, 0]}
                compactType={null}
                preventCollision={false}
                isDraggable={!previewMode}
                isResizable={!previewMode}
                draggableHandle=".drag-handle"
                onLayoutChange={(nextLayout) => {
                  const blockMap = new Map(blocks.map((block) => [block.id, block]));
                  setLayout(applyLayoutConstraints(nextLayout, blockMap));
                }}
              >
                {blocks.map((block) => (
                  <div key={block.id}>
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        border: "1px solid #d9d9d9",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        className="drag-handle"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderBottom: "1px solid #f0f0f0",
                          cursor: previewMode ? "default" : "move",
                          background: "#f9fafb",
                          userSelect: "none",
                        }}
                      >
                        <Text strong>{block.label}</Text>
                        <Button
                          size="small"
                          danger
                          onClick={() => handleDeleteBlock(block.id)}
                          disabled={
                            previewMode ||
                            (REQUIRED_BLOCK_TYPES.has(block.type) && (blockTypeCounts[block.type] ?? 0) <= 1)
                          }
                        >
                          Hapus
                        </Button>
                      </div>

                      <div style={{ padding: 10, flex: 1 }}>
                        {SYSTEM_DRIVEN_TYPES.has(block.type) ? (
                          <Text type="secondary">
                            Konten blok ini diambil otomatis dari profil organisasi, data surat, dan data penandatangan.
                          </Text>
                        ) : enableRichText ? (
                          <SimpleRichTextEditor
                            value={block.content}
                            onChange={(next) => handleContentChange(block.id, next)}
                            minHeight={160}
                          />
                        ) : (
                          <TextArea
                            value={block.content}
                            onChange={(e) => handleContentChange(block.id, e.target.value)}
                            autoSize={{ minRows: 3 }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ReactGridLayout>
            )}
          </div>
        )}
      </Card>

      <Modal
        title="Finalisasi Surat"
        open={finalizeOpen}
        onCancel={() => setFinalizeOpen(false)}
        onOk={() => finalizeForm.submit()}
        okText="Finalisasi"
        cancelText="Batal"
        confirmLoading={finalizing}
        destroyOnClose
      >
        <Form form={finalizeForm} layout="vertical" onFinish={handleFinalize}>
          <Form.Item name="numbering_profile_id" label="Profil Penomoran">
            <Select
              allowClear
              options={numberingProfiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
              }))}
              placeholder="Pilih profil jika nomor otomatis"
            />
          </Form.Item>
          <Form.Item name="number" label="Nomor Surat">
            <Input placeholder="Isi manual jika tidak pakai profil penomoran" />
          </Form.Item>
          <Form.Item name="classification" label="Klasifikasi">
            <Input />
          </Form.Item>
          <Form.Item
            name="date"
            label="Tanggal Surat"
            rules={[{ required: true, message: "Tanggal wajib diisi." }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Perihal"
            rules={[{ required: true, message: "Perihal wajib diisi." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="recipient_text"
            label="Kepada"
            rules={[{ required: true, message: "Penerima wajib diisi." }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="cc_text" label="Tembusan">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="signer_name"
            label="Nama Penandatangan"
            rules={[{ required: true, message: "Nama penandatangan wajib diisi." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="signer_title"
            label="Jabatan Penandatangan"
            rules={[{ required: true, message: "Jabatan penandatangan wajib diisi." }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
