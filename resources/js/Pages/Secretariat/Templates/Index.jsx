import React, { useMemo, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Switch, Table, Typography } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

export default function TemplatesIndex() {
    const { props, url } = usePage();
    const { templates = [], numberingProfiles = [] } = props;
    const [open, setOpen] = useState(false);
    const [openNumbering, setOpenNumbering] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editingNumbering, setEditingNumbering] = useState(null);
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
        if (editingTemplate) {
            router.patch(route("secretariat.templates.update", editingTemplate.id), values);
        } else {
            router.post(route("secretariat.templates.store"), values);
        }
        setOpen(false);
        setEditingTemplate(null);
        form.resetFields();
    };

    const onSubmitNumbering = (values) => {
        if (editingNumbering) {
            router.patch(route("secretariat.numbering.update", editingNumbering.id), values);
        } else {
            router.post(route("secretariat.numbering.store"), values);
        }
        setOpenNumbering(false);
        setEditingNumbering(null);
        numberingForm.resetFields();
    };

    //EXAMPLE TEMPLATE DATA
    const templateExample = {
        name: "Surat Pengantar Melanjutkan Pendidikan/PPDS",
        classification: "Rekomendasi",
        code: "SURAT_PENGANTAR_PPDS",
        content_text: `
<div style="text-align:center;">
  <strong>IKATAN DOKTER INDONESIA</strong><br/>
  <span>(THE INDONESIAN MEDICAL ASSOCIATION)</span><br/>
  <strong>PENGURUS CABANG {{org.city}}</strong><br/>
  <span>Sekretariat: {{org.address}}</span><br/>
  <span>Telp: {{org.phone}} | Email: {{org.email}}</span>
</div>
<hr/>
<table style="width:100%; margin-top:8px;">
  <tr><td style="width:20%;">Nomor</td><td>: {{letter.number}}</td></tr>
  <tr><td>Lampiran</td><td>: {{letter.attachment}}</td></tr>
  <tr><td>Perihal</td><td>: {{letter.subject}}</td></tr>
</table>
<br/>
<p>Kepada Yth.<br/>Ketua PPDS I ({{ppds.program}})<br/>{{ppds.university}}</p>
<p>Bersama ini kami sampaikan Surat Rekomendasi Melanjutkan Pendidikan Spesialisasi atas nama:</p>
<table style="width:100%;">
  <tr><td style="width:25%;">Nama</td><td>: {{doctor.name}}</td></tr>
  <tr><td>Status</td><td>: {{doctor.status}}</td></tr>
  <tr><td>Alamat rumah</td><td>: {{doctor.address}}</td></tr>
  <tr><td>Alamat bekerja</td><td>: {{doctor.work_address}}</td></tr>
  <tr><td>Anggota IDI Cabang</td><td>: {{doctor.branch}}</td></tr>
  <tr><td>NPA IDI</td><td>: {{doctor.npa}}</td></tr>
</table>
<p>Yang bersangkutan akan melanjutkan Program Pendidikan Spesialis {{ppds.program}} di {{ppds.faculty}}, dengan alamat perkuliahan:</p>
<table style="width:100%;">
  <tr><td style="width:25%;">Instansi Pendidikan</td><td>: {{ppds.university}}</td></tr>
  <tr><td>Alamat perkuliahan</td><td>: {{ppds.campus_address}}</td></tr>
</table>
<p>Demikian surat ini kami sampaikan. Atas perhatiannya kami ucapkan terima kasih.</p>
<br/>
<table style="width:100%;">
  <tr>
    <td style="width:50%;">{{letter.city}}, {{letter.date}}<br/>Ketua IDI Cabang,<br/><br/><br/>{{signer.chairman}}</td>
    <td style="width:50%;">Sekretaris,<br/><br/><br/>{{signer.secretary}}</td>
  </tr>
</table>
<p><strong>Tembusan:</strong><br/>{{letter.cc_list}}</p>
        `.trim(),
        placeholders_schema_json: [
            "org.city",
            "org.address",
            "org.phone",
            "org.email",
            "letter.number",
            "letter.attachment",
            "letter.subject",
            "letter.city",
            "letter.date",
            "letter.cc_list",
            "ppds.program",
            "ppds.university",
            "ppds.faculty",
            "ppds.campus_address",
            "doctor.name",
            "doctor.status",
            "doctor.address",
            "doctor.work_address",
            "doctor.branch",
            "doctor.npa",
            "signer.chairman",
            "signer.secretary",
        ],
        paper: "A4",
        is_active: true,
    };

    const applyTemplateExample = () => {
        form.setFieldsValue(templateExample);
        setEditingTemplate(null);
        setOpen(true);
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
        {
            title: "Aksi",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            setEditingTemplate(record);
                            form.setFieldsValue({
                                name: record.name,
                                code: record.code,
                                classification: record.classification,
                                numbering_profile_id: record.numbering_profile_id,
                                content_text: record.content_text,
                                placeholders_schema_json: record.placeholders_schema_json,
                                paper: record.paper,
                                is_active: record.is_active,
                            });
                            setOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Hapus template ini?"
                        okText="Hapus"
                        cancelText="Batal"
                        onConfirm={() => router.delete(route("secretariat.templates.destroy", record.id))}
                    >
                        <Button size="small" danger>
                            Hapus
                        </Button>
                    </Popconfirm>
                </Space>
            ),
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
            title: "Aksi",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            setEditingNumbering(record);
                            numberingForm.setFieldsValue({
                                name: record.name,
                                pattern: record.pattern,
                                reset_policy: record.reset_policy,
                                prefix: record.prefix,
                                suffix: record.suffix,
                                is_active: record.is_active,
                            });
                            setOpenNumbering(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Hapus profil penomoran ini?"
                        okText="Hapus"
                        cancelText="Batal"
                        onConfirm={() => router.delete(route("secretariat.numbering.destroy", record.id))}
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
        <AppLayout title="Sekretariat - Template Surat">
            <PageShell>
                <PageHeader
                    title="Template Surat"
                    extra={
                        <Space>
                            <Button
                                onClick={() => {
                                    setEditingNumbering(null);
                                    numberingForm.resetFields();
                                    setOpenNumbering(true);
                                }}
                            >
                                Tambah Penomoran
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => {
                                    setEditingTemplate(null);
                                    form.resetFields();
                                    setOpen(true);
                                }}
                            >
                                Tambah Template
                            </Button>
                        </Space>
                    }
                />
                <Card style={{ borderRadius: 12, marginBottom: 16 }}>
                    <Space direction="vertical" style={{ width: "100%" }} size={4}>
                        <Typography.Title level={5} style={{ margin: 0 }}>
                            Contoh Template Surat Rekomendasi
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Gunakan contoh ini untuk membuat template surat rekomendasi seperti pada dokumen
                            yang Anda lampirkan. Anda tetap bisa menyesuaikan placeholder dan format HTML.
                        </Typography.Text>
                        <Button onClick={applyTemplateExample}>Gunakan Contoh Template</Button>
                    </Space>
                </Card>
                <Card style={{ borderRadius: 12 }}>
                    <Table rowKey="id" columns={columns} dataSource={templates} pagination={false} />
                </Card>
                <Card style={{ borderRadius: 12, marginTop: 16 }}>
                    <Space style={{ marginBottom: 12, width: "100%", justifyContent: "space-between" }}>
                        <Typography.Title level={5} style={{ margin: 0 }}>
                            Penomoran Surat
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            Kelola profil penomoran tanpa keluar dari halaman ini.
                        </Typography.Text>
                    </Space>
                    <Table
                        rowKey="id"
                        columns={numberingColumns}
                        dataSource={numberingProfiles}
                        pagination={false}
                    />
                </Card>

                <Drawer
                    title={editingTemplate ? "Edit Template" : "Tambah Template"}
                    open={open}
                    onClose={() => {
                        setOpen(false);
                        setEditingTemplate(null);
                        form.resetFields();
                    }}
                    width={520}
                    destroyOnClose
                >
                    <Form layout="vertical" form={form} onFinish={onSubmit}>
                        <Form.Item name="name" label="Nama" rules={[{ required: true }]}>
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
                                {editingTemplate ? "Perbarui" : "Simpan"}
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
                <Drawer
                    title={editingNumbering ? "Edit Profil Penomoran" : "Tambah Profil Penomoran"}
                    open={openNumbering}
                    onClose={() => {
                        setOpenNumbering(false);
                        setEditingNumbering(null);
                        numberingForm.resetFields();
                    }}
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
                                {editingNumbering ? "Perbarui" : "Simpan"}
                            </Button>
                        </Space>
                    </Form>
                </Drawer>
            </PageShell>
        </AppLayout>
    );
}