import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import { Button, Card, Divider, Input, Select, Space, Typography, message } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";

import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import DocumentRenderer from "@/Components/DocumentRenderer";

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

const createLayoutItem = (id, type) => {
  const template = findCatalog(type);
  return {
    i: id,
    x: 0,
    y: Infinity,
    w: template?.w ?? 6,
    h: template?.h ?? 3,
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
  signerMembers = [],
}) {
  const { props } = usePage();
  const activeEntity = entity ?? letter;

  const gridConfig = { cols: 12, rowHeight: 24 };

  const initialBlocks = useMemo(() => {
    return Array.isArray(activeEntity?.blocks_json) ? activeEntity.blocks_json : [];
  }, [activeEntity]);

  const initialLayout = useMemo(() => {
    if (Array.isArray(activeEntity?.layout_json) && activeEntity.layout_json.length) {
      return activeEntity.layout_json;
    }
    if (Array.isArray(activeEntity?.blocks_json) && activeEntity.blocks_json.length) {
      return activeEntity.blocks_json.map((block) => createLayoutItem(block.id, block.type));
    }
    return [];
  }, [activeEntity]);

  const [blocks, setBlocks] = useState(initialBlocks);
  const [layout, setLayout] = useState(initialLayout);
  const [previewMode, setPreviewMode] = useState(false);

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
      header_variant: orgProfile.header_variant ?? "classic_center",
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
    // Anda memilih behavior: kalau belum ada id → buat draft dulu
    if (!activeEntity?.id) {
      router.post(
        route("secretariat.letters.store"),
        { layout, blocks },
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
      { layout, blocks },
      {
        preserveScroll: true,
        onSuccess: () => message.success("Layout surat berhasil disimpan."),
        onError: () => message.error("Gagal menyimpan layout surat."),
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
      message.error("Gagal menyiapkan tanda tangan digital.");
    }
  };

  const { ref: canvasWrapRef, width: canvasWidth } = useContainerWidth();

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
                href={activeEntity?.id ? route("secretariat.letters.pdf", activeEntity.id) : "#"}
                target="_blank"
                disabled={!activeEntity?.id}
              >
                Unduh PDF
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
                onLayoutChange={(nextLayout) => setLayout(nextLayout)}
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
                          disabled={previewMode}
                        >
                          Hapus
                        </Button>
                      </div>

                      <div style={{ padding: 10, flex: 1 }}>
                        <TextArea
                          value={block.content}
                          onChange={(e) => handleContentChange(block.id, e.target.value)}
                          autoSize={{ minRows: 3 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </ReactGridLayout>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
