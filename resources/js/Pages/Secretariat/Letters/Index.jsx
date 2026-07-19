import React, { useEffect, useMemo, useState, useTransition } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Button, Card, Col, DatePicker, Empty, Input, Row, Select, Space, Table, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import { formatDate } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

const statusColor = {
  draft: "gold",
  finalized: "blue",
  archived: "green",
};

export default function LettersIndex() {
  const { letters, filters = {}, templates = [], summary = {} } = usePage().props;
  const { tx } = useBilingual();
  const statusLabels = {
    draft: tx("Draf", "Draft"),
    finalized: tx("Final", "Finalized"),
    archived: tx("Arsip", "Archived"),
  };
  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ label, value }));
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search || "");
  const templateOptions = useMemo(
    () => templates.map((template) => ({ label: template.name, value: template.classification || template.name })),
    [templates]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== (filters.search || "")) {
        startTransition(() => {
          router.get(route("secretariat.letters.index"), { ...filters, search, page: 1 }, { preserveState: true, replace: true });
        });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const applyFilter = (next) => {
    router.get(route("secretariat.letters.index"), { ...filters, ...next, page: 1 }, { preserveState: true, replace: true });
  };

  const data = letters?.data || [];

  return (
    <AppLayout title={tx("Sekretariat - Surat", "Secretariat - Letters")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Surat", "Letters")}
          title={tx("Daftar Surat", "Letter List")}
          description={tx("Kelola draf, finalisasi, pratinjau PDF, dan arsip surat dari satu tempat.", "Manage drafts, finalization, PDF previews, and letter archives in one place.")}
          extra={
            <Space>
              <Link href={route("secretariat.templates.index")}>
                <Button>{tx("Template Surat", "Letter Templates")}</Button>
              </Link>
              <Link href={route("secretariat.letters.create")}>
                <Button type="primary" icon={<PlusOutlined />}>{tx("Buat Surat", "Create Letter")}</Button>
              </Link>
            </Space>
          }
        />

        <Row gutter={[16, 16]}>
          {[
            [tx("Draf", "Draft"), summary.draft ?? 0, "bg-amber-50 border-amber-100"],
            ["Final", summary.finalized ?? 0, "bg-blue-50 border-blue-100"],
            [tx("Arsip", "Archived"), summary.archived ?? 0, "bg-emerald-50 border-emerald-100"],
          ].map(([label, value, tone]) => (
            <Col span={8} key={label}>
              <div className={`rounded-lg border ${tone} px-5 py-4`}>
                <div className="text-sm font-medium text-zinc-500">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-zinc-950">{value}</div>
              </div>
            </Col>
          ))}
        </Row>

        <Card className="border-white/80 shadow-sm">
          <div className="mb-4 grid grid-cols-12 gap-3">
            <Input
              className="col-span-4"
              allowClear
              prefix={<SearchOutlined />}
              placeholder={tx("Cari nomor, perihal, penerima...", "Search number, subject, recipient...")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="col-span-2"
              allowClear
              placeholder={tx("Status", "Status")}
              value={filters.status || undefined}
              options={statusOptions}
              onChange={(value) => applyFilter({ status: value || "" })}
            />
            <Select
              className="col-span-3"
              allowClear
              placeholder={tx("Template/Jenis", "Template/Type")}
              value={filters.classification || undefined}
              options={templateOptions}
              onChange={(value) => applyFilter({ classification: value || "" })}
            />
            <DatePicker.RangePicker
              className="col-span-3"
              onChange={(_, values) => applyFilter({ date_from: values?.[0] || "", date_to: values?.[1] || "" })}
            />
          </div>

          <Table
            rowKey="id"
            loading={isPending}
            dataSource={data}
            locale={{
              emptyText: (
                <Empty description={tx("Belum ada surat sesuai filter.", "No letters match the filters.")}>
                  <Link href={route("secretariat.letters.create")}>
                    <Button type="primary">{tx("Buat Surat", "Create Letter")}</Button>
                  </Link>
                </Empty>
              ),
            }}
            pagination={{
              current: letters?.current_page,
              pageSize: letters?.per_page,
              total: letters?.total,
              showSizeChanger: false,
              onChange: (page) => router.get(route("secretariat.letters.index"), { ...filters, page }, { preserveState: true }),
            }}
            columns={[
              {
                title: tx("Perihal", "Subject"),
                dataIndex: "subject",
                render: (value, record) => (
                  <div>
                    <Link className="font-medium text-zinc-950" href={route("secretariat.letters.show", record.id)}>
                      {value || "-"}
                    </Link>
                    <div className="text-xs text-zinc-500">{record.template?.name || tx("Tanpa template", "No template")}</div>
                  </div>
                ),
              },
              { title: tx("Nomor", "Number"), dataIndex: "number", render: (value) => value || <span className="text-zinc-400">{tx("Belum final", "Not finalized")}</span> },
              { title: tx("Tanggal", "Date"), dataIndex: "date", render: (value) => formatDate(value) },
              { title: tx("Lampiran", "Attachments"), dataIndex: "documents_count", align: "center" },
              {
                title: tx("Status", "Status"),
                dataIndex: "status",
                render: (value) => <Tag color={statusColor[value] || "default"}>{statusLabels[value] || value || "-"}</Tag>,
              },
              {
                title: tx("Aksi", "Actions"),
                render: (_, record) => (
                  <Space>
                    <Link href={route("secretariat.letters.show", record.id)}>{tx("Detail", "Details")}</Link>
                    {record.status === "draft" ? <Link href={route("secretariat.letters.edit", record.id)}>Edit</Link> : null}
                    <a href={route("secretariat.letters.pdf.preview", record.id)} target="_blank" rel="noreferrer">PDF</a>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
