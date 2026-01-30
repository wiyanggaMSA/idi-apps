import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { Card, Table } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function LetterVersions() {
    const { letter, versions } = usePage().props;

    const columns = [
        { title: "Versi", dataIndex: "version", key: "version" },
        { title: "Nomor", dataIndex: "number", key: "number" },
        { title: "Tanggal", dataIndex: "date", key: "date" },
        { title: "Perihal", dataIndex: "subject", key: "subject" },
        {
            title: "PDF",
            key: "pdf",
            render: (_, record) => (
                <Link href={route("secretariat.letters.pdf", { letter: letter.id, v: record.version })}>Download</Link>
            ),
        },
    ];

    return (
        <AppLayout title="Sekretariat - Versi Surat">
            <PageShell>
                <PageHeader title={`Versi Surat: ${letter?.subject || ""}`} />
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={versions} pagination={false} />
                </Card>
            </PageShell>
        </AppLayout>
    );
}
