import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { Button, Card, Divider, Input, Space, Typography, message } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";

import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

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
      // avoid thrash
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

export default function LetterGridBuilder({ letter }) {
  const initialBlocks = useMemo(() => {
    return Array.isArray(letter?.blocks_json) ? letter.blocks_json : [];
  }, [letter]);

  const initialLayout = useMemo(() => {
    if (Array.isArray(letter?.layout_json) && letter.layout_json.length) {
      return letter.layout_json;
    }
    if (Array.isArray(letter?.blocks_json) && letter.blocks_json.length) {
      return letter.blocks_json.map((block) => createLayoutItem(block.id, block.type));
    }
    return [];
  }, [letter]);

  const [blocks, setBlocks] = useState(initialBlocks);
  const [layout, setLayout] = useState(initialLayout);
  const [previewMode, setPreviewMode] = useState(false);

  // ✅ Sync when letter changes
  useEffect(() => {
    setBlocks(initialBlocks);
    setLayout(initialLayout);
    setPreviewMode(false);
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
    if (!letter?.id) {
      message.warning("Surat belum tersedia untuk menyimpan layout.");
      return;
    }

    router.put(
      route("secretariat.letters.layout", letter.id),
      { layout, blocks },
      {
        preserveScroll: true,
        onSuccess: () => message.success("Layout surat berhasil disimpan."),
        onError: () => message.error("Gagal menyimpan layout surat."),
      }
    );
  };

  const orderedBlocks = useMemo(() => {
    const layoutMap = new Map(layout.map((item) => [item.i, item]));
    return blocks
      .map((block) => ({ ...block, position: layoutMap.get(block.id) }))
      .sort((a, b) => {
        const ay = a.position?.y ?? 0;
        const by = b.position?.y ?? 0;
        if (ay !== by) return ay - by;

        const ax = a.position?.x ?? 0;
        const bx = b.position?.x ?? 0;
        return ax - bx;
      });
  }, [blocks, layout]);

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
        <Space direction="vertical" style={{ width: "100%" }}>
          {blockCatalog.map((block) => (
            <Button key={block.type} onClick={() => handleAddBlock(block.type)}>
              {block.label}
            </Button>
          ))}
        </Space>

        <Divider />

        <Button type="primary" onClick={handleSave} disabled={!letter?.id}>
          Simpan Layout
        </Button>

        {!letter?.id && (
          <Text type="secondary" style={{ marginTop: 8 }}>
            Buat/simpan surat dulu agar layout bisa disimpan.
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

            <Button
              icon={<DownloadOutlined />}
              href={letter?.id ? route("secretariat.letters.pdf", letter.id) : "#"}
              target="_blank"
              disabled={!letter?.id}
            >
              Unduh PDF
            </Button>
          </Space>
        }
      >
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
          {/* width must be known; render grid after measurement */}
          {canvasWidth > 0 && (
            <ReactGridLayout
              key={letter?.id ?? "new"}
              width={canvasWidth - 16} // padding compensation (8 left + 8 right)
              layout={layout}
              cols={12}
              rowHeight={24}
              margin={[10, 10]}
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
                      {previewMode ? (
                        <Text style={{ whiteSpace: "pre-wrap" }}>{block.content}</Text>
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

        {previewMode && (
          <div style={{ marginTop: 24 }}>
            <Divider orientation="left">Pratinjau Surat</Divider>
            {orderedBlocks.map((block) => (
              <div key={block.id} style={{ marginBottom: 16 }}>
                <Text strong style={{ display: "block", marginBottom: 4 }}>
                  {block.label}
                </Text>
                <Text style={{ whiteSpace: "pre-wrap" }}>{block.content}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
