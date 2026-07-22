import React, { useCallback, useEffect, useMemo, useRef } from "react";
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
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "link"],
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
  "color",
  "background",
  "align",
  "list",
  "bullet",
  "indent",
  "blockquote",
  "link",
];

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

const cleanClipboardText = (value) => String(value ?? "")
  .replace(/\r\n?/g, "\n")
  .replace(/\u00a0/g, " ")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

export default function SimpleRichTextEditor({ value, onChange, minHeight = 180, documentMode = false }) {
  const quillRef = useRef(null);
  const wrapperRef = useRef(null);
  const normalizedValue = useMemo(() => toHtml(value), [value]);
  const selectedModules = useMemo(() => (documentMode ? documentModules : modules), [documentMode]);

  const handlePaste = useCallback((event) => {
    const text = cleanClipboardText(event.clipboardData?.getData("text/plain"));

    if (!text) {
      return;
    }

    const editor = quillRef.current?.getEditor?.();

    if (!editor) {
      return;
    }

    event.preventDefault();

    const range = editor.getSelection(true) ?? { index: editor.getLength(), length: 0 };

    if (range.length) {
      editor.deleteText(range.index, range.length, "user");
    }

    editor.insertText(range.index, text, "user");
    editor.setSelection(range.index + text.length, 0, "silent");
  }, []);

  useEffect(() => {
    const toolbar = wrapperRef.current?.querySelector(".ql-toolbar");
    if (!toolbar) {
      return;
    }

    const controlLabels = {
      "ql-header": "Gaya paragraf",
      "ql-bold": "Tebal",
      "ql-italic": "Miring",
      "ql-underline": "Garis bawah",
      "ql-strike": "Coret",
      "ql-color": "Warna teks",
      "ql-background": "Warna sorotan",
      "ql-align": "Perataan",
      "ql-list": "Daftar",
      "ql-indent": "Indentasi",
      "ql-blockquote": "Kutipan",
      "ql-link": "Tautan",
      "ql-clean": "Hapus format",
    };

    Object.entries(controlLabels).forEach(([className, label]) => {
      toolbar.querySelectorAll(`.${className}`).forEach((control) => {
        control.setAttribute("title", label);
        if (!control.getAttribute("aria-label")) {
          control.setAttribute("aria-label", label);
        }
      });
    });
  }, [documentMode]);

  return (
    <div
      ref={wrapperRef}
      className={`richtext-editor ${documentMode ? "richtext-editor-document" : ""}`}
      onPasteCapture={handlePaste}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={normalizedValue}
        onChange={(html) => onChange?.(html)}
        modules={selectedModules}
        formats={formats}
      />
      <style>{`
        .richtext-editor .ql-editor {
          min-height: ${minHeight}px;
          font-size: 14px;
          line-height: 1.5;
        }
        .richtext-editor .ql-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .richtext-editor .ql-toolbar .ql-formats {
          display: inline-flex;
          align-items: center;
          margin-right: 4px;
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
