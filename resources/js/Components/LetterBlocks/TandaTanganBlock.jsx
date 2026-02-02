import React from "react";

export default function TandaTanganBlock({ block, data }) {
  const signature = data?.signature ?? null;
  const signer = data?.signer ?? {};
  const qrDataUri = signature?.qr_data_uri ?? "";

  const fallbackLines = (block.content ?? "").split("\n");
  const signerName = signer.name || fallbackLines[1] || "";
  const signerRole = signer.role || fallbackLines[2] || "";

  return (
    <div className="tanda-tangan">
      <div className="tanda-tangan__text">
        <div>Hormat kami,</div>
        <div className="tanda-tangan__name">{signerName}</div>
        <div>{signerRole}</div>
      </div>

      {qrDataUri && (
        <div className="tanda-tangan__qr">
          <div className="signature-qr">
            <img src={qrDataUri} alt="QR verifikasi surat" />
          </div>
          <div className="tanda-tangan__qr-caption">Scan untuk verifikasi keaslian surat</div>
        </div>
      )}
    </div>
  );
}
