import React from "react";
import { Head, usePage } from "@inertiajs/react";
import { Alert, Button, Card, Descriptions, Tag } from "antd";

export default function VerifyLetter() {
  const { payload } = usePage().props;
  const org = payload?.organization ?? {};
  const isValid = payload?.status === "VALID";
  const isPending = payload?.status === "PENDING_SIGNATURES";
  const logoUrl = org.logo_url || "/images/idi-logo.png";
  const signatureSummary = payload?.signature_verification ?? {};

  return (
    <>
      <Head title="Verifikasi Dokumen Surat" />
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 10% 10%, #ede9fe 0%, #f8fafc 46%, #e0f2fe 100%)",
          padding: "28px 16px",
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
                background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
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
                  VERIFIKASI DOKUMEN RESMI
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
                  {org.name || "Verifikasi Surat"}
                </div>
                {org.unit ? <div style={{ opacity: 0.95 }}>{org.unit}</div> : null}
              </div>
            </div>

            <div style={{ padding: 22 }}>
              <Alert
                type={isValid ? "success" : "warning"}
                showIcon
                message={
                  isValid
                    ? "Dokumen terverifikasi dan terdaftar di sistem."
                    : isPending
                      ? "Dokumen terdaftar, tetapi metadata verifikasi belum lengkap karena masih menunggu tanda tangan."
                      : "Dokumen tidak valid atau sudah dicabut."
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
                  <Tag color={isValid ? "green" : isPending ? "gold" : "red"}>{payload?.status || "-"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status Tanda Tangan">
                  {signatureSummary.required_count ? (
                    <span>
                      {signatureSummary.signed_count || 0}/{signatureSummary.required_count} sudah tanda tangan
                    </span>
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Penandatangan">
                  {signatureSummary.signers?.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {signatureSummary.signers.map((signer, index) => (
                        <div
                          key={signer.id || index}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            borderBottom: index + 1 === signatureSummary.signers.length ? "none" : "1px solid #e5e7eb",
                            paddingBottom: index + 1 === signatureSummary.signers.length ? 0 : 10,
                          }}
                        >
                          <div>
                            <div>{signer.name || "-"}</div>
                            {signer.role ? (
                              <div style={{ color: "#64748b", fontSize: 13 }}>{signer.role}</div>
                            ) : null}
                          </div>
                          <Tag color={signer.status === "signed" ? "green" : "gold"}>
                            {signer.status === "signed" ? "Sudah tanda tangan" : "Menunggu"}
                          </Tag>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div>{payload?.signer_name || "-"}</div>
                      {payload?.signer_title ? (
                        <div style={{ color: "#64748b", fontSize: 13 }}>{payload.signer_title}</div>
                      ) : null}
                    </div>
                  )}
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
                <Descriptions.Item label="Versi Dokumen">
                  v{payload?.version || 1}
                </Descriptions.Item>
              </Descriptions>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                {payload?.pdf_url ? (
                  <Button type="primary" href={payload.pdf_url} target="_blank" rel="noreferrer">
                    Lihat PDF
                  </Button>
                ) : null}
                <Button href="/" type="default">
                  Kembali ke Beranda
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
