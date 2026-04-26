import React from "react";

const fallbackOrganization = {
  header_variant: "classic_center",
  org_name: "Nama Organisasi",
  org_unit: "",
  address_lines: [],
  contacts: {},
};

const sanitizeHtml = (value) =>
  String(value ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/\s(href|src)=(["'])javascript:[^"']*\2/gi, "");

const isCustomKop = (content) => {
  const plain = String(content ?? "").replace(/<[^>]*>/g, "").trim().toLowerCase();
  if (!plain) return false;
  return plain !== "kop surat otomatis" && plain !== "kop surat...";
};

export default function KopSuratBlock({ block, data }) {
  const organization = { ...fallbackOrganization, ...(data?.organization ?? {}) };
  const addressLines = Array.isArray(organization.address_lines)
    ? organization.address_lines.filter(Boolean)
    : [];
  const contacts = organization.contacts ?? {};
  const customContent = String(block?.content ?? "");
  const hasCustomKop = isCustomKop(customContent);

  if (hasCustomKop) {
    const hasHtml = /<[a-z][\s\S]*>/i.test(customContent);
    const plainHtml = customContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    const customClass =
      organization.header_variant === "logo_left"
        ? "kop-surat__custom-wrap kop-surat__custom-wrap--left"
        : "kop-surat__custom-wrap";
    return (
      <div className="kop-surat kop-surat--center">
        <div className={customClass}>
          {organization.logo_url && (
            <img className="kop-surat__logo kop-surat__logo--custom" src={organization.logo_url} alt="Logo organisasi" />
          )}
          <div
            className="kop-surat__custom"
            dangerouslySetInnerHTML={{
              __html: hasHtml ? sanitizeHtml(customContent) : plainHtml,
            }}
          />
        </div>
        <div className="kop-surat__divider" />
      </div>
    );
  }

  if (organization.header_variant === "logo_left") {
    return (
      <div className="kop-surat kop-surat--left">
        {organization.logo_url && (
          <img
            className="kop-surat__logo"
            src={organization.logo_url}
            alt="Logo organisasi"
          />
        )}
        <div className="kop-surat__content">
          <div className="kop-surat__org-name">{organization.org_name}</div>
          {organization.org_unit && (
            <div className="kop-surat__org-unit">{organization.org_unit}</div>
          )}
          {addressLines.length > 0 && (
            <div className="kop-surat__address">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          <div className="kop-surat__contacts">
            {contacts.tel && <span>{contacts.tel}</span>}
            {contacts.email && <span>{contacts.email}</span>}
            {contacts.website && <span>{contacts.website}</span>}
          </div>
        </div>
        <div className="kop-surat__spacer" />
        <div className="kop-surat__divider" />
      </div>
    );
  }

  return (
    <div className="kop-surat kop-surat--center">
      {organization.logo_url && (
        <img
          className="kop-surat__logo"
          src={organization.logo_url}
          alt="Logo organisasi"
        />
      )}
      <div className="kop-surat__org-name">{organization.org_name}</div>
      {organization.org_unit && <div className="kop-surat__org-unit">{organization.org_unit}</div>}
      {addressLines.length > 0 && (
        <div className="kop-surat__address">
          {addressLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
      <div className="kop-surat__contacts">
        {contacts.tel && <span>{contacts.tel}</span>}
        {contacts.email && <span>{contacts.email}</span>}
        {contacts.website && <span>{contacts.website}</span>}
      </div>
      <div className="kop-surat__divider" />
    </div>
  );
}
