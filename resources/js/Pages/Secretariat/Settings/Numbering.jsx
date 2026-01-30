import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Select, Space, Switch, Table } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function NumberingSettings() {
    const { props, url } = usePage();
    const { profiles = [] } = props;
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();
    const createAction = useMemo(() => {
        const queryString = url?.split("?")[1] || "";
        return new URLSearchParams(queryString).get("create");
    }, [url]);

    useEffect(() => {
        if (createAction === "numbering") {
            setOpen(true);
        }
    }, [createAction]);

    const onSubmit = (values) => {
        router.post(route("secretariat.numbering.store"), values);
        setOpen(false);
        form.resetFields();
    };

    const columns = [
        { title: "Nama", dataIndex: "name", key: "name" },
        { title: "Pattern", dataIndex: "pattern", key: "pattern" },
        { title: "Reset", dataIndex: "reset_policy", key: "reset_policy" },
        {
            title: "Aktif",
            dataIndex: "is_active",
            key: "is_active",
            render: (value) => (value ? "Ya" : "Tidak"),
        },
    ];

    return (
        <AppLayout title="Sekretariat - Penomoran Surat">
            <PageShell>
                <PageHeader
                    title="Profil Penomoran Surat"
                    right={
                        <Button type="primary" onClick={() => setOpen(true)}>
                            Tambah Profil
                        </Button>
                    }
                />
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={profiles} pagination={false} />
                </Card>
                <Drawer
                    title="Tambah Profil"
                    open={open}
                    onClose={() => setOpen(false)}
                    width={520}
                    destroyOnClose
                >
                    <Form layout="vertical" form={form} onFinish={onSubmit}>
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