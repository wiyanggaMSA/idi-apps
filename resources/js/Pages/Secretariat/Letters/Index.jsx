import React, { useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Button, Card, DatePicker, Empty, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function LettersIndex() {
    const { letters, filters = {}, templates = [] } = usePage().props;
    const data = letters?.data || [];
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const onSearch = (value) => {
        router.get(route("secretariat.letters.index"), { ...filters, search: value }, { preserveState: true });
    };

    const onFilterChange = (updates) => {
        router.get(route("secretariat.letters.index"), { ...filters, ...updates }, { preserveState: true });
    };

    const columns = useMemo(
        () => [
            {
                title: "Nomor",
                dataIndex: "number",
                key: "number",
                render: (value) => (value ? <Text strong>{value}</Text> : <Tag>DRAFT</Tag>),
            },
            {
                title: "Tanggal",
                dataIndex: "date",
                key: "date",
                width: 140,
                render: (value) => value || "-",
            },
            {
                title: "Perihal",
                dataIndex: "subject",
                key: "subject",
            },
            {
                title: "Kepada",
                dataIndex: "recipient_text",
                key: "recipient_text",
                render: (value) => value || "-",
            },
            {
                title: "Penandatangan",
                dataIndex: "signer_name",
                key: "signer_name",
                render: (value) => value || "-",
            },
            {
                title: "Versi",
                dataIndex: "versions_count",
                key: "versions_count",
                width: 80,
                render: (value) => value || 1,
            },
            {
                title: "Status",
                dataIndex: "status",
                key: "status",
                width: 120,
                render: (value) => {
                    const colorMap = {
                        DRAFT: "default",
                        ARCHIVED: "green",
                        REVOKED: "red",
                    };
                    return <Tag color={colorMap[value] || "default"}>{value}</Tag>;
                },
            },
            {
                title: "Aksi",
                key: "actions",
                width: 220,
                render: (_, record) => (
                    <Space>
                        <Link href={route("secretariat.letters.edit", record.id)}>Edit</Link>
                        <Link href={route("secretariat.letters.versions", record.id)}>Versi</Link>
                        <Link href={route("secretariat.letters.pdf", { letter: record.id })}>PDF</Link>
                        {record.status === "ARCHIVED" && (
                            <Link
                                href={route("secretariat.letters.revoke", record.id)}
                                method="patch"
                                as="button"
                            >
                                Cabut
                            </Link>
                        )}
                    </Space>
                ),
            },
        ],
        []
    );

    const onCreateLetter = () => {
        if (selectedTemplate) {
            router.get(route("secretariat.letters.create"), { template_id: selectedTemplate });
            return;
        }
        router.get(route("secretariat.letters.create"));
    };

    return (
        <AppLayout title="Sekretariat - Surat">
            <PageShell>
                <PageHeader
                    title="Sekretariat — Surat"
                    right={
                        <Space>
                            <Link href={route("secretariat.templates.index")}>Template</Link>
                            <Link href={route("secretariat.numbering.index")}>Penomoran</Link>
                            <Button type="primary" onClick={() => setCreateOpen(true)}>
                                Buat Surat
                            </Button>
                        </Space>
                    }
                />

                <Card style={{ borderRadius: 12 }}>
                    <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
                        <Space>
                            <Select
                                placeholder="Status"
                                value={filters?.status || undefined}
                                allowClear
                                style={{ width: 160 }}
                                options={[
                                    { label: "Draft", value: "DRAFT" },
                                    { label: "Archived", value: "ARCHIVED" },
                                    { label: "Revoked", value: "REVOKED" },
                                ]}
                                onChange={(value) => onFilterChange({ status: value || "" })}
                            />
                            <RangePicker
                                onChange={(dates) =>
                                    onFilterChange({
                                        date_from: dates?.[0]?.format("YYYY-MM-DD") || "",
                                        date_to: dates?.[1]?.format("YYYY-MM-DD") || "",
                                    })
                                }
                            />
                        </Space>
                        <Input.Search
                            placeholder="Cari nomor/perihal/penerima"
                            defaultValue={filters?.search}
                            onSearch={onSearch}
                            style={{ maxWidth: 320 }}
                        />
                    </Space>

                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={data}
                        pagination={{
                            current: letters?.current_page,
                            pageSize: letters?.per_page,
                            total: letters?.total,
                            onChange: (page) => onFilterChange({ page }),
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    description={
                                        <Space direction="vertical">
                                            <Text strong>Belum ada surat yang tersimpan.</Text>
                                            <Text type="secondary">
                                                Mulai dari membuat template, atur penomoran, lalu buat surat baru.
                                            </Text>
                                        </Space>
                                    }
                                >
                                    <Space>
                                        <Button onClick={() => router.get(route("secretariat.templates.index"))}>
                                            Kelola Template
                                        </Button>
                                        <Button onClick={() => router.get(route("secretariat.numbering.index"))}>
                                            Atur Penomoran
                                        </Button>
                                        <Button type="primary" onClick={() => setCreateOpen(true)}>
                                            Buat Surat
                                        </Button>
                                    </Space>
                                </Empty>
                            ),
                        }}
                    />
                </Card>
                <Modal
                    title="Buat Surat"
                    open={createOpen}
                    onCancel={() => {
                        setCreateOpen(false);
                        setSelectedTemplate(null);
                    }}
                    onOk={() => {
                        setCreateOpen(false);
                        onCreateLetter();
                        setSelectedTemplate(null);
                    }}
                    okText="Lanjutkan"
                    cancelText="Batal"
                >
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <Typography.Text>
                            Pilih format surat agar form mengikuti template yang tersedia.
                        </Typography.Text>
                        <Select
                            placeholder="Pilih template (opsional)"
                            value={selectedTemplate}
                            onChange={(value) => setSelectedTemplate(value)}
                            allowClear
                            options={templates.map((template) => ({
                                label: template.name,
                                value: template.id,
                            }))}
                        />
                    </Space>
                </Modal>
            </PageShell>
        </AppLayout>
    );
}