import React from "react";
import { usePage } from "@inertiajs/react";
import { Card, Descriptions, Tag } from "antd";

export default function VerifyLetter() {
    const { payload } = usePage().props;

    return (
        <div style={{ maxWidth: 760, margin: "40px auto" }}>
            <Card title="Verifikasi Surat">
                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Status">
                        <Tag color={payload.status === "VALID" ? "green" : "red"}>{payload.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Penandatangan">
                        {payload.signer_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Nomor Surat">{payload.number}</Descriptions.Item>
                    <Descriptions.Item label="Tanggal">{payload.date}</Descriptions.Item>
                    <Descriptions.Item label="Perihal">{payload.subject}</Descriptions.Item>
                    <Descriptions.Item label="Versi">{payload.version}</Descriptions.Item>
                    <Descriptions.Item label="PDF">
                        {payload.pdf_url ? (
                            <a href={payload.pdf_url} target="_blank" rel="noreferrer">
                                Unduh PDF
                            </a>
                        ) : (
                            "Belum tersedia"
                        )}
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
}
