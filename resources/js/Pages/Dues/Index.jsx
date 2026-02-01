import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import {
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    StopOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

function formatIDR(value) {
    try {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(value || 0);
    } catch {
        return `Rp ${String(value || 0)}`;
    }
}

function formatPeriod(period) {
    if (!period) return "—";
    return dayjs(`${period}-01`).format("YYYY-MM");
}

export default function DuesIndex() {
    const { props } = usePage();
    const dues = props.dues?.data || [];
    const meta = props.dues?.meta || {};
    const filters = props.filters || {};
    const summary = props.summary || {};
    const members = props.members || [];
    const activePeriod = props.active_period;
    const activePeriodLabel = props.active_period_label;
    const monthlyAmount = props.monthly_amount || 0;
    const memberStatusLabel = {
        aktif: "Aktif",
        mutasi: "Mutasi",
        meninggal: "Meninggal",
    };

    const [searchValue, setSearchValue] = useState(filters.search || "");
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [voidingPayment, setVoidingPayment] = useState(null);

    const [paymentForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [voidForm] = Form.useForm();

    const canManage = props?.auth?.permissions?.includes("dues.manage");
    const canVoid = props?.auth?.permissions?.includes("dues.void");
    const membersById = useMemo(
        () => new Map(members.map((member) => [member.id, member])),
        [members],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== (filters.search || "")) {
                applyFilters({ search: searchValue, page: 1 });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchValue]);

    useEffect(() => {
        setSearchValue(filters.search || "");
    }, [filters.search]);

    const applyFilters = (next) => {
        router.get(
            route("dues.index"),
            { ...filters, ...next },
            { preserveState: true, replace: true },
        );
    };

    const openPaymentDrawer = (row = null) => {
        const startPeriod = row?.due_now
            ? dayjs(`${row.due_now}-01`)
            : dayjs(`${activePeriod}-01`);
        paymentForm.setFieldsValue({
            member_id: row?.member_id || undefined,
            start_period: startPeriod,
            duration: 1,
            method: "cash",
            paid_at: dayjs(),
            reference_no: "",
            notes: "",
        });
        setPaymentOpen(true);
    };

    const handleMemberChange = (memberId) => {
        const member = membersById.get(memberId);
        const startPeriod = member?.due_now
            ? dayjs(`${member.due_now}-01`)
            : dayjs(`${activePeriod}-01`);
        paymentForm.setFieldsValue({ start_period: startPeriod });
    };

    const submitPayment = async () => {
        try {
            const values = await paymentForm.validateFields();
            const payload = {
                member_id: values.member_id,
                start_period: values.start_period?.format("YYYY-MM"),
                duration: values.duration,
                method: values.method,
                paid_at: values.paid_at?.format("YYYY-MM-DD"),
                reference_no: values.reference_no,
                notes: values.notes,
            };

            router.post(route("dues.payments.store"), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success("Pembayaran iuran berhasil disimpan.");
                    setPaymentOpen(false);
                    paymentForm.resetFields();
                },
                onError: (errors) => {
                    if (errors?.payment) {
                        message.error(errors.payment);
                    }
                },
            });
        } catch {}
    };

    const openDetail = async (row) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailData(null);
        try {
            const { data } = await axios.get(
                route("dues.members.payments", row.member_id),
            );
            setDetailData(data);
        } catch {
            message.error("Gagal memuat detail pembayaran.");
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshDetail = async () => {
        if (!detailData?.member?.id) return;
        try {
            const { data } = await axios.get(
                route("dues.members.payments", detailData.member.id),
            );
            setDetailData(data);
        } catch {
            message.error("Gagal memperbarui detail pembayaran.");
        }
    };

    const openEditModal = (payment) => {
        setEditingPayment(payment);
        editForm.setFieldsValue({
            paid_at: payment.paid_at ? dayjs(payment.paid_at) : null,
            method: payment.method,
            reference_no: payment.reference_no,
            notes: payment.notes,
            reason: "",
        });
    };

    const submitEdit = async () => {
        try {
            const values = await editForm.validateFields();
            router.patch(
                route("dues.payments.update", editingPayment.id),
                {
                    paid_at: values.paid_at?.format("YYYY-MM-DD"),
                    method: values.method,
                    reference_no: values.reference_no,
                    notes: values.notes,
                    reason: values.reason,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success("Pembayaran berhasil diperbarui.");
                        setEditingPayment(null);
                        editForm.resetFields();
                        refreshDetail();
                    },
                    onError: (errors) => {
                        if (errors?.payment) {
                            message.error(errors.payment);
                        }
                    },
                },
            );
        } catch {}
    };

    const openVoidModal = (payment) => {
        setVoidingPayment(payment);
        voidForm.resetFields();
    };

    const submitVoid = async () => {
        try {
            const values = await voidForm.validateFields();
            router.post(
                route("dues.payments.void", voidingPayment.id),
                { reason: values.reason },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success("Pembayaran berhasil dibatalkan.");
                        setVoidingPayment(null);
                        voidForm.resetFields();
                        refreshDetail();
                    },
                    onError: (errors) => {
                        if (errors?.payment) {
                            message.error(errors.payment);
                        }
                    },
                },
            );
        } catch {}
    };

    const statusOptions = [
        { value: "ALL", label: "Semua" },
        { value: "LUNAS", label: "Lunas" },
        { value: "MENUNGGAK", label: "Menunggak" },
        { value: "ADVANCE", label: "Lebih Bayar" },
    ];

    const startPeriod = Form.useWatch("start_period", paymentForm);
    const duration = Form.useWatch("duration", paymentForm);

    const endPeriodLabel = useMemo(() => {
        if (!startPeriod || !duration) return "—";
        return startPeriod.add(duration - 1, "month").format("YYYY-MM");
    }, [startPeriod, duration]);

    const totalAmount = useMemo(() => {
        if (!duration) return 0;
        return duration * monthlyAmount;
    }, [duration, monthlyAmount]);

    const columns = [
        {
            title: "NPA",
            dataIndex: "npa",
            key: "npa",
            render: (value) => value || "—",
        },
        {
            title: "Nama",
            dataIndex: "full_name",
            key: "full_name",
            render: (value) => value || "—",
        },
        {
            title: "Status Anggota",
            dataIndex: "member_status",
            key: "member_status",
            render: (value) => memberStatusLabel[value] || value || "—",
        },
        {
            title: "Cara Bayar",
            dataIndex: "last_payment_method",
            key: "last_payment_method",
            render: (value) => value || "—",
        },
        {
            title: "Iuran Terakhir",
            dataIndex: "last_paid_period",
            key: "last_paid_period",
            render: (value) => formatPeriod(value),
        },
        {
            title: "Bulan Iuran Saat Ini",
            dataIndex: "due_now",
            key: "due_now",
            render: (value) => formatPeriod(value),
        },
        {
            title: "Kelebihan Iuran",
            dataIndex: "advance_months",
            key: "advance_months",
            render: (value) => value ?? 0,
        },
        {
            title: "Status Iuran",
            dataIndex: "status",
            key: "status",
            render: (_, row) => {
                if (row.status === "ADVANCE") {
                    return (
                        <Tag color="blue">
                            Lebih bayar {row.advance_months} bulan
                        </Tag>
                    );
                }
                if (row.status === "LUNAS") {
                    return <Tag color="green">Lunas</Tag>;
                }
                return (
                    <Tag color="red">Menunggak {row.arrears_months} bulan</Tag>
                );
            },
        },
        {
            title: "Aksi",
            key: "action",
            render: (_, row) => (
                <Space>
                    {row.status === "MENUNGGAK" ? (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => openPaymentDrawer(row)}
                                disabled={!canManage}
                            >
                                Bayar
                            </Button>
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => openDetail(row)}
                            >
                                Detail
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openDetail(row)}
                        >
                            Detail
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <AppLayout title="Iuran">
            <PageShell>
                <PageHeader
                    title="Manajemen Iuran Anggota"
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openPaymentDrawer()}
                            disabled={!canManage}
                        >
                            Input Pembayaran
                        </Button>
                    }
                />
                <Space
                    direction="vertical"
                    size={4}
                    style={{ marginBottom: 12 }}
                >
                    <Text type="secondary">
                        Periode Aktif: {activePeriodLabel}
                    </Text>
                    <Alert
                        type="info"
                        showIcon
                        message="Periode aktif otomatis mengikuti tanggal server."
                    />
                </Space>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={6}>
                        <Card
                            style={{ borderRadius: 12 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <Text type="secondary">Wajib Bayar</Text>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>
                                <span>{summary.total_members || 0}</span>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card
                            style={{ borderRadius: 12 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <Text type="secondary">Sudah Bayar</Text>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>
                                <span>{summary.paid_members || 0}</span>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card
                            style={{ borderRadius: 12 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <Text type="secondary">Belum Bayar</Text>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>
                                <span>{summary.unpaid_members || 0}</span>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card
                            style={{ borderRadius: 12 }}
                            bodyStyle={{ padding: 16 }}
                        >
                            <Text type="secondary">Total Tunggakan</Text>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>
                                <span>{formatIDR(summary.total_arrears)}</span>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card
                    style={{ borderRadius: 12, marginBottom: 12 }}
                    bodyStyle={{ padding: 12 }}
                >
                    <Space wrap size={16} style={{ width: "100%" }}>
                        <Space direction="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Cari Anggota
                            </Text>
                            <Input
                                allowClear
                                placeholder="NPA / Nama"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                style={{ width: 220 }}
                            />
                        </Space>

                        <Space direction="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Status Iuran
                            </Text>
                            <Select
                                options={statusOptions}
                                value={filters.status || "ALL"}
                                onChange={(value) =>
                                    applyFilters({ status: value, page: 1 })
                                }
                                style={{ width: 160 }}
                            />
                        </Space>

                        <Space direction="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Iuran Tertunggak
                            </Text>
                            <Select
                                value={filters.arrears_only ? "1" : ""}
                                onChange={(value) =>
                                    applyFilters({
                                        arrears_only: value === "1",
                                        page: 1,
                                    })
                                }
                                style={{ width: 180 }}
                                options={[
                                    { value: "", label: "Semua" },
                                    {
                                        value: "1",
                                        label: "Tunggakan > 1 bulan",
                                    },
                                ]}
                            />
                        </Space>

                        <Space direction="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Iuran Lebih Bayar
                            </Text>
                            <Select
                                value={filters.advance_only ? "1" : ""}
                                onChange={(value) =>
                                    applyFilters({
                                        advance_only: value === "1",
                                        page: 1,
                                    })
                                }
                                style={{ width: 180 }}
                                options={[
                                    { value: "", label: "Semua" },
                                    {
                                        value: "1",
                                        label: "Lebih bayar > 1 bulan",
                                    },
                                ]}
                            />
                        </Space>
                    </Space>
                </Card>

                <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                    <Table
                        columns={columns}
                        dataSource={dues}
                        rowKey="member_id"
                        pagination={{
                            current: meta.current_page || filters.page || 1,
                            total: meta.total || 0,
                            pageSize: meta.per_page || filters.perPage || 10,
                            onChange: (page, pageSize) =>
                                applyFilters({ page, perPage: pageSize }),
                        }}
                    />
                </Card>
            </PageShell>

            <Drawer
                open={paymentOpen}
                size="large"
                title="Input Pembayaran Iuran"
                onClose={() => {
                    setPaymentOpen(false);
                    paymentForm.resetFields();
                }}
                footer={
                    <Space
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <Button onClick={() => setPaymentOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            type="primary"
                            onClick={submitPayment}
                            disabled={!canManage}
                        >
                            Simpan
                        </Button>
                    </Space>
                }
            >
                <Form form={paymentForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label="Anggota"
                        name="member_id"
                        rules={[{ required: true, message: "Pilih anggota" }]}
                    >
                        <Select
                            showSearch={{ optionFilterProp: "label" }}
                            placeholder="Cari anggota"
                            onChange={handleMemberChange}
                            options={members.map((member) => ({
                                value: member.id,
                                label: `${member.npa} - ${member.full_name}`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label={
                            <>
                                <span style={{ color: "red" }}>*</span> Nominal
                                Bulanan
                            </>
                        }
                    >
                        <Input value={formatIDR(monthlyAmount)} readOnly />
                    </Form.Item>
                    <Form.Item
                        label={
                            <>
                                <span style={{ color: "red" }}>*</span> Mode
                                Alokasi
                            </>
                        }
                    >
                        <Input value="Rentang Periode" readOnly />
                    </Form.Item>
                    <Form.Item
                        label="Mulai Periode"
                        name="start_period"
                        rules={[
                            { required: true, message: "Pilih periode mulai" },
                        ]}
                    >
                        <DatePicker
                            picker="month"
                            style={{ width: "100%" }}
                            format="YYYY-MM"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Durasi (bulan)"
                        name="duration"
                        rules={[{ required: true, message: "Masukkan durasi" }]}
                    >
                        <InputNumber
                            min={1}
                            max={36}
                            style={{ width: "100%" }}
                        />
                    </Form.Item>
                    <Space wrap style={{ marginBottom: 12 }}>
                        {[3, 6, 12, 24].map((count) => (
                            <Button
                                key={count}
                                onClick={() =>
                                    paymentForm.setFieldsValue({
                                        duration: count,
                                    })
                                }
                            >
                                +{count}
                            </Button>
                        ))}
                    </Space>
                    <Form.Item
                        label={
                            <>
                                <span style={{ color: "red" }}>*</span> Periode
                                Akhir
                            </>
                        }
                    >
                        <Input value={endPeriodLabel} readOnly />
                    </Form.Item>
                    <Form.Item
                        label={
                            <>
                                <span style={{ color: "red" }}>*</span> Total
                            </>
                        }
                    >
                        <Input value={formatIDR(totalAmount)} readOnly />
                    </Form.Item>
                    <Form.Item
                        label="Metode"
                        name="method"
                        rules={[{ required: true, message: "Pilih metode" }]}
                    >
                        <Select
                            options={[
                                { value: "cash", label: "Cash" },
                                { value: "transfer", label: "Transfer" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Tanggal Bayar"
                        name="paid_at"
                        rules={[
                            { required: true, message: "Pilih tanggal bayar" },
                        ]}
                    >
                        <DatePicker
                            style={{ width: "100%" }}
                            format="DD-MM-YYYY"
                        />
                    </Form.Item>
                    <Form.Item label="No. Referensi" name="reference_no">
                        <Input placeholder="Opsional" />
                    </Form.Item>
                    <Form.Item label="Catatan" name="notes">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Drawer>

            <Drawer
                open={detailOpen}
                size="large"
                title="Detail Pembayaran"
                onClose={() => setDetailOpen(false)}
            >
                {detailLoading ? (
                    <Text>Memuat...</Text>
                ) : detailData ? (
                    <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size={12}
                    >
                        <Card size="small">
                            <Space
                                direction="vertical"
                                style={{ width: "100%" }}
                            >
                                <Text strong>
                                    {detailData.member?.full_name}
                                </Text>
                                <Text type="secondary">
                                    {detailData.member?.npa}
                                </Text>
                            </Space>
                        </Card>
                        <Card size="small" title="Riwayat Pembayaran">
                            <Table
                                size="small"
                                dataSource={detailData.payments || []}
                                rowKey="id"
                                pagination={false}
                                columns={[
                                    { title: "Tanggal", dataIndex: "paid_at" },
                                    {
                                        title: "Periode",
                                        render: (_, row) =>
                                            row.start_period
                                                ? `${row.start_period} - ${row.end_period}`
                                                : "—",
                                    },
                                    {
                                        title: "Nominal",
                                        dataIndex: "amount",
                                        render: (value) => formatIDR(value),
                                    },
                                    { title: "Metode", dataIndex: "method" },
                                    {
                                        title: "Status",
                                        render: (_, row) =>
                                            row.voided_at ? (
                                                <Tag color="red">Void</Tag>
                                            ) : (
                                                <Tag color="green">Aktif</Tag>
                                            ),
                                    },
                                    {
                                        title: "Aksi",
                                        render: (_, row) => (
                                            <Space>
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() =>
                                                        openEditModal(row)
                                                    }
                                                    disabled={
                                                        !canManage ||
                                                        row.voided_at
                                                    }
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={<StopOutlined />}
                                                    onClick={() =>
                                                        openVoidModal(row)
                                                    }
                                                    disabled={
                                                        !canVoid ||
                                                        row.voided_at
                                                    }
                                                >
                                                    Void
                                                </Button>
                                            </Space>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    </Space>
                ) : (
                    <Text type="secondary">Tidak ada data.</Text>
                )}
            </Drawer>

            <Modal
                open={!!editingPayment}
                title="Edit Pembayaran"
                onCancel={() => setEditingPayment(null)}
                onOk={submitEdit}
                okText="Simpan"
            >
                <Form form={editForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label="Tanggal Bayar"
                        name="paid_at"
                        rules={[
                            { required: true, message: "Pilih tanggal bayar" },
                        ]}
                    >
                        <DatePicker
                            style={{ width: "100%" }}
                            format="DD-MM-YYYY"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Metode"
                        name="method"
                        rules={[{ required: true, message: "Pilih metode" }]}
                    >
                        <Select
                            options={[
                                { value: "cash", label: "Cash" },
                                { value: "transfer", label: "Transfer" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="No. Referensi" name="reference_no">
                        <Input placeholder="Opsional" />
                    </Form.Item>
                    <Form.Item label="Catatan" name="notes">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        label="Alasan Edit"
                        name="reason"
                        rules={[
                            { required: true, message: "Masukkan alasan edit" },
                        ]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!voidingPayment}
                title="Void Pembayaran"
                onCancel={() => setVoidingPayment(null)}
                onOk={submitVoid}
                okText="Void"
                okButtonProps={{ danger: true }}
            >
                <Form form={voidForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label="Alasan Void"
                        name="reason"
                        rules={[
                            { required: true, message: "Masukkan alasan void" },
                        ]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
