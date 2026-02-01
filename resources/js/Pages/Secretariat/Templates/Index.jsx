import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Select, Space, Switch, Table, Typography } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function TemplatesIndex() {
    const { props, url } = usePage();
    const { templates = [], numberingProfiles = [] } = props;
    const [open, setOpen] = useState(false);
    const [openNumbering, setOpenNumbering] = useState(false);
    const [form] = Form.useForm();
    const [numberingForm] = Form.useForm();
    const createAction = useMemo(() => {
        const queryString = url?.split("?")[1] || "";
        return new URLSearchParams(queryString).get("create");
    }, [url]);

    useEffect(() => {
        if (createAction === "template") {
            setOpen(true);
        }
    }, [createAction]);

    const onSubmit = (values) => {
        router.post(route("secretariat.templates.store"), values);
        setOpen(false);
        form.resetFields();
    };

    const onSubmitNumbering = (values) => {
        router.post(route("secretariat.numbering.store"), values);
        setOpenNumbering(false);
        numberingForm.resetFields();
    };

    const columns = [
        { title: "Nama", dataIndex: "name", key: "name" },
        { title: "Klasifikasi", dataIndex: "classification", key: "classification" },
        {
            title: "Aktif",
            dataIndex: "is_active",
            key: "is_active",
            render: (value) => (value ? "Ya" : "Tidak"),
        },
    ];

    const numberingColumns = [
        { title: "Nama", dataIndex: "name", key: "name" },
        { title: "Pattern", dataIndex: "pattern", key: "pattern" },
        { title: "Reset", dataIndex: "reset_policy", key: "reset_policy" },
        {
            title: "Aktif",
            dataIndex: "is_active",
            key: "is_active",
            render: (value) => (value ? "Ya" : "Tidak"),
        },
        {
            title: "Builder",
            key: "builder",
            render: (_, record) => (
                <Button size="small" type="link" href={route("secretariat.templates.builder", record.id)}>
                    Buka Builder
                </Button>
            ),
        },
    ];

    return (
        <AppLayout title="Sekretariat - Template Surat">
            <PageShell>
                <PageHeader
                    title="Template Surat"
                    extra={
                        <Space>
                            <Button onClick={() => setOpenNumbering(true)}>Tambah Penomoran</Button>
                            <Button type="primary" onClick={() => setOpen(true)}>
                                Tambah Template
                            </Button>
                        </Space>
                    }
                />
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={templates} pagination={false} />
                </Card>
                <Card style={{ borderRadius: 12, marginTop: 16 }}>
                    <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
                        <Typography.Title level={5} style={{ margin: 0 }}>
                            Penomoran Surat
                        </Typography.Title>
                        <Button type="link" href={route("secretariat.numbering.index")}>
                            Kelola Penomoran
                        </Button>
                    </Space>
                    <Table
                        rowKey="id"
                        columns={numberingColumns}
                        dataSource={numberingProfiles}
                        pagination={false}
                    />
                </Card>

                <Drawer
                    title="Tambah Template"
                    open={open}
                    onClose={() => setOpen(false)}
                    width={520}
                    destroyOnClose
                >
                    <Form layout="vertical" form={form} onFinish={onSubmit}>
                        <Form.Item name="name" label="Nama" rules={[{ required: true }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item name="code" label="Kode Template">
                            <Input placeholder="AUTO: jika kosong akan dibuat otomatis" />
                        </Form.Item>
                        <Form.Item name="classification" label="Klasifikasi">
                            <Input />
                        </Form.Item>
                        <Form.Item name="numbering_profile_id" label="Profil Penomoran">
                            <Select
                                allowClear
                                options={numberingProfiles.map((profile) => ({
                                    label: profile.name,
                                    value: profile.id,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            name="content_text"
                            label="Format Surat (HTML)"
                            extra="Gunakan placeholder seperti {{letter.subject}} atau {{qr}} untuk QR code."
                        >
                            <Input.TextArea rows={5} placeholder="Contoh: <p>{{letter.subject}}</p>" />
                        </Form.Item>
                        <Form.Item
                            name="placeholders_schema_json"
                            label="Otorisasi QR (daftar pihak)"
                            extra="Masukkan daftar pihak yang berhak memverifikasi QR code."
                        >
                            <Select mode="tags" placeholder="Contoh: Ketua, Sekretaris" />
                        </Form.Item>
                        <Form.Item
                            name="content_text"
                            label="Format Surat (HTML)"
                            extra="Gunakan placeholder seperti {{letter.subject}} atau {{qr}} untuk QR code."
                        >
                            <Input.TextArea rows={5} placeholder="Contoh: <p>{{letter.subject}}</p>" />
                        </Form.Item>
                        <Form.Item
                            name="placeholders_schema_json"
                            label="Otorisasi QR (daftar pihak)"
                            extra="Masukkan daftar pihak yang berhak memverifikasi QR code."
                        >
                            <Select mode="tags" placeholder="Contoh: Ketua, Sekretaris" />
                        </Form.Item>
                        <Form.Item name="paper" label="Kertas" initialValue="A4">
                            <Select options={[{ label: "A4", value: "A4" }]} />
                        </Form.Item>
                        <Form.Item name="is_active" label="Aktif" valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                        <Typography.Text type="secondary">
                            Template ini menjadi dasar format surat, termasuk penomoran dan QR otorisasi.
                        </Typography.Text>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={() => setOpen(false)}>Batal</Button>
                            <Button type="primary" htmlType="submit">
                                Simpan
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
                <Drawer
                    title="Tambah Profil Penomoran"
                    open={openNumbering}
                    onClose={() => setOpenNumbering(false)}
                    width={520}
                    destroyOnClose
                >
                    <Form layout="vertical" form={numberingForm} onFinish={onSubmitNumbering}>
                        <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="pattern"
                            label="Pattern"
                            rules={[{ required: true }]}
                            extra="Contoh: {seq}/{type}/{org}/{roman_month}/{year}"
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item name="reset_policy" label="Reset Policy" initialValue="yearly">
                            <Select
                                options={[
                                    { label: "Tahunan", value: "yearly" },
                                    { label: "Bulanan", value: "monthly" },
                                    { label: "Tanpa Reset", value: "never" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="prefix" label="Prefix">
                            <Input />
                        </Form.Item>
                        <Form.Item name="suffix" label="Suffix">
                            <Input />
                        </Form.Item>
                        <Form.Item name="is_active" label="Aktif" valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={() => setOpenNumbering(false)}>Batal</Button>
                            <Button type="primary" htmlType="submit">
                                Simpan
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
            </PageShell>
        </AppLayout>
    );
}