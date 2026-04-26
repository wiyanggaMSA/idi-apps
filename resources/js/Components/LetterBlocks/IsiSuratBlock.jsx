import React from "react";

export default function IsiSuratBlock({ block }) {
  const content = String(block?.content ?? "");
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const safeHtml = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  if (isHtml) {
    return <div className="isi-surat" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  }

  return (
    <div className="isi-surat" style={{ whiteSpace: "pre-wrap" }}>
      {content}
    </div>
  );
}
