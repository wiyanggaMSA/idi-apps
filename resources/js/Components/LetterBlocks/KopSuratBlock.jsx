import React from "react";

const fallbackOrganization = {
  header_variant: "classic_center",
  org_name: "Nama Organisasi",
  org_unit: "",
  address_lines: [],
  contacts: {},
};

export default function KopSuratBlock({ data }) {
  const organization = { ...fallbackOrganization, ...(data?.organization ?? {}) };
  const addressLines = Array.isArray(organization.address_lines)
    ? organization.address_lines.filter(Boolean)
    : [];
  const contacts = organization.contacts ?? {};

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
