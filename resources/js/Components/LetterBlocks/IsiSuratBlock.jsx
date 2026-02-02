import React from "react";

export default function IsiSuratBlock({ block }) {
  return <div className="isi-surat" style={{ whiteSpace: "pre-wrap" }}>{block.content}</div>;
}
