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
  gridConfig = { cols: 12, rowHeight: 24 },
  data = {},
  paper = paperDefaults,
}) {
  const layoutMap = useMemo(() => new Map(layout.map((item) => [item.i, item])), [layout]);

  const innerWidth = paper.width - paper.padding * 2;
  const colWidth = innerWidth / gridConfig.cols;

  return (
    <div
      className="letter-paper"
      style={{
        width: paper.width,
        minHeight: paper.minHeight,
        padding: paper.padding,
      }}
    >
      {blocks.map((block) => {
        const position = layoutMap.get(block.id);
        const BlockComponent = blockRegistry[block.type];

        if (!position || !BlockComponent) {
          return null;
        }

        const left = position.x * colWidth;
        const top = position.y * gridConfig.rowHeight;
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
