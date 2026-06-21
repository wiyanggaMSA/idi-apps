import React from "react";
import { Head, usePage } from "@inertiajs/react";
import { Alert, Button, Card, Descriptions, Tag } from "antd";

const statusMap = {
  VALID: { color: "success", label: "Terverifikasi" },
  PENDING_SIGNATURE: { color: "warning", label: "Menunggu Tanda Tangan" },
  REVOKED: { color: "warning", label: "Dicabut / Tidak Berlaku" },
  INVALID: { color: "error", label: "Tidak Valid" },
};

export default function VerifySignature() {
  const { payload } = usePage().props;
  const state = statusMap[payload?.status] ?? statusMap.INVALID;
  const org = payload?.organization ?? {};
  const logoUrl = org.logo_url || "/images/idi-logo.png";
  const signatureSummary = payload?.signature_verification ?? {};

  return (
    <>
      <Head title="Verifikasi Surat" />
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 10% 10%, #e0f2fe 0%, #f8fafc 45%, #eef2ff 100%)",
          padding: "28px 16px",
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.12)",
              overflow: "hidden",
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #0f766e, #0369a1)",
                color: "#fff",
                padding: "20px 22px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <img
                src={logoUrl}
                alt="Logo organisasi"
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 12,
                  objectFit: "cover",
                  background: "#fff",
                  padding: 6,
                }}
              />
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, letterSpacing: 1.1 }}>
                  VERIFIKASI TANDA TANGAN DIGITAL
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
                  {org.name || "Verifikasi Surat"}
                </div>
                {org.unit ? <div style={{ opacity: 0.95 }}>{org.unit}</div> : null}
              </div>
            </div>

            <div style={{ padding: 22 }}>
              <Alert
                type={state.color}
                showIcon
                message={
                  <span>
                    Status dokumen: <strong>{state.label}</strong>
                  </span>
                }
                style={{ marginBottom: 16, borderRadius: 12 }}
              />

              <Descriptions
                bordered
                column={1}
                size="middle"
                labelStyle={{ width: 220, fontWeight: 600 }}
              >
                <Descriptions.Item label="Status">
                  <Tag color={payload?.status === "VALID" ? "green" : payload?.status === "PENDING_SIGNATURE" ? "gold" : payload?.status === "REVOKED" ? "orange" : "red"}>
                    {payload?.status || "-"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Penandatangan">
                  {payload?.signer_name || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Jabatan Penandatangan">
                  {payload?.signer_role || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Nomor Surat">
                  {payload?.number || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Tanggal Surat">
                  {payload?.date || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Perihal">
                  {payload?.subject || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Waktu Tanda Tangan">
                  {payload?.signed_at || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Kelengkapan Dokumen">
                  {signatureSummary.required_count ? (
                    <span>
                      {signatureSummary.signed_count || 0}/{signatureSummary.required_count} tanda tangan lengkap
                    </span>
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
