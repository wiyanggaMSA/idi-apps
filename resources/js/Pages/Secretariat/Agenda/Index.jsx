import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Select, Space, Table, Tag } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function AgendaIndex() {
    const { agendas } = usePage().props;
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const data = agendas?.data || [];

    const onSubmit = (values) => {
        router.post(route("secretariat.agenda.store"), values);
        setOpen(false);
        form.resetFields();
    };

    const columns = [
        { title: "Judul", dataIndex: "title", key: "title" },
        {
            title: "Jenis",
            dataIndex: "type",
            key: "type",
            render: (value) => {
                const label = value === "external" ? "EXTERNAL" : "INTERNAL";
                return <Tag color={value === "external" ? "blue" : "green"}>{label}</Tag>;
            },
        },
        { title: "Mulai", dataIndex: "start_at", key: "start_at" },
        { title: "Selesai", dataIndex: "end_at", key: "end_at" },
        { title: "Lokasi", dataIndex: "location", key: "location" },
    ];

    return (
        <AppLayout title="Sekretariat - Agenda">
            <PageShell>
                <PageHeader
                    title="Agenda"
                    right={
                        <Button type="primary" onClick={() => setOpen(true)}>
                            Tambah Agenda
                        </Button>
                    }
                />

                <Card style={{ borderRadius: 12 }}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={data}
                        pagination={{
                            current: agendas?.current_page,
                            pageSize: agendas?.per_page,
                            total: agendas?.total,
                            onChange: (page) => router.get(route("secretariat.agenda.index"), { page }),
                        }}
                    />
                </Card>

                <Drawer title="Tambah Agenda" open={open} onClose={() => setOpen(false)} width={520} destroyOnClose>
                    <Form layout="vertical" form={form} onFinish={onSubmit}>
                        <Form.Item name="title" label="Judul" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="type" label="Jenis Kegiatan" initialValue="internal">
                            <Select
                                options={[
                                    { label: "Internal", value: "internal" },
                                    { label: "External", value: "external" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="start_at" label="Mulai" rules={[{ required: true }]}>
                            <Input type="datetime-local" />
                        </Form.Item>
                        <Form.Item name="end_at" label="Selesai">
                            <Input type="datetime-local" />
                        </Form.Item>
                        <Form.Item name="location" label="Lokasi">
                            <Input />
                        </Form.Item>
                        <Form.Item name="pic_name" label="PIC">
                            <Input />
                        </Form.Item>
                        <Form.Item name="notes" label="Catatan">
                            <Input.TextArea rows={3} />
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
