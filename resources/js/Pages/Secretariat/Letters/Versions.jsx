import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Card, Space, Table, Tag } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import { useI18n } from "@/Contexts/I18nContext";
import { formatDate } from "@/lib/format";

export default function LetterVersions() {
  const { language } = useI18n();
  const isEn = language === "en";
  const { letter, versions } = usePage().props;
  const copy = {
    pageTitle: isEn ? "Secretariat - Letter Versions" : "Sekretariat - Versi Surat",
    title: isEn ? "Letter Versions" : "Versi Surat",
    version: isEn ? "Version" : "Versi",
    number: isEn ? "Letter Number" : "Nomor Surat",
    date: isEn ? "Date" : "Tanggal",
    subject: isEn ? "Subject" : "Perihal",
    actions: isEn ? "Actions" : "Aksi",
  };

  const columns = [
    { title: copy.version, dataIndex: "version", key: "version", render: (value) => <Tag>v{value}</Tag> },
    { title: copy.number, dataIndex: "number", key: "number", render: (value) => value || "-" },
    { title: copy.date, dataIndex: "date", key: "date", render: (value) => formatDate(value) },
    { title: copy.subject, dataIndex: "subject", key: "subject", render: (value) => value || "-" },
    {
      title: copy.actions,
      key: "actions",
      render: (_, record) => (
        <Space>
          <Link href={route("secretariat.letters.pdf", { letter: letter.id, v: record.version })}>PDF</Link>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout title={copy.pageTitle}>
      <PageShell>
        <PageHeader title={`${copy.title}: ${letter?.subject || "-"}`} />
        <Card style={{ borderRadius: 12 }}>
          <Table rowKey="id" columns={columns} dataSource={versions || []} pagination={false} />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
