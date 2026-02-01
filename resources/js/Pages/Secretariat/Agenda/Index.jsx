import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import {
    Button,
    Card,
    Drawer,
    Empty,
    Form,
    Input,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function AgendaIndex() {
    const { agendas } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();

    const data = agendas?.data || [];

    const handleClose = () => {
        setOpen(false);
        setEditing(null);
        form.resetFields();
    };

    const handleCreate = () => {
        setEditing(null);
        form.resetFields();
        setOpen(true);
    };

    const handleEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            title: record.title,
            type: record.type ?? "internal",
            start_at: record.start_at ? dayjs(record.start_at).format("YYYY-MM-DDTHH:mm") : undefined,
            end_at: record.end_at ? dayjs(record.end_at).format("YYYY-MM-DDTHH:mm") : undefined,
            location: record.location,
            pic_name: record.pic_name,
            notes: record.notes,
        });
        setOpen(true);
    };

    const onSubmit = (values) => {
        if (editing) {
            router.patch(route("secretariat.agenda.update", editing.id), values);
        } else {
            router.post(route("secretariat.agenda.store"), values);
        }
        handleClose();
    };

    const columns = [
        {
            title: "Judul",
            dataIndex: "title",
            key: "title",
            render: (value) => (
                <Typography.Text strong ellipsis>
                    {value}
                </Typography.Text>
            ),
        },
        {
            title: "Jenis",
            dataIndex: "type",
            key: "type",
            render: (value) => {
                const label = value === "external" ? "EXTERNAL" : "INTERNAL";
                return <Tag color={value === "external" ? "blue" : "green"}>{label}</Tag>;
            },
        },
        {
            title: "Mulai",
            dataIndex: "start_at",
            key: "start_at",
            render: (value) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-"),
        },
        {
            title: "Selesai",
            dataIndex: "end_at",
            key: "end_at",
            render: (value) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-"),
        },
        {
            title: "Lokasi",
            dataIndex: "location",
            key: "location",
            render: (value) => value || "-",
        },
        {
            title: "PIC",
            dataIndex: "pic_name",
            key: "pic_name",
            render: (value) => value || "-",
        },
        {
            title: "Catatan",
            dataIndex: "notes",
            key: "notes",
            render: (value) =>
                value ? (
                    <Tooltip title={value}>
                        <Typography.Text ellipsis style={{ maxWidth: 180, display: "inline-block" }}>
                            {value}
                        </Typography.Text>
                    </Tooltip>
                ) : (
                    "-"
                ),
        },
        {
            title: "Aksi",
            key: "action",
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => handleEdit(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Hapus agenda ini?"
                        description="Tindakan ini tidak bisa dibatalkan."
                        onConfirm={() => router.delete(route("secretariat.agenda.destroy", record.id))}
                    >
                        <Button size="small" danger>
                            Hapus
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <AppLayout title="Sekretariat - Agenda">
            <PageShell>
                <PageHeader
                    title="Agenda"
                    extra={
                        <Button type="primary" onClick={handleCreate}>
                            Tambah Agenda
                        </Button>
                    }
                />

                <Card style={{ borderRadius: 12 }}>
                    <Table
                        rowKey="id"
                        columns={columns}
                        dataSource={data}
                        locale={{
                            emptyText: (
                                <Empty
                                    description="Belum ada agenda. Tambahkan kegiatan agar lebih informatif."
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                >
                                    <Button type="primary" onClick={handleCreate}>
                                        Tambah Agenda
                                    </Button>
                                </Empty>
                            ),
                        }}
                        pagination={{
                            current: agendas?.current_page,
                            pageSize: agendas?.per_page,
                            total: agendas?.total,
                            onChange: (page) => router.get(route("secretariat.agenda.index"), { page }),

                        }}
                    />
                </Card>

                <Drawer
                    title={editing ? "Ubah Agenda" : "Tambah Agenda"}
                    open={open}
                    onClose={handleClose}
                    size="large"
                    destroyOnHidden
                >
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
                            <Button onClick={handleClose}>Batal</Button>
                            <Button type="primary" htmlType="submit">
                                Simpan
                                {editing ? "Perbarui" : "Simpan"}
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
            </PageShell>
        </AppLayout>
    );
}
