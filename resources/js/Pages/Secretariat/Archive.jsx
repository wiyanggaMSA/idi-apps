import React from "react";
import { usePage } from "@inertiajs/react";
import { Card, Table, Tag } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function Archive() {
  const { letters } = usePage().props;
    const data = letters?.data || [];

    const columns = [
        { title: "Nomor", dataIndex: "number", key: "number" },
        { title: "Tanggal", dataIndex: "date", key: "date" },
        { title: "Perihal", dataIndex: "subject", key: "subject" },
        { title: "Kepada", dataIndex: "recipient_text", key: "recipient_text" },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (value) => <Tag color="green">{value}</Tag>,
        },
    ];

    return (
        <AppLayout title="Sekretariat - Arsip">
            <PageShell>
                <PageHeader title="Arsip Surat Keluar" />
                <Card style={{ borderRadius: 12 }}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={data}
                        pagination={{
                            current: letters?.current_page,
                            pageSize: letters?.per_page,
                            total: letters?.total,
                        }}
                    />
                </Card>
            </PageShell>
        </AppLayout>
    );
}
