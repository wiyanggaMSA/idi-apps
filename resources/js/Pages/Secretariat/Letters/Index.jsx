import React, { useEffect, useMemo, useState, useTransition } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Button, Card, Col, DatePicker, Empty, Input, Row, Select, Space, Table, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";

const statusColor = {
  draft: "gold",
  finalized: "blue",
  archived: "green",
};

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Final", value: "finalized" },
  { label: "Arsip", value: "archived" },
];

export default function LettersIndex() {
  const { letters, filters = {}, templates = [], summary = {} } = usePage().props;
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
    <AppLayout title="Sekretariat - Surat">
      <PageShell>
        <PageHeader
          eyebrow="Surat"
          title="Daftar Surat"
          description="Kelola draft, finalisasi, preview PDF, dan arsip surat dari satu tempat."
          extra={
            <Space>
              <Link href={route("secretariat.templates.index")}>
                <Button>Template Surat</Button>
              </Link>
              <Link href={route("secretariat.letters.create")}>
                <Button type="primary" icon={<PlusOutlined />}>Buat Surat</Button>
              </Link>
            </Space>
          }
        />

        <Row gutter={[16, 16]}>
          {[
            ["Draft", summary.draft ?? 0, "bg-amber-50 border-amber-100"],
            ["Final", summary.finalized ?? 0, "bg-blue-50 border-blue-100"],
            ["Arsip", summary.archived ?? 0, "bg-emerald-50 border-emerald-100"],
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
              placeholder="Cari nomor, perihal, penerima..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="col-span-2"
              allowClear
              placeholder="Status"
              value={filters.status || undefined}
              options={statusOptions}
              onChange={(value) => applyFilter({ status: value || "" })}
            />
            <Select
              className="col-span-3"
              allowClear
              placeholder="Template/Jenis"
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
                <Empty description="Belum ada surat sesuai filter.">
                  <Link href={route("secretariat.letters.create")}>
                    <Button type="primary">Buat Surat</Button>
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
                title: "Perihal",
                dataIndex: "subject",
                render: (value, record) => (
                  <div>
                    <Link className="font-medium text-zinc-950" href={route("secretariat.letters.show", record.id)}>
                      {value || "-"}
                    </Link>
                    <div className="text-xs text-zinc-500">{record.template?.name || "Tanpa template"}</div>
                  </div>
                ),
              },
              { title: "Nomor", dataIndex: "number", render: (value) => value || <span className="text-zinc-400">Belum final</span> },
              { title: "Tanggal", dataIndex: "date", render: (value) => value || "-" },
              { title: "Lampiran", dataIndex: "documents_count", align: "center" },
              {
                title: "Status",
                dataIndex: "status",
                render: (value) => <Tag color={statusColor[value] || "default"}>{value || "-"}</Tag>,
              },
              {
                title: "Aksi",
                render: (_, record) => (
                  <Space>
                    <Link href={route("secretariat.letters.show", record.id)}>Detail</Link>
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
