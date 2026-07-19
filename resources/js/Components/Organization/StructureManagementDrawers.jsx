import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
    ApartmentOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    UnorderedListOutlined,
    UserOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    Drawer,
    Empty,
    Form,
    Input,
    InputNumber,
    Popconfirm,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    message,
} from "antd";
import { notifyOrganizationDataChanged } from "@/Components/Organization/events";
import useBilingual from "@/Hooks/useBilingual";

const UNIT_TYPE_OPTIONS = [
    ["core", "Pengurus Inti"],
    ["board", "Dewan"],
    ["council", "Majelis"],
    ["assembly", "Majelis / Assembly"],
    ["bureau", "Biro"],
    ["department", "Departemen"],
    ["division", "Divisi"],
    ["field", "Bidang"],
    ["committee", "Komisi"],
    ["subdivision", "Subbidang"],
    ["other", "Unit Lain"],
].map(([value, label]) => ({ value, label }));

function applyServerErrors(form, error) {
    const errors = error.response?.data?.errors || {};
    form.setFields(Object.entries(errors).map(([name, messages]) => ({
        name,
        errors: Array.isArray(messages) ? messages : [String(messages)],
    })));

    return error.response?.data?.message || "Data struktur gagal disimpan.";
}

export function UnitFormDrawer({ open, unit = null, parentId = null, period, unitOptions = [], onClose, onSaved }) {
    const { tx } = useBilingual();
    const unitTypeOptions = UNIT_TYPE_OPTIONS.map((option) => ({
        ...option,
        label: ({ core: tx("Pengurus Inti", "Core Management"), board: tx("Dewan", "Board"), council: tx("Majelis", "Council"), assembly: tx("Majelis", "Assembly"), bureau: tx("Biro", "Bureau"), department: tx("Departemen", "Department"), division: tx("Divisi", "Division"), field: tx("Bidang", "Field"), committee: tx("Komisi", "Committee"), subdivision: tx("Subbidang", "Subdivision"), other: tx("Unit Lain", "Other Unit") })[option.value],
    }));
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const editing = Boolean(unit);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        form.setFieldsValue(editing ? {
            parent_id: unit.parent_id || undefined,
            name: unit.name,
            code: unit.code || "",
            unit_type: unit.unit_type,
            description: unit.description || "",
            display_order: unit.display_order || 0,
            is_core_structure: Boolean(unit.is_core_structure),
        } : {
            parent_id: parentId || undefined,
            unit_type: "field",
            display_order: 0,
            is_core_structure: false,
        });
    }, [editing, form, open, parentId, unit]);

    const submit = async (values) => {
        setSubmitting(true);
        try {
            if (editing) await axios.patch(route("organization.units.update", unit.id), values);
            else await axios.post(route("organization.periods.units.store", period.id), values);

            message.success(editing ? tx("Unit berhasil diperbarui.", "Unit updated successfully.") : tx("Unit berhasil ditambahkan.", "Unit added successfully."));
            notifyOrganizationDataChanged(period.id);
            onSaved?.();
            onClose?.();
        } catch (error) {
            message.error(applyServerErrors(form, error));
        } finally {
            setSubmitting(false);
        }
    };

    const deactivate = async () => {
        setDeactivating(true);
        try {
            await axios.post(route("organization.units.deactivate", unit.id));
            message.success(tx("Unit berhasil dinonaktifkan.", "Unit deactivated successfully."));
            notifyOrganizationDataChanged(period.id);
            onSaved?.();
            onClose?.();
        } catch (error) {
            message.error(error.response?.data?.errors?.unit?.[0] || error.response?.data?.message || tx("Unit tidak dapat dinonaktifkan.", "The unit could not be deactivated."));
        } finally {
            setDeactivating(false);
        }
    };

    const parentOptions = unitOptions.filter((option) => option.value !== unit?.id);
    const assignmentCount = (unit?.positions || []).filter((position) => position.assignment).length;

    return (
        <Drawer
            rootClassName="organization-management-drawer"
            title={<Space><ApartmentOutlined /><span>{editing ? tx("Edit Struktur Unit", "Edit Unit Structure") : parentId ? tx("Tambah Subunit", "Add Subunit") : tx("Tambah Unit", "Add Unit")}</span></Space>}
            open={open}
            onClose={onClose}
            size={600}
            destroyOnHidden
            maskClosable={!submitting && !deactivating}
        >
            {editing ? (
                <Alert
                    className="mb-5"
                    type="info"
                    showIcon
                    message={tx("Dependensi unit", "Unit dependencies")}
                    description={`${unit.children_count || 0} ${tx("subunit", "child units")}, ${unit.positions_count || 0} ${tx("posisi", "positions")}, ${tx("dan", "and")} ${assignmentCount} ${tx("penugasan berjalan. Unit dengan dependensi aktif tidak dapat dinonaktifkan.", "active assignments. A unit with active dependencies cannot be deactivated.")}`}
                />
            ) : null}

            <Form form={form} layout="vertical" onFinish={submit} scrollToFirstError requiredMark="optional">
                <Form.Item label={tx("Nama Unit / Bidang", "Unit / Division Name")} name="name" rules={[{ required: true, message: tx("Nama unit wajib diisi.", "The unit name is required.") }]}>
                    <Input maxLength={255} autoComplete="off" />
                </Form.Item>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Form.Item label={tx("Kode", "Code")} name="code">
                        <Input maxLength={255} placeholder={tx("Opsional", "Optional")} />
                    </Form.Item>
                    <Form.Item label={tx("Tipe Unit", "Unit Type")} name="unit_type" rules={[{ required: true, message: tx("Tipe unit wajib dipilih.", "A unit type is required.") }]}>
                        <Select showSearch optionFilterProp="label" options={unitTypeOptions} />
                    </Form.Item>
                </div>
                <Form.Item label={tx("Unit Induk", "Parent Unit")} name="parent_id" extra={tx("Kosongkan untuk menjadikan unit sebagai akar organisasi.", "Leave blank to make this unit an organization root.")}>
                    <Select allowClear showSearch optionFilterProp="label" placeholder={tx("Akar organisasi", "Organization root")} options={parentOptions} />
                </Form.Item>
                <Form.Item label={tx("Deskripsi", "Description")} name="description">
                    <Input.TextArea rows={4} maxLength={5000} showCount />
                </Form.Item>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Form.Item label={tx("Urutan Tampilan", "Display Order")} name="display_order" rules={[{ required: true, message: tx("Urutan wajib diisi.", "The order is required.") }]}>
                        <InputNumber min={0} className="w-full" />
                    </Form.Item>
                    <Form.Item label={tx("Struktur Inti", "Core Structure")} name="is_core_structure" valuePropName="checked">
                        <Switch checkedChildren={tx("Ya", "Yes")} unCheckedChildren={tx("Tidak", "No")} />
                    </Form.Item>
                </div>

                <div className="sticky bottom-0 mt-6 flex flex-wrap justify-between gap-3 border-t border-zinc-200 bg-white/95 py-4 backdrop-blur">
                    <div>
                        {editing ? (
                            <Popconfirm
                                title={tx("Nonaktifkan unit?", "Deactivate unit?")}
                                description="Backend akan menolak jika masih terdapat child unit, posisi, atau assignment aktif."
                                okText={tx("Nonaktifkan", "Deactivate")}
                                cancelText={tx("Batal", "Cancel")}
                                onConfirm={deactivate}
                            >
                                <Button danger icon={<DeleteOutlined />} loading={deactivating}>{tx("Nonaktifkan", "Deactivate")}</Button>
                            </Popconfirm>
                        ) : null}
                    </div>
                    <Space>
                        <Button onClick={onClose} disabled={submitting}>{tx("Batal", "Cancel")}</Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>{editing ? tx("Simpan Perubahan", "Save Changes") : tx("Tambah Unit", "Add Unit")}</Button>
                    </Space>
                </div>
            </Form>
        </Drawer>
    );
}

function positionInitials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || <UserOutlined />;
}

export function PositionManagerDrawer({ open, unit, period, positionOptions = [], onClose, onSaved }) {
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState(null);

    const loadPositions = useCallback(async () => {
        if (!unit?.id) return;
        setLoading(true);
        try {
            const response = await axios.get(route("organization.units.positions.index", unit.id));
            setPositions(response.data?.data || []);
        } catch (error) {
            message.error(error.response?.data?.message || tx("Daftar posisi gagal dimuat.", "The position list could not be loaded."));
        } finally {
            setLoading(false);
        }
    }, [unit?.id]);

    useEffect(() => {
        if (!open) return;
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ display_order: 0, is_required: false });
        loadPositions();
    }, [form, loadPositions, open]);

    const startEdit = (position) => {
        setEditing(position);
        form.setFieldsValue({
            position_id: position.position_id,
            custom_title: position.custom_title || "",
            display_order: position.display_order,
            is_required: Boolean(position.is_required),
        });
    };

    const resetForm = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ display_order: positions.length, is_required: false });
    };

    const submit = async (values) => {
        setSubmitting(true);
        try {
            if (editing) await axios.patch(route("organization.unit-positions.update", editing.id), values);
            else await axios.post(route("organization.units.positions.store", unit.id), values);
            message.success(editing ? tx("Posisi berhasil diperbarui.", "Position updated successfully.") : tx("Posisi berhasil ditambahkan.", "Position added successfully."));
            resetForm();
            await loadPositions();
            notifyOrganizationDataChanged(period.id);
            onSaved?.();
        } catch (error) {
            message.error(applyServerErrors(form, error));
        } finally {
            setSubmitting(false);
        }
    };

    const deactivate = async (position) => {
        try {
            await axios.post(route("organization.unit-positions.deactivate", position.id));
            message.success(tx("Posisi berhasil dinonaktifkan.", "Position deactivated successfully."));
            await loadPositions();
            notifyOrganizationDataChanged(period.id);
            onSaved?.();
        } catch (error) {
            message.error(error.response?.data?.errors?.unit_position?.[0] || error.response?.data?.message || tx("Posisi tidak dapat dinonaktifkan.", "The position could not be deactivated."));
        }
    };

    return (
        <Drawer
            rootClassName="organization-management-drawer"
            title={<Space><UnorderedListOutlined /><span>{tx("Kelola Posisi", "Manage Positions")} · {unit?.name || tx("Unit", "Unit")}</span></Space>}
            open={open}
            onClose={onClose}
            size={720}
            destroyOnHidden
        >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.75fr)]">
                <div>
                    <h3 className="mb-3 font-semibold text-zinc-950">{tx("Posisi pada Unit", "Unit Positions")}</h3>
                    {loading ? (
                        <div className="flex min-h-48 items-center justify-center"><Spin /></div>
                    ) : positions.length > 0 ? (
                        <div className="space-y-3">
                            {positions.map((position) => (
                                <Card key={position.id} size="small" className={!position.is_active ? "opacity-60" : ""}>
                                    <div className="flex items-start gap-3">
                                        <Avatar className={position.assignment ? "bg-zinc-900" : "bg-zinc-300"}>{positionInitials(position.assignment?.member?.full_name)}</Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-zinc-950">{position.title}</p>
                                                    <p className="mt-1 text-sm text-zinc-500">{position.assignment?.member?.full_name || tx("Posisi kosong", "Vacant position")}</p>
                                                </div>
                                                <Space wrap>
                                                    {position.is_required ? <Tag color="red">{tx("Wajib", "Required")}</Tag> : null}
                                                    <Tag color={position.is_active ? "green" : "default"}>{position.is_active ? tx("Aktif", "Active") : tx("Nonaktif", "Inactive")}</Tag>
                                                </Space>
                                            </div>
                                            {position.is_active ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(position)}>{tx("Edit", "Edit")}</Button>
                                                    <Popconfirm
                                                        title={tx("Nonaktifkan posisi?", "Deactivate position?")}
                                                        description={position.assignment ? tx("Posisi masih memiliki penugasan dan kemungkinan akan ditolak.", "The position still has an assignment and may be rejected.") : tx("Posisi tidak akan ditampilkan untuk penugasan baru.", "The position will not be shown for new assignments.")}
                                                        onConfirm={() => deactivate(position)}
                                                    >
                                                        <Button size="small" danger icon={<DeleteOutlined />}>{tx("Nonaktifkan", "Deactivate")}</Button>
                                                    </Popconfirm>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tx("Belum ada posisi pada unit ini.", "This unit has no positions yet.")} />}
                </div>

                <Card className="h-fit border-zinc-200" title={editing ? tx("Edit Posisi", "Edit Position") : tx("Tambah Posisi", "Add Position")}>
                    <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional">
                        <Form.Item label={tx("Master Jabatan", "Position Master")} name="position_id" rules={[{ required: true, message: tx("Master jabatan wajib dipilih.", "A position master is required.") }]}>
                            <Select showSearch optionFilterProp="label" placeholder={tx("Pilih jabatan", "Select position")} options={positionOptions} />
                        </Form.Item>
                        <Form.Item label={tx("Judul Kustom", "Custom Title")} name="custom_title" extra={tx("Kosongkan untuk menggunakan nama master jabatan.", "Leave blank to use the position master name.")}>
                            <Input maxLength={255} />
                        </Form.Item>
                        <Form.Item label={tx("Urutan", "Order")} name="display_order" rules={[{ required: true, message: tx("Urutan wajib diisi.", "The order is required.") }]}>
                            <InputNumber min={0} className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Posisi Wajib", "Required Position")} name="is_required" valuePropName="checked">
                            <Switch checkedChildren={tx("Wajib", "Required")} unCheckedChildren={tx("Opsional", "Optional")} />
                        </Form.Item>
                        <div className="flex flex-wrap justify-end gap-2">
                            {editing ? <Button onClick={resetForm}>{tx("Batal Edit", "Cancel Edit")}</Button> : null}
                            <Button type="primary" htmlType="submit" loading={submitting} icon={editing ? <EditOutlined /> : <PlusOutlined />}>
                                {editing ? tx("Simpan", "Save") : tx("Tambah Posisi", "Add Position")}
                            </Button>
                        </div>
                    </Form>
                </Card>
            </div>
        </Drawer>
    );
}
