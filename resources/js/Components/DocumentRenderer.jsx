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

const paperSizeMap = {
  A4: [794, 1123],
  A5: [559, 794],
  Letter: [816, 1056],
  Legal: [816, 1344],
};

const mmToPx = (value) => (Number(value) * 96) / 25.4;

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
    fontSize: Number(rawStyle?.font_size ?? 11),
    lineHeight: Number(rawStyle?.line_height ?? 1.25),
    paragraphSpacing: Number(rawStyle?.paragraph_spacing ?? 2),
  };
  const selectedPaper = paperSizeMap[rawStyle?.paper_format] || [paper.width, paper.minHeight];
  const isLandscape = rawStyle?.orientation === "L";
  const pageWidth = isLandscape ? selectedPaper[1] : selectedPaper[0];
  const pageHeight = isLandscape ? selectedPaper[0] : selectedPaper[1];
  const pagePadding = {
    top: mmToPx(rawStyle?.margin_top_mm ?? 10),
    right: mmToPx(rawStyle?.margin_right_mm ?? 18),
    bottom: mmToPx(rawStyle?.margin_bottom_mm ?? 20),
    left: mmToPx(rawStyle?.margin_left_mm ?? 18),
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

  const innerWidth = pageWidth - pagePadding.left - pagePadding.right;
  const marginX = gridConfig.margin?.[0] ?? 0;
  const marginY = gridConfig.margin?.[1] ?? 0;
  const paddingX = gridConfig.containerPadding?.[0] ?? 0;
  const paddingY = gridConfig.containerPadding?.[1] ?? 0;
  const colWidth = (innerWidth - marginX * (gridConfig.cols - 1)) / gridConfig.cols;

  return (
    <div
      className={`letter-paper${layoutMode === "flow" ? " letter-paper--flow" : ""}`}
      style={{
        boxSizing: "border-box",
        width: pageWidth,
        minHeight: pageHeight,
        padding: `${pagePadding.top}px ${pagePadding.right}px ${pagePadding.bottom}px ${pagePadding.left}px`,
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
