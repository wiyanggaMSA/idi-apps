import React from "react";
import { usePage } from "@inertiajs/react";

export default function VerifySignature() {
  const { payload } = usePage().props;

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
        <h1 style={{ marginBottom: 16, fontSize: 20 }}>Verifikasi Surat</h1>
        <div style={{ marginBottom: 12 }}>
          <strong>Status:</strong> {payload.status}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Penandatangan:</strong> {payload.signer_name}
          {payload.signer_role ? ` — ${payload.signer_role}` : ""}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Nomor Surat:</strong> {payload.number || "-"}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Tanggal:</strong> {payload.date || "-"}
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>Perihal:</strong> {payload.subject || "-"}
        </div>
        <div>
          <strong>Ditandatangani:</strong> {payload.signed_at || "-"}
        </div>
      </div>
    </div>
  );
}
