import React from "react";

export default function TembusanBlock({ block }) {
  const content = String(block?.content ?? "");
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const safeHtml = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  if (isHtml) {
    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  }

  return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>;
}
