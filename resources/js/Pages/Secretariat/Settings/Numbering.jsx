import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Switch, Table } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import { useI18n } from "@/Contexts/I18nContext";

export default function NumberingSettings() {
    const { language } = useI18n();
    const isEn = language === "en";
    const { props, url } = usePage();
    const { profiles = [] } = props;
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const copy = {
        pageTitle: isEn ? "Secretariat - Letter Numbering" : "Sekretariat - Penomoran Surat",
        title: isEn ? "Letter Numbering Profiles" : "Profil Penomoran Surat",
        addProfile: isEn ? "Add Profile" : "Tambah Profil",
        editProfile: isEn ? "Edit Profile" : "Ubah Profil",
        name: isEn ? "Name" : "Nama",
        pattern: "Pattern",
        reset: "Reset",
        active: isEn ? "Active" : "Aktif",
        yes: isEn ? "Yes" : "Ya",
        no: isEn ? "No" : "Tidak",
        actions: isEn ? "Actions" : "Aksi",
        edit: "Edit",
        delete: isEn ? "Delete" : "Hapus",
        deleteConfirm: isEn ? "Delete this profile?" : "Hapus profil ini?",
        deleteDescription: isEn ? "This action cannot be undone." : "Tindakan ini tidak bisa dibatalkan.",
        patternHelp: isEn ? "Example: {seq}/{type}/{org}/{roman_month}/{year}" : "Contoh: {seq}/{type}/{org}/{roman_month}/{year}",
        resetPolicy: isEn ? "Reset Policy" : "Reset Policy",
        yearly: isEn ? "Yearly" : "Tahunan",
        monthly: isEn ? "Monthly" : "Bulanan",
        never: isEn ? "No Reset" : "Tanpa Reset",
        prefix: "Prefix",
        suffix: "Suffix",
        cancel: isEn ? "Cancel" : "Batal",
        save: isEn ? "Save" : "Simpan",
        update: isEn ? "Update" : "Perbarui",
    };
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
        if (editing) {
            router.patch(route("secretariat.numbering.update", editing.id), values);
        } else {
            router.post(route("secretariat.numbering.store"), values);
        }
        setOpen(false);
        setEditing(null);
        form.resetFields();
    };

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setOpen(true);
    };

    const openEdit = (profile) => {
        setEditing(profile);
        form.setFieldsValue({
            name: profile.name,
            pattern: profile.pattern,
            reset_policy: profile.reset_policy,
            prefix: profile.prefix,
            suffix: profile.suffix,
            is_active: profile.is_active,
        });
        setOpen(true);
    };

    const columns = [
        { title: copy.name, dataIndex: "name", key: "name" },
        { title: copy.pattern, dataIndex: "pattern", key: "pattern" },
        { title: copy.reset, dataIndex: "reset_policy", key: "reset_policy" },
        {
            title: copy.active,
            dataIndex: "is_active",
            key: "is_active",
            render: (value) => (value ? copy.yes : copy.no),
        },
        {
            title: copy.actions,
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button size="small" onClick={() => openEdit(record)}>
                        {copy.edit}
                    </Button>
                    <Popconfirm
                        title={copy.deleteConfirm}
                        description={copy.deleteDescription}
                        onConfirm={() => router.delete(route("secretariat.numbering.destroy", record.id))}
                    >
                        <Button size="small" danger>
                            {copy.delete}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <AppLayout title={copy.pageTitle}>
            <PageShell>
                <PageHeader
                    title={copy.title}
                    extra={
                        <Button type="primary" onClick={openCreate}>
                            {copy.addProfile}
                        </Button>
                    }
                />
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={profiles} pagination={false} />
                </Card>
                <Drawer
                    title={editing ? copy.editProfile : copy.addProfile}
                    open={open}
                    onClose={() => {
                        setOpen(false);
                        setEditing(null);
                    }}
                    size={520}
                    destroyOnHidden
                >
                    <Form layout="vertical" form={form} onFinish={onSubmit}>
                        <Form.Item name="name" label={copy.name} rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="pattern"
                            label={copy.pattern}
                            rules={[{ required: true }]}
                            extra={copy.patternHelp}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item name="reset_policy" label={copy.resetPolicy} initialValue="yearly">
                            <Select
                                options={[
                                    { label: copy.yearly, value: "yearly" },
                                    { label: copy.monthly, value: "monthly" },
                                    { label: copy.never, value: "never" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="prefix" label={copy.prefix}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="suffix" label={copy.suffix}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="is_active" label={copy.active} valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button
                                onClick={() => {
                                    setOpen(false);
                                    setEditing(null);
                                }}
                            >
                                {copy.cancel}
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editing ? copy.update : copy.save}
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
            </PageShell>
        </AppLayout>
    );
}
