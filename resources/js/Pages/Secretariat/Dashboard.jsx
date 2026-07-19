import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Button, Card, Col, Row, Space, Table, Tag, Typography } from "antd";
import { CalendarOutlined, FileAddOutlined, FileDoneOutlined, FileTextOutlined, FolderOpenOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import useBilingual from "@/Hooks/useBilingual";

const statusColor = {
  draft: "gold",
  finalized: "blue",
  archived: "green",
};

export default function SecretariatDashboard() {
  const { summary = {}, latestLetters = [], upcomingAgenda = [] } = usePage().props;
  const { language, tx } = useBilingual();
  const statusLabel = {
    draft: tx("Draf", "Draft"),
    finalized: tx("Final", "Finalized"),
    archived: tx("Arsip", "Archived"),
  };

  const cards = [
    { label: tx("Draf", "Draft"), value: summary.draft ?? 0, icon: <FileTextOutlined />, tone: "border-amber-100 bg-amber-50" },
    { label: "Final", value: summary.finalized ?? 0, icon: <FileDoneOutlined />, tone: "border-blue-100 bg-blue-50" },
    { label: tx("Arsip", "Archived"), value: summary.archived ?? 0, icon: <FolderOpenOutlined />, tone: "border-emerald-100 bg-emerald-50" },
    { label: tx("Template Aktif", "Active Templates"), value: summary.templates ?? 0, icon: <FileAddOutlined />, tone: "border-red-100 bg-red-50" },
  ];

  return (
    <AppLayout title={tx("Sekretariat", "Secretariat")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Sekretariat", "Secretariat")}
          title={tx("Dashboard Sekretariat", "Secretariat Dashboard")}
          description={tx("Ringkasan surat, agenda terdekat, dan pintasan kerja utama.", "A summary of letters, upcoming agendas, and key work shortcuts.")}
          extra={
            <Space>
              <Link href={route("secretariat.letters.create")}>
                <Button type="primary">{tx("Buat Surat", "Create Letter")}</Button>
              </Link>
              <Link href={route("secretariat.archive.index")}>
                <Button>{tx("Unggah Arsip", "Upload Archive")}</Button>
              </Link>
            </Space>
          }
        />

        <Row gutter={[16, 16]}>
          {cards.map((card) => (
            <Col span={6} key={card.label}>
              <Card className={`border ${card.tone}`} bodyStyle={{ padding: 20 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-950">{card.value}</p>
                  </div>
                  <div className="text-2xl text-red-700">{card.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={15}>
            <Card title={tx("Surat Terbaru", "Latest Letters")} className="border-white/80 shadow-sm">
              <Table
                rowKey="id"
                size="middle"
                dataSource={latestLetters}
                pagination={false}
                columns={[
                  {
                    title: tx("Perihal", "Subject"),
                    dataIndex: "subject",
                    render: (value, record) => <Link href={route("secretariat.letters.show", record.id)}>{value || "-"}</Link>,
                  },
                  { title: tx("Nomor", "Number"), dataIndex: "number", render: (value) => value || tx("Belum final", "Not finalized") },
                  { title: tx("Template", "Template"), dataIndex: ["template", "name"], render: (value) => value || "-" },
                  {
                    title: tx("Status", "Status"),
                    dataIndex: "status",
                    render: (value) => <Tag color={statusColor[value] || "default"}>{statusLabel[value] || value || "-"}</Tag>,
                  },
                ]}
              />
            </Card>
          </Col>
          <Col span={9}>
            <Card
              title={
                <Space>
                  <CalendarOutlined />
                  {tx("Agenda Terdekat", "Upcoming Agenda")}
                </Space>
              }
              className="border-white/80 shadow-sm"
            >
              <div className="space-y-3">
                {upcomingAgenda.length === 0 ? (
                  <Typography.Text type="secondary">{tx("Belum ada agenda terdekat.", "No upcoming agenda yet.")}</Typography.Text>
                ) : (
                  upcomingAgenda.map((agenda) => (
                    <div key={agenda.id} className="rounded-lg border border-zinc-100 bg-white px-4 py-3">
                      <div className="font-medium text-zinc-950">{agenda.title}</div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {agenda.start_at ? new Date(agenda.start_at).toLocaleString(language === "en" ? "en-US" : "id-ID") : "-"} · {agenda.location || tx("Lokasi belum diisi", "Location not provided")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </PageShell>
    </AppLayout>
  );
}
