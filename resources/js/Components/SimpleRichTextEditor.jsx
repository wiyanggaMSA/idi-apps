import React, { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link"],
    ["clean"],
  ],
  clipboard: {
    matchVisual: false,
  },
};

const documentModules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote"],
    ["clean"],
  ],
  clipboard: {
    matchVisual: false,
  },
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "align",
  "list",
  "bullet",
  "blockquote",
  "link",
];

const normalizeColonRows = (html) => String(html ?? "").replace(
  /<(p|div)([^>]*)>(.*?)<\/\1>/gis,
  (full, tag, attributes = "", inner = "") => {
    const plain = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    const match = plain.match(/^([^:]{2,42})\s*:\s*(.+)$/u);

    if (!match) {
      return full;
    }

    const label = match[1].trim();
    const value = inner.replace(new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`, "u"), "");

    return `<p${attributes} class="colon-row"><span class="colon-label">${label}</span><span class="colon-separator">:</span><span class="colon-value">${value}</span></p>`;
  },
);

const toHtml = (value) => {
  const text = String(value ?? "");
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`))
    .join("");
};

export default function SimpleRichTextEditor({ value, onChange, minHeight = 180, documentMode = false }) {
  const normalizedValue = useMemo(() => toHtml(value), [value]);

  return (
    <div className={`richtext-editor ${documentMode ? "richtext-editor-document" : ""}`}>
      <ReactQuill
        theme="snow"
        value={normalizedValue}
        onChange={(html) => onChange?.(documentMode ? normalizeColonRows(html) : html)}
        modules={documentMode ? documentModules : modules}
        formats={formats}
      />
      <style>{`
        .richtext-editor .ql-editor {
          min-height: ${minHeight}px;
          font-size: 14px;
          line-height: 1.5;
        }
        .richtext-editor-document .ql-editor {
          font-family: "Times New Roman", Times, serif;
          font-size: 15px;
          line-height: 1.45;
          color: #111827;
        }
        .richtext-editor-document .ql-editor p {
          margin: 0 0 4px;
        }
        .richtext-editor-document .ql-editor .colon-row {
          display: grid;
          grid-template-columns: 150px 18px 1fr;
          gap: 0;
          align-items: start;
        }
        .richtext-editor-document .ql-editor .colon-label {
          white-space: nowrap;
        }
        .richtext-editor-document .ql-editor .colon-separator {
          text-align: center;
        }
      `}</style>
    </div>
  );
}
