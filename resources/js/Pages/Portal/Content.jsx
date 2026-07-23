import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import {
    Button,
    Form,
    Image,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Upload,
    message,
} from "antd";
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    UploadOutlined,
} from "@ant-design/icons";

const SECTION_LABELS = {
    slider: "Slider",
    about: "Tentang IDI",
    vision_mission: "Visi Misi",
    service: "Layanan Anggota",
    leader: "Pengurus",
    contact: "Kontak Sekretariat",
};

const SECTION_HINTS = {
    slider: "Judul, teks hero, gambar, dan tombol ajakan.",
    about: "Profil singkat organisasi dan gambar pendamping.",
    vision_mission: "Visi di deskripsi, misi ditulis per baris.",
    service: "Daftar layanan anggota yang tampil sebagai kartu.",
    leader: "Data pengurus manual. Jika kosong, landing page mengambil pengurus aktif dari modul organisasi.",
    contact: "Kontak sekretariat, tautan tombol kontak, dan link media sosial footer.",
};

const CONTACT_FIELDS = [
    "address",
    "phone",
    "whatsapp",
    "email",
    "service_hours",
    "map_url",
    "instagram_url",
    "facebook_url",
    "youtube_url",
];

export default function PortalContent() {
    const { props } = usePage();
    const contents = props.contents || [];
    const sections = props.sections || Object.keys(SECTION_LABELS);
    const permissions = props.auth?.permissions || [];
    const canManage = permissions.includes("portal.manage");
    const [activeSection, setActiveSection] = useState(sections[0] || "slider");
    const [modal, setModal] = useState({ open: false, record: null });
    const [fileList, setFileList] = useState([]);
    const [form] = Form.useForm();
    const selectedSection = Form.useWatch("section", form) || activeSection;
    const isContactSection = selectedSection === "contact";

    const grouped = useMemo(
        () =>
            contents.reduce((acc, item) => {
                acc[item.section] ||= [];
                acc[item.section].push(item);
                return acc;
            }, {}),
        [contents],
    );

    const openModal = (record = null, section = activeSection) => {
        setModal({ open: true, record });
        setFileList([]);
        form.setFieldsValue({
            section,
            title: record?.title || "",
            subtitle: record?.subtitle || "",
            content: record?.content || "",
            items_text: record?.items_text || "",
            button_label: record?.button_label || "",
            button_url: record?.button_url || "",
            address: record?.address || "",
            phone: record?.phone || "",
            whatsapp: record?.whatsapp || "",
            email: record?.email || "",
            service_hours: record?.service_hours || "",
            map_url: record?.map_url || "",
            instagram_url: record?.instagram_url || "",
            facebook_url: record?.facebook_url || "",
            youtube_url: record?.youtube_url || "",
            sort_order: record?.sort_order || 0,
            is_active: record?.is_active ?? true,
        });
    };

    const closeModal = () => {
        setModal({ open: false, record: null });
        setFileList([]);
        form.resetFields();
    };

    const submit = async () => {
        try {
            const values = await form.validateFields();
            const fd = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (values.section !== "contact" && CONTACT_FIELDS.includes(key)) return;
                if (value === undefined || value === null) return;
                fd.append(key, value === true ? "1" : value === false ? "0" : String(value));
            });

            const file = fileList?.[0]?.originFileObj;
            if (file) fd.append("image", file);

            const record = modal.record;
            const url = record
                ? route("portal-idi.contents.update", record.id)
                : route("portal-idi.contents.store");

            if (record) fd.append("_method", "patch");

            router.post(url, fd, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    message.success(record ? "Konten diperbarui." : "Konten ditambahkan.");
                    closeModal();
                },
            });
        } catch {}
    };

    const remove = (record) => {
        Modal.confirm({
            title: "Hapus konten portal?",
            content: record.title || SECTION_LABELS[record.section],
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(route("portal-idi.contents.destroy", record.id), {
                    preserveScroll: true,
                    onSuccess: () => message.success("Konten dihapus."),
                }),
        });
    };

    const columns = [
        {
            title: "Konten",
            dataIndex: "title",
            render: (_, record) => (
                <div className="flex min-w-0 items-center gap-3">
                    {record.image_url ? (
                        <Image
                            src={record.image_url}
                            width={72}
                            height={48}
                            className="rounded-md object-cover"
                            preview={{ mask: <EyeOutlined /> }}
                        />
                    ) : (
                        <div className="h-12 w-[72px] rounded-md bg-zinc-100" />
                    )}
                    <div className="min-w-0">
                        <p className="mb-0 truncate font-semibold text-zinc-900">
                            {record.title || "-"}
                        </p>
                        <p className="mb-0 truncate text-xs text-zinc-500">
                            {record.subtitle || record.content || "-"}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            title: "Urutan",
            dataIndex: "sort_order",
            width: 90,
        },
        {
            title: "Status",
            dataIndex: "is_active",
            width: 110,
            render: (active) =>
                active ? <Tag color="green">Aktif</Tag> : <Tag>Tersembunyi</Tag>,
        },
        {
            title: "Aksi",
            width: 130,
            render: (_, record) =>
                canManage ? (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
                        <Button danger icon={<DeleteOutlined />} onClick={() => remove(record)} />
                    </Space>
                ) : null,
        },
    ];

    return (
        <AppLayout title="Portal IDI">
            <PageShell>
                <PageHeader
                    title="Konten Landing Page"
                    description="Kelola slider, profil organisasi, visi misi, layanan anggota, dan pengurus untuk halaman public."
                    extra={
                        canManage ? (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => openModal(null, activeSection)}
                            >
                                Tambah Konten
                            </Button>
                        ) : null
                    }
                />

                <Tabs
                    activeKey={activeSection}
                    onChange={setActiveSection}
                    items={sections.map((section) => ({
                        key: section,
                        label: SECTION_LABELS[section] || section,
                        children: (
                            <div className="rounded-lg border border-zinc-200 bg-white p-4">
                                <p className="mb-4 text-sm text-zinc-500">
                                    {SECTION_HINTS[section]}
                                </p>
                                <Table
                                    rowKey="id"
                                    columns={columns}
                                    dataSource={grouped[section] || []}
                                    pagination={false}
                                    scroll={{ x: true }}
                                />
                            </div>
                        ),
                    }))}
                />
            </PageShell>

            <Modal
                title={modal.record ? "Edit Konten" : "Tambah Konten"}
                open={modal.open}
                onCancel={closeModal}
                onOk={submit}
                okText="Simpan"
                cancelText="Batal"
                width={760}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="section" label="Section" rules={[{ required: true }]}>
                        <Select
                            options={sections.map((section) => ({
                                value: section,
                                label: SECTION_LABELS[section] || section,
                            }))}
                        />
                    </Form.Item>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item name="title" label="Judul">
                            <Input maxLength={180} />
                        </Form.Item>
                        <Form.Item name="subtitle" label="Subjudul / Jabatan">
                            <Input maxLength={180} />
                        </Form.Item>
                    </div>
                    <Form.Item name="content" label="Deskripsi">
                        <Input.TextArea rows={4} showCount maxLength={1200} />
                    </Form.Item>
                    <Form.Item
                        name="items_text"
                        label="Daftar item"
                        extra="Gunakan satu baris untuk satu misi, poin layanan tambahan, atau detail lain."
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item name="button_label" label="Label Tombol">
                            <Input maxLength={80} />
                        </Form.Item>
                        <Form.Item name="button_url" label="URL Tombol">
                            <Input maxLength={255} />
                        </Form.Item>
                    </div>
                    {isContactSection ? (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <p className="mb-4 text-sm font-semibold text-zinc-800">
                                Detail Kontak Sekretariat
                            </p>
                            <Form.Item name="address" label="Alamat">
                                <Input.TextArea rows={2} maxLength={500} />
                            </Form.Item>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Form.Item name="phone" label="Telepon">
                                    <Input maxLength={80} />
                                </Form.Item>
                                <Form.Item name="whatsapp" label="WhatsApp">
                                    <Input maxLength={80} />
                                </Form.Item>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Form.Item name="email" label="Email">
                                    <Input type="email" maxLength={180} />
                                </Form.Item>
                                <Form.Item name="service_hours" label="Jam Pelayanan">
                                    <Input maxLength={180} />
                                </Form.Item>
                            </div>
                            <Form.Item name="map_url" label="Link Lokasi / Google Maps">
                                <Input maxLength={255} />
                            </Form.Item>
                            <div className="grid gap-4 md:grid-cols-3">
                                <Form.Item name="instagram_url" label="Instagram">
                                    <Input maxLength={255} />
                                </Form.Item>
                                <Form.Item name="facebook_url" label="Facebook">
                                    <Input maxLength={255} />
                                </Form.Item>
                                <Form.Item name="youtube_url" label="YouTube">
                                    <Input maxLength={255} />
                                </Form.Item>
                            </div>
                        </div>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item name="sort_order" label="Urutan">
                            <InputNumber min={0} className="w-full" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Status"
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="Aktif" unCheckedChildren="Sembunyi" />
                        </Form.Item>
                    </div>
                    <Form.Item label="Gambar">
                        <Upload
                            beforeUpload={() => false}
                            fileList={fileList}
                            maxCount={1}
                            listType="picture"
                            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />}>Pilih Gambar</Button>
                        </Upload>
                        {modal.record?.image_url ? (
                            <p className="mt-2 text-xs text-zinc-500">
                                Kosongkan jika tidak ingin mengganti gambar saat ini.
                            </p>
                        ) : null}
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
