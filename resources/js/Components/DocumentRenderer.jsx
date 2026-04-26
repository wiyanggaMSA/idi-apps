import React, { useMemo } from "react";
import KopSuratBlock from "@/Components/LetterBlocks/KopSuratBlock";
import NomorTanggalBlock from "@/Components/LetterBlocks/NomorTanggalBlock";
import IsiSuratBlock from "@/Components/LetterBlocks/IsiSuratBlock";
import TandaTanganBlock from "@/Components/LetterBlocks/TandaTanganBlock";
import TembusanBlock from "@/Components/LetterBlocks/TembusanBlock";

const paperDefaults = {
  width: 794,
  minHeight: 1123,
  padding: 96,
};

const blockRegistry = {
  kop_surat: KopSuratBlock,
  nomor_tanggal: NomorTanggalBlock,
  isi_surat: IsiSuratBlock,
  tanda_tangan: TandaTanganBlock,
  tembusan: TembusanBlock,
};

const fontFamilyMap = {
  "Times New Roman": '"Times New Roman", Times, serif',
  Arial: "Arial, Helvetica, sans-serif",
  Calibri: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
};

export default function DocumentRenderer({
  blocks = [],
  layout = [],
  gridConfig = { cols: 12, rowHeight: 24, margin: [10, 10], containerPadding: [0, 0] },
  data = {},
  paper = paperDefaults,
  layoutMode = "absolute",
}) {
  const rawStyle = data?.style ?? {};
  const selectedFont = rawStyle?.font_family || "Times New Roman";
  const documentStyle = {
    fontFamily: fontFamilyMap[selectedFont] || fontFamilyMap["Times New Roman"],
    fontSize: Number(rawStyle?.font_size ?? 12),
    lineHeight: Number(rawStyle?.line_height ?? 1.5),
    paragraphSpacing: Number(rawStyle?.paragraph_spacing ?? 8),
  };

  const layoutMap = useMemo(() => new Map(layout.map((item) => [item.i, item])), [layout]);
  const sortedBlocks = useMemo(() => {
    if (layoutMode !== "flow") {
      return blocks;
    }
    return [...blocks].sort((a, b) => {
      const posA = layoutMap.get(a.id);
      const posB = layoutMap.get(b.id);
      if (!posA && !posB) return 0;
      if (!posA) return 1;
      if (!posB) return -1;
      if (posA.y !== posB.y) return posA.y - posB.y;
      return posA.x - posB.x;
    });
  }, [blocks, layoutMap, layoutMode]);

  const innerWidth = paper.width - paper.padding * 2;
  const marginX = gridConfig.margin?.[0] ?? 0;
  const marginY = gridConfig.margin?.[1] ?? 0;
  const paddingX = gridConfig.containerPadding?.[0] ?? 0;
  const paddingY = gridConfig.containerPadding?.[1] ?? 0;
  const colWidth = (innerWidth - marginX * (gridConfig.cols - 1)) / gridConfig.cols;

  return (
    <div
      className={`letter-paper${layoutMode === "flow" ? " letter-paper--flow" : ""}`}
      style={{
        width: paper.width,
        minHeight: paper.minHeight,
        padding: paper.padding,
        fontFamily: documentStyle.fontFamily,
        fontSize: `${documentStyle.fontSize}pt`,
        lineHeight: documentStyle.lineHeight,
        ["--letter-paragraph-spacing"]: `${documentStyle.paragraphSpacing}px`,
      }}
    >
      {sortedBlocks.map((block) => {
        const BlockComponent = blockRegistry[block.type];

        if (!BlockComponent) {
          return null;
        }

        if (layoutMode === "flow") {
          return (
            <div key={block.id} className="letter-block letter-block--flow">
              <BlockComponent block={block} data={data} />
            </div>
          );
        }

        const position = layoutMap.get(block.id);

        if (!position) {
          return null;
        }

        const left = paddingX + position.x * (colWidth + marginX);
        const top = paddingY + position.y * (gridConfig.rowHeight + marginY);
        const width = position.w * colWidth;
        const height = position.h * gridConfig.rowHeight;

        return (
          <div
            key={block.id}
            className="letter-block"
            style={{
              left,
              top,
              width,
              height,
            }}
          >
            <BlockComponent block={block} data={data} />
          </div>
        );
      })}
    </div>
  );
}
