import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Select, Space, Switch, Table } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function TemplatesIndex() {
    const { props, url } = usePage();
    const { templates = [], numberingProfiles = [] } = props;
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
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

    return (
        <AppLayout title="Sekretariat - Template Surat">
            <PageShell>
                <PageHeader
                    title="Template Surat"
                    right={
                        <Button type="primary" onClick={() => setOpen(true)}>
                            Tambah Template
                        </Button>
                    }
                />
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={templates} pagination={false} />
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
                        <Form.Item name="paper" label="Kertas" initialValue="A4">
                            <Select options={[{ label: "A4", value: "A4" }]} />
                        </Form.Item>
                        <Form.Item name="is_active" label="Aktif" valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={() => setOpen(false)}>Batal</Button>
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
