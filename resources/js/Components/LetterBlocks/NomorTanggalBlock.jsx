import React from "react";

export default function NomorTanggalBlock({ block, data }) {
  const number = data?.letter?.number || "";
  const date = data?.letter?.date || "";
  const fallback = block.content ?? "";

  if (!number && !date && fallback) {
    return <div style={{ whiteSpace: "pre-wrap" }}>{fallback}</div>;
  }

  return (
    <div className="nomor-tanggal">
      <div>Nomor: {number || "-"}</div>
      <div>Tanggal: {date || "-"}</div>
    </div>
  );
}
