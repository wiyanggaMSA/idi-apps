import React from "react";

export default function TandaTanganBlock({ block, data }) {
  const signature = data?.signature ?? null;
  const signer = data?.signer ?? {};
  const style = data?.style ?? {};
  const organization = data?.organization ?? {};
  const qrDataUri = signature?.qr_data_uri ?? "";
  const orgLogo = organization?.logo_url ?? "";
  const qrPosition = style?.signature_qr_position === "left" ? "left" : "right";

  const fallbackLines = (block.content ?? "").split("\n");
  const signerName = signer.name || fallbackLines[1] || "";
  const signerRole = signer.role || fallbackLines[2] || "";

  return (
    <div className={`tanda-tangan tanda-tangan--${qrPosition}`}>
      <div className="tanda-tangan__text">
        <div className="tanda-tangan__opening">Hormat kami,</div>

        {qrDataUri && (
          <div className="tanda-tangan__qr">
            <div className="signature-qr">
              <img src={qrDataUri} alt="QR verifikasi surat" />
              {orgLogo && <img className="signature-qr__logo" src={orgLogo} alt="Logo organisasi" />}
            </div>
            <div className="tanda-tangan__qr-caption">Scan untuk verifikasi keaslian surat</div>
          </div>
        )}

        <div className="tanda-tangan__name">{signerName}</div>
        <div>{signerRole}</div>
      </div>
    </div>
  );
}
