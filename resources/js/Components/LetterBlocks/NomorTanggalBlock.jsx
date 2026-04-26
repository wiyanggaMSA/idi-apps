import React from "react";

const pickLabeledValue = (lines, label) => {
  const normalizedLabel = label.toLowerCase();
  const line = lines.find((entry) => entry.toLowerCase().startsWith(`${normalizedLabel}:`));
  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
};

const parseFallbackMetadata = (content) => {
  const lines = String(content ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const colonValues = lines
    .filter((line) => line.startsWith(":"))
    .map((line) => line.replace(/^:\s*/, "").trim());

  const number = pickLabeledValue(lines, "nomor") || colonValues[0] || "";
  const lampiran = pickLabeledValue(lines, "lampiran") || colonValues[1] || "";
  const perihal = pickLabeledValue(lines, "perihal") || colonValues[2] || "";

  return { number, lampiran, perihal };
};

export default function NomorTanggalBlock({ block, data }) {
  const fallback = parseFallbackMetadata(block.content);
  const number = data?.letter?.number || fallback.number || "-";
  const date = data?.letter?.date || "-";
  const subject = data?.letter?.subject || fallback.perihal || "-";
  const lampiran = fallback.lampiran || "-";

  return (
    <div className="nomor-tanggal">
      <div className="nomor-tanggal__meta">
        <div className="nomor-tanggal__row">
          <span className="nomor-tanggal__label">Nomor</span>
          <span className="nomor-tanggal__colon">:</span>
          <span>{number}</span>
        </div>
        <div className="nomor-tanggal__row">
          <span className="nomor-tanggal__label">Lampiran</span>
          <span className="nomor-tanggal__colon">:</span>
          <span>{lampiran}</span>
        </div>
        <div className="nomor-tanggal__row">
          <span className="nomor-tanggal__label">Perihal</span>
          <span className="nomor-tanggal__colon">:</span>
          <span className="nomor-tanggal__subject">{subject}</span>
        </div>
      </div>
      <div className="nomor-tanggal__date">Purwakarta, {date}</div>
    </div>
  );
}
