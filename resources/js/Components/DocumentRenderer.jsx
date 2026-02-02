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

export default function DocumentRenderer({
  blocks = [],
  layout = [],
  gridConfig = { cols: 12, rowHeight: 24, margin: [10, 10], containerPadding: [0, 0] },
  data = {},
  paper = paperDefaults,
  layoutMode = "absolute",
}) {
  const layoutMap = useMemo(() => new Map(layout.map((item) => [item.i, item])), [layout]);

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
      }}
    >
      {blocks.map((block) => {
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
