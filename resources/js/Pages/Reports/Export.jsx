import React from "react";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import {
    BarChartOutlined,
    FileExcelOutlined,
    FilePdfOutlined,
    WalletOutlined,
} from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import { useI18n } from "@/Contexts/I18nContext";

const { Text } = Typography;

const openRoute = (name, params = {}) => {
    window.open(route(name, params), "_blank");
};

export default function ReportsExport() {
    const { t } = useI18n();

    const exportItems = [
        {
            title: "Laporan Kas",
            description:
                "PDF ringkasan kas masuk, kas keluar, saldo, kategori, dan metode pembayaran.",
            icon: <WalletOutlined />,
            actionLabel: "Export PDF",
            action: () => openRoute("reports.cash.pdf", { include_dues: 1 }),
        },
        {
            title: "Resume Keuangan",
            description:
                "PDF resume keuangan organisasi, termasuk komposisi iuran dan kas.",
            icon: <BarChartOutlined />,
            actionLabel: "Export PDF",
            action: () =>
                openRoute("reports.financial-summary.pdf", {
                    include_dues_in_cash: 1,
                }),
        },
        {
            title: "Data Anggota",
            description:
                "Excel data anggota untuk arsip pengurus dan pemeriksaan non-teknis.",
            icon: <FileExcelOutlined />,
            actionLabel: "Export Excel",
            action: () => {
                window.location.href = route("members.export", {
                    format: "xlsx",
                });
            },
        },
        {
            title: "Rekap Iuran",
            description:
                "Excel rekap iuran anggota yang siap dibuka dan dibagikan sebagai arsip kerja.",
            icon: <FileExcelOutlined />,
            actionLabel: "Export Excel",
            action: () => {
                window.location.href = route("dues.recap.export");
            },
        },
    ];

    return (
        <AppLayout title={t("reports.export.title")}>
            <PageShell>
                <PageHeader
                    eyebrow="Export Center"
                    title={t("reports.export.title")}
                    description="Pilih laporan atau data siap pakai yang ingin diunduh. Untuk filter tanggal, divisi, kategori, atau metode, buka halaman laporan terkait lalu export dari sana."
                />

                <Row gutter={[12, 12]}>
                    {exportItems.map((item) => (
                        <Col xs={24} md={12} key={item.title}>
                            <Card style={{ borderRadius: 12, height: "100%" }}>
                                <Space
                                    align="start"
                                    style={{
                                        justifyContent: "space-between",
                                        width: "100%",
                                        gap: 16,
                                    }}
                                >
                                    <Space align="start" size={12}>
                                        <span
                                            style={{
                                                alignItems: "center",
                                                background: "#fff1f0",
                                                borderRadius: 10,
                                                color: "#b71c1c",
                                                display: "inline-flex",
                                                fontSize: 20,
                                                height: 42,
                                                justifyContent: "center",
                                                width: 42,
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        <div>
                                            <Text strong>{item.title}</Text>
                                            <br />
                                            <Text type="secondary">
                                                {item.description}
                                            </Text>
                                        </div>
                                    </Space>

                                    <Button
                                        icon={
                                            item.actionLabel.includes("PDF") ? (
                                                <FilePdfOutlined />
                                            ) : (
                                                <FileExcelOutlined />
                                            )
                                        }
                                        onClick={item.action}
                                    >
                                        {item.actionLabel}
                                    </Button>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </PageShell>
        </AppLayout>
    );
}
