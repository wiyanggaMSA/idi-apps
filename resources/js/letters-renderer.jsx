import "../css/app.css";
import React from "react";
import { createRoot } from "react-dom/client";
import DocumentRenderer from "@/Components/DocumentRenderer";

const rootElement = document.getElementById("letter-render-root");
const renderData = window.__LETTER_RENDER_DATA__ ?? {};

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <DocumentRenderer
      blocks={renderData.blocks ?? []}
      layout={renderData.layout ?? []}
      gridConfig={renderData.gridConfig ?? { cols: 12, rowHeight: 24 }}
      data={renderData.data ?? {}}
    />
  );
}
