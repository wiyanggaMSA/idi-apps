import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Input, Modal, Space, Tag, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import DataTable from "@/Components/App/DataTable";
import useBilingual from "@/Hooks/useBilingual";

const { Text } = Typography;
const { TextArea } = Input;

export default function FinancePeriods() {
    const { tx } = useBilingual();
    const { props } = usePage();
    const periods = props.periods || [];
    const permissions = props.auth?.permissions || [];
    const canClose = permissions.includes("finance.period.close");
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    const closePeriod = () => {
        if (!selectedPeriod) return;

        setProcessing(true);
        router.post(
            route("finance.periods.close", {
                year: selectedPeriod.period_year,
                month: selectedPeriod.period_month,
            }),
            { notes },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setSelectedPeriod(null);
                    setNotes("");
                },
            },
        );
    };

    return (
        <AppLayout title={tx("Tutup Buku", "Close Books")}>
            <PageShell>
                <PageHeader
                    eyebrow={tx("Kontrol Keuangan", "Financial Control")}
                    title={tx("Tutup Buku", "Close Books")}
                    description={tx("Kelola status periode keuangan bulanan.", "Manage monthly financial period status.")}
                />

                <Card>
                    <DataTable
                        rowKey="period"
                        dataSource={periods}
                        pagination={false}
                        emptyTitle={tx("Belum ada periode", "No periods yet")}
                        emptyDescription={tx("Periode akan muncul otomatis berdasarkan bulan berjalan.", "Periods will appear automatically based on the current month.")}
                        columns={[
                            {
                                title: tx("Periode", "Period"),
                                dataIndex: "label",
                                key: "label",
                                render: (value, row) => (
                                    <div>
                                        <div className="font-semibold text-zinc-900">{value}</div>
                                        <div className="text-xs text-zinc-500">{row.period}</div>
                                    </div>
                                ),
                            },
                            {
                                title: tx("Status", "Status"),
                                dataIndex: "status",
                                key: "status",
                                render: (value) =>
                                    value === "closed" ? (
                                        <Tag color="red">{tx("Ditutup", "Closed")}</Tag>
                                    ) : (
                                        <Tag color="green">{tx("Terbuka", "Open")}</Tag>
                                    ),
                            },
                            {
                                title: tx("Ditutup Pada", "Closed At"),
                                dataIndex: "closed_at",
                                key: "closed_at",
                                render: (value) => value || <Text type="secondary">-</Text>,
                            },
                            {
                                title: tx("Ditutup Oleh", "Closed By"),
                                dataIndex: "closed_by",
                                key: "closed_by",
                                render: (value) => value || <Text type="secondary">-</Text>,
                            },
                            {
                                title: tx("Catatan", "Notes"),
                                dataIndex: "notes",
                                key: "notes",
                                render: (value) => value || <Text type="secondary">-</Text>,
                            },
                            {
                                title: "",
                                key: "actions",
                                align: "right",
                                render: (_, row) => (
                                    <Button
                                        icon={<LockOutlined />}
                                        disabled={!canClose || row.status === "closed"}
                                        onClick={() => {
                                            setSelectedPeriod(row);
                                            setNotes("");
                                        }}
                                    >
                                        {tx("Tutup", "Close")}
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </Card>

                <Modal
                    title={tx("Tutup Periode", "Close Period")}
                    open={Boolean(selectedPeriod)}
                    onCancel={() => {
                        if (processing) return;
                        setSelectedPeriod(null);
                        setNotes("");
                    }}
                    onOk={closePeriod}
                    okButtonProps={{
                        disabled: processing || notes.trim().length < 3,
                        loading: processing,
                    }}
                    okText={tx("Tutup Periode", "Close Period")}
                    cancelButtonProps={{ disabled: processing }}
                >
                    <Space orientation="vertical" className="w-full" size="middle">
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {tx("Periode yang sudah ditutup tidak dapat menerima transaksi, pembayaran iuran, atau void.", "A closed period cannot accept transactions, dues payments, or voids.")}
                        </div>
                        <div>
                            <div className="mb-1 text-xs font-semibold text-zinc-600">{tx("Periode", "Period")}</div>
                            <div className="text-sm font-semibold text-zinc-900">
                                {selectedPeriod?.label} ({selectedPeriod?.period})
                            </div>
                        </div>
                        <TextArea
                            rows={4}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder={tx("Catatan tutup buku", "Closing notes")}
                            disabled={processing}
                            maxLength={1000}
                            showCount
                        />
                    </Space>
                </Modal>
            </PageShell>
        </AppLayout>
    );
}
