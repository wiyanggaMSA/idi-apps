import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import dayjs from "dayjs";
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    message,
} from "antd";
import {
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    StopOutlined,
    UserOutlined,
} from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import StatCard from "@/Components/App/StatCard";
import FilterBar from "@/Components/App/FilterBar";
import SearchInput from "@/Components/App/SearchInput";
import DataTable from "@/Components/App/DataTable";
import StatusBadge from "@/Components/App/StatusBadge";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import LoadingSkeleton from "@/Components/App/LoadingSkeleton";
import FormSection from "@/Components/App/FormSection";
import EmptyState from "@/Components/App/EmptyState";
import { useI18n } from "@/Contexts/I18nContext";
import { formatDate, formatIDR, formatMonth, formatMonthCompact } from "@/lib/format";

const { TextArea } = Input;

export default function DuesIndex() {
    const { t, language } = useI18n();
    const isEn = language === "en";
    const { props } = usePage();
    const dues = props.dues?.data || [];
    const meta = props.dues?.meta || {};
    const filters = props.filters || {};
    const summary = props.summary || {};
    const members = props.members || [];
    const activePeriod = props.active_period;
    const activePeriodLabel = props.active_period_label;
    const duesStartPeriod = props.dues_start_period || activePeriod;
    const monthlyAmount = props.monthly_amount || 0;
    const copy = {
        eyebrow: isEn ? "Member Dues" : "Iuran Anggota",
        paymentSaved: isEn ? "Dues payment saved successfully." : "Pembayaran iuran berhasil disimpan.",
        paymentLoadFailed: isEn ? "Failed to load payment details." : "Gagal memuat detail pembayaran.",
        paymentRefreshFailed: isEn ? "Failed to refresh payment details." : "Gagal memperbarui detail pembayaran.",
        paymentUpdated: isEn ? "Payment updated successfully." : "Pembayaran berhasil diperbarui.",
        paymentVoided: isEn ? "Void request sent for approval." : "Pengajuan pembatalan dikirim untuk persetujuan.",
        member: isEn ? "Member" : "Anggota",
        memberStatus: isEn ? "Member Status" : "Status Anggota",
        lastPeriod: isEn ? "Last Period" : "Periode Terakhir",
        currentPeriod: isEn ? "Current Period" : "Periode Aktif",
        duesStatus: isEn ? "Dues Status" : "Status Iuran",
        lastMethod: isEn ? "Last Method" : "Metode Terakhir",
        actions: isEn ? "Actions" : "Aksi",
        pay: isEn ? "Pay" : "Bayar",
        detail: isEn ? "Detail" : "Detail",
        paidLabel: isEn ? "Paid" : "Lunas",
        advanceMonths: isEn ? "Advance for {count} months" : "Lebih bayar {count} bulan",
        overdueMonths: isEn ? "Overdue for {count} months" : "Menunggak {count} bulan",
        monthlyFee: isEn ? "Monthly dues {amount}" : "Iuran bulanan {amount}",
        paymentDrawerTitle: isEn ? "Enter Dues Payment" : "Input Pembayaran Iuran",
        cancel: isEn ? "Cancel" : "Batal",
        save: isEn ? "Save" : "Simpan",
        allocationInfo: isEn ? "Allocation Information" : "Informasi Alokasi",
        allocationDescription: isEn ? "Current active period {period} with monthly amount {amount}." : "Periode aktif saat ini {period} dengan nominal bulanan {amount}.",
        duesStartPeriodHint: isEn ? "Dues calculations start from {period}." : "Perhitungan iuran dimulai dari {period}.",
        monthlyAmount: isEn ? "Monthly Amount" : "Nominal Bulanan",
        selectMember: isEn ? "Select member" : "Pilih anggota",
        searchMember: isEn ? "Search member" : "Cari anggota",
        startPeriod: isEn ? "Start Period" : "Mulai Periode",
        selectStartPeriod: isEn ? "Select start period" : "Pilih periode mulai",
        duration: isEn ? "Duration (months)" : "Durasi (bulan)",
        enterDuration: isEn ? "Enter duration" : "Masukkan durasi",
        endPeriod: isEn ? "End Period" : "Periode Akhir",
        totalPayment: isEn ? "Total Payment" : "Total Pembayaran",
        method: isEn ? "Method" : "Metode",
        selectMethod: isEn ? "Select method" : "Pilih metode",
        paymentDate: isEn ? "Payment Date" : "Tanggal Bayar",
        selectPaymentDate: isEn ? "Select payment date" : "Pilih tanggal bayar",
        referenceNo: isEn ? "Reference No." : "No. Referensi",
        optional: isEn ? "Optional" : "Opsional",
        notes: isEn ? "Notes" : "Catatan",
        paymentDetail: isEn ? "Payment Details" : "Detail Pembayaran",
        phone: isEn ? "Phone" : "Telepon",
        education: isEn ? "Education" : "Pendidikan",
        paymentHistory: isEn ? "Payment History" : "Riwayat Pembayaran",
        paymentTransactions: isEn ? "Payment Records" : "Catatan Pembayaran",
        monthlyLedger: isEn ? "Monthly Dues History" : "Riwayat Iuran Bulanan",
        correctionHint: isEn
            ? "Edit payment metadata here. To correct period, duration, or amount, request void approval and record the payment again."
            : "Ubah tanggal, metode, referensi, atau catatan pembayaran di bagian ini. Jika periode, durasi, atau nominal salah, ajukan pembatalan untuk disetujui lalu input ulang pembayaran yang benar.",
        noPaymentsYet: isEn ? "No payments yet" : "Belum ada pembayaran",
        paymentHistoryHint: isEn ? "This member's payment history will appear here." : "Riwayat pembayaran anggota akan tampil di sini.",
        date: isEn ? "Date" : "Tanggal",
        period: isEn ? "Period" : "Periode",
        amount: isEn ? "Amount" : "Nominal",
        status: isEn ? "Status" : "Status",
        active: isEn ? "Active" : "Aktif",
        edit: isEn ? "Edit" : "Edit",
        noPaymentDetail: isEn ? "No payment detail available" : "Tidak ada detail pembayaran",
        noPaymentDetailDesc: isEn ? "Choose a member with payment history to view details." : "Pilih anggota yang memiliki riwayat pembayaran untuk melihat detail.",
        editPayment: isEn ? "Edit Payment" : "Ubah Pembayaran",
        editReason: isEn ? "Edit Reason" : "Alasan Perubahan",
        enterEditReason: isEn ? "Enter edit reason" : "Masukkan alasan perubahan",
        voidPayment: isEn ? "Request Payment Cancellation" : "Ajukan Pembatalan Pembayaran",
        voidReason: isEn ? "Cancellation Reason" : "Alasan Pembatalan",
        enterVoidReason: isEn ? "Enter cancellation reason" : "Masukkan alasan pembatalan",
        pendingApproval: isEn ? "Pending Approval" : "Menunggu Approval",
        requestVoid: isEn ? "Request Cancellation" : "Ajukan Pembatalan",
        unpaidLabel: isEn ? "Unpaid" : "Belum Bayar",
        futureLabel: isEn ? "Future" : "Akan Datang",
        months: isEn ? "months" : "bulan",
        paymentSetup: isEn ? "Payment Setup" : "Setup Pembayaran",
        paymentSetupHint: isEn ? "Choose member, billing period, and duration." : "Pilih anggota, periode tagihan, dan durasi pembayaran.",
        paymentSummary: isEn ? "Payment Summary" : "Ringkasan Pembayaran",
        paymentSummaryHint: isEn ? "Review amount, end period, and payment schedule." : "Tinjau nominal, periode akhir, dan jadwal pembayaran.",
        paymentMeta: isEn ? "Payment Metadata" : "Metadata Pembayaran",
        paymentMetaHint: isEn ? "Method, references, and supporting notes." : "Metode, referensi, dan catatan pendukung.",
        quickDuration: isEn ? "Quick Duration" : "Durasi Cepat",
    };
    const memberStatusLabel = {
        aktif: t("dues.memberStatus.aktif"),
        mutasi: t("dues.memberStatus.mutasi"),
        meninggal: t("dues.memberStatus.meninggal"),
    };

    const [searchValue, setSearchValue] = useState(filters.search || "");
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [voidingPayment, setVoidingPayment] = useState(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [voidSubmitting, setVoidSubmitting] = useState(false);

    const [paymentForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [voidForm] = Form.useForm();

    const canManage = props?.auth?.permissions?.includes("dues.manage");
    const canCreate = props?.auth?.permissions?.includes("dues.create") || canManage;
    const canUpdate = props?.auth?.permissions?.includes("dues.update") || canManage;
    const canVoid = props?.auth?.permissions?.includes("dues.void.request") || props?.auth?.permissions?.includes("dues.void");
    const membersById = useMemo(
        () => new Map(members.map((member) => [member.id, member])),
        [members],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== (filters.search || "")) {
                applyFilters({ search: searchValue, page: 1 });
            }
        }, 400);

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

    const resetFilters = () => {
        setSearchValue("");
        router.get(route("dues.index"), {}, { preserveState: true, replace: true });
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
        if (paymentSubmitting) return;

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

            setPaymentSubmitting(true);
            router.post(route("dues.payments.store"), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success(copy.paymentSaved);
                    setPaymentOpen(false);
                    paymentForm.resetFields();
                },
                onError: (errors) => {
                    if (errors?.payment) message.error(errors.payment);
                },
                onFinish: () => setPaymentSubmitting(false),
            });
        } catch {}
    };

    const openDetail = async (row) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailData(null);
        try {
            const { data } = await axios.get(route("dues.members.payments", row.member_id));
            setDetailData(data);
        } catch {
            message.error(copy.paymentLoadFailed);
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
            message.error(copy.paymentRefreshFailed);
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
        if (editSubmitting) return;

        try {
            const values = await editForm.validateFields();
            setEditSubmitting(true);
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
                        message.success(copy.paymentUpdated);
                        setEditingPayment(null);
                        editForm.resetFields();
                        refreshDetail();
                    },
                    onError: (errors) => {
                        if (errors?.payment) message.error(errors.payment);
                    },
                    onFinish: () => setEditSubmitting(false),
                },
            );
        } catch {}
    };

    const openVoidModal = (payment) => {
        setVoidingPayment(payment);
        voidForm.resetFields();
    };

    const submitVoid = async () => {
        if (voidSubmitting) return;

        try {
            const values = await voidForm.validateFields();
            setVoidSubmitting(true);
            router.post(
                route("dues.payments.void", voidingPayment.id),
                { reason: values.reason },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success(copy.paymentVoided);
                        setVoidingPayment(null);
                        voidForm.resetFields();
                        refreshDetail();
                    },
                    onError: (errors) => {
                        if (errors?.payment) message.error(errors.payment);
                    },
                    onFinish: () => setVoidSubmitting(false),
                },
            );
        } catch {}
    };

    const statusOptions = [
        { value: "ALL", label: t("dues.allStatus") },
        { value: "LUNAS", label: t("dues.paid") },
        { value: "BELUM_BAYAR", label: t("dues.unpaid") },
        { value: "MENUNGGAK", label: t("dues.overdue") },
        { value: "ADVANCE", label: t("dues.advance") },
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
            title: copy.member,
            key: "member",
            render: (_, row) => (
                <div>
                    <p className="font-semibold text-zinc-950">{row.full_name || "—"}</p>
                    <p className="text-xs text-zinc-500">NPA {row.npa || "—"}</p>
                </div>
            ),
        },
        {
            title: copy.memberStatus,
            dataIndex: "member_status",
            key: "member_status",
            width: 150,
            render: (value, row) => (
                <StatusBadge
                    status={row?.member_status_is_active ? "active" : "inactive"}
                    label={memberStatusLabel[value] || row?.member_status_name || value || "—"}
                    color={row?.member_status_is_active ? "blue" : "default"}
                />
            ),
        },
        {
            title: copy.lastPeriod,
            dataIndex: "last_paid_period",
            key: "last_paid_period",
            width: 150,
            render: (value) => formatMonthCompact(value),
        },
        {
            title: copy.currentPeriod,
            dataIndex: "due_now",
            key: "due_now",
            width: 150,
            render: () => formatMonthCompact(activePeriod),
        },
        {
            title: copy.duesStatus,
            dataIndex: "status",
            key: "status",
            width: 170,
            render: (_, row) => {
                if (row.status === "ADVANCE") {
                    return (
                        <StatusBadge
                            status="advance"
                            label={copy.advanceMonths.replace("{count}", row.advance_months)}
                            color="blue"
                        />
                    );
                }
                if (row.status === "LUNAS") {
                    return <StatusBadge status="paid" label={copy.paidLabel} color="green" />;
                }
                if (row.status === "BELUM_BAYAR") {
                    return <StatusBadge status="unpaid" label={t("dues.unpaid")} color="gold" />;
                }
                return (
                    <StatusBadge
                        status="overdue"
                        label={copy.overdueMonths.replace("{count}", row.arrears_months)}
                        color="red"
                    />
                );
            },
        },
        {
            title: copy.lastMethod,
            dataIndex: "last_payment_method",
            key: "last_payment_method",
            width: 140,
            render: (value) => value || "—",
        },
        {
            title: copy.actions,
            key: "action",
            width: 180,
            render: (_, row) => (
                <Space>
                    {row.status === "MENUNGGAK" || row.status === "BELUM_BAYAR" ? (
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => openPaymentDrawer(row)}
                            disabled={!canCreate}
                        >
                            {copy.pay}
                        </Button>
                    ) : null}
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(row)}
                    >
                        {copy.detail}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <AppLayout title={t("menu.dues")}>
            <PageShell>
                <PageHeader
                    eyebrow={copy.eyebrow}
                    title={t("dues.title")}
                    description={t("dues.description")}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openPaymentDrawer()}
                            disabled={!canCreate}
                        >
                            {t("dues.inputPayment")}
                        </Button>
                    }
                />

                <div className="idi-grid">
                    <StatCard
                        title={t("dues.totalMembers")}
                        value={summary.total_members || 0}
                        hint={`Periode ${activePeriodLabel}`}
                        icon={<UserOutlined />}
                    />
                    <StatCard
                        title={t("dues.paidMembers")}
                        value={summary.paid_members || 0}
                        hint={t("dues.paid")}
                        tone="success"
                    />
                    <StatCard
                        title={t("dues.unpaidMembers")}
                        value={summary.unpaid_members || 0}
                        hint={t("dues.overdue")}
                        tone="warning"
                    />
                    <StatCard
                        title={t("dues.totalArrears")}
                        value={<MoneyDisplay value={summary.total_arrears} emphasize tone="danger" />}
                        hint={copy.monthlyFee.replace("{amount}", formatIDR(monthlyAmount))}
                        tone="danger"
                    />
                </div>

                <Alert
                    type="info"
                    showIcon
                    title={t("dues.activePeriod", { period: activePeriodLabel })}
                    description={t("dues.activePeriodDesc")}
                    className="!rounded-[24px] !border-zinc-200"
                />

                <FilterBar>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("dues.searchMembers")}
                        </p>
                        <SearchInput
                            placeholder={t("dues.searchPlaceholder")}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("dues.duesStatus")}
                        </p>
                        <Select
                            options={statusOptions}
                            value={filters.status || "ALL"}
                            onChange={(value) => applyFilters({ status: value, page: 1 })}
                            style={{ width: 180 }}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("dues.arrears")}
                        </p>
                        <Select
                            value={filters.arrears_only ? "1" : ""}
                            onChange={(value) =>
                                applyFilters({ arrears_only: value === "1", page: 1 })
                            }
                            style={{ width: 190 }}
                            options={[
                                { value: "", label: t("dues.allMembers") },
                                { value: "1", label: t("dues.arrearsMoreThanOne") },
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("dues.advance")}
                        </p>
                        <Select
                            value={filters.advance_only ? "1" : ""}
                            onChange={(value) =>
                                applyFilters({ advance_only: value === "1", page: 1 })
                            }
                            style={{ width: 190 }}
                            options={[
                                { value: "", label: t("dues.allMembers") },
                                { value: "1", label: t("dues.advanceMoreThanOne") },
                            ]}
                        />
                    </div>

                    <Button onClick={resetFilters}>{t("common.resetFilter")}</Button>
                </FilterBar>

                <Card title={t("dues.duesTable")}>
                    <DataTable
                        columns={columns}
                        dataSource={dues}
                        rowKey="member_id"
                        pagination={{
                            current: meta.current_page || filters.page || 1,
                            total: meta.total || 0,
                            pageSize: meta.per_page || 20,
                            onChange: (page) => applyFilters({ page }),
                        }}
                        emptyTitle={t("dues.noDues")}
                        emptyDescription={t("dues.noDuesDesc")}
                    />
                </Card>
            </PageShell>

            <Drawer
                open={paymentOpen}
                size="large"
                title={
                    <div className="pr-6">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700/80">
                            {copy.paymentDrawerTitle}
                        </p>
                        <h3 className="m-0 text-xl font-semibold text-zinc-950">
                            {copy.allocationInfo}
                        </h3>
                    </div>
                }
                className="dues-payment-drawer"
                onClose={() => {
                    if (paymentSubmitting) return;
                    setPaymentOpen(false);
                    paymentForm.resetFields();
                }}
                styles={{
                    header: {
                        padding: "24px 28px 4px",
                        marginBottom: 0,
                    },
                    body: {
                        padding: "20px 28px 20px",
                    },
                    footer: {
                        padding: "18px 28px 24px",
                        borderTop: "1px solid rgba(228, 228, 231, 0.85)",
                    },
                }}
                footer={
                    <Space style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button onClick={() => setPaymentOpen(false)} disabled={paymentSubmitting}>
                            {copy.cancel}
                        </Button>
                        <Button
                            type="primary"
                            onClick={submitPayment}
                            disabled={!canCreate || paymentSubmitting}
                            loading={paymentSubmitting}
                        >
                            {copy.save}
                        </Button>
                    </Space>
                }
            >
                <div className="space-y-6">
                    <Form form={paymentForm} layout="vertical" requiredMark={false} className="dues-payment-form">
                        <section className="rounded-[24px] border border-zinc-200/80 bg-zinc-50/75 p-5">
                            <div className="mb-5">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    {copy.paymentSetup}
                                </p>
                                <p className="m-0 text-sm text-zinc-500">
                                    {copy.allocationDescription
                                        .replace("{period}", formatMonth(activePeriod))
                                        .replace("{amount}", formatIDR(monthlyAmount))}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    {copy.duesStartPeriodHint.replace(
                                        "{period}",
                                        formatMonth(duesStartPeriod),
                                    )}
                                </p>
                            </div>

                            <div className="grid gap-x-5 gap-y-1 md:grid-cols-2">
                                <Form.Item
                                    label={copy.member}
                                    name="member_id"
                                    rules={[{ required: true, message: copy.selectMember }]}
                                >
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder={copy.searchMember}
                                        onChange={handleMemberChange}
                                        options={members.map((member) => ({
                                            value: member.id,
                                            label: `${member.npa} - ${member.full_name}`,
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item label={copy.monthlyAmount}>
                                    <Input value={formatIDR(monthlyAmount)} readOnly />
                                </Form.Item>

                                <Form.Item
                                    label={copy.startPeriod}
                                    name="start_period"
                                    rules={[{ required: true, message: copy.selectStartPeriod }]}
                                >
                                    <DatePicker
                                        picker="month"
                                        style={{ width: "100%" }}
                                        format="YYYY-MM"
                                        disabledDate={(current) =>
                                            current &&
                                            current.isBefore(
                                                dayjs(`${duesStartPeriod}-01`),
                                                "month",
                                            )
                                        }
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={copy.duration}
                                    name="duration"
                                    rules={[{ required: true, message: copy.enterDuration }]}
                                >
                                    <InputNumber
                                        min={1}
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                            </div>

                            <div className="mt-2">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                    {copy.quickDuration}
                                </p>
                                <Space wrap>
                                    {[3, 6, 12, 24].map((count) => (
                                        <Button
                                            key={count}
                                            onClick={() => paymentForm.setFieldsValue({ duration: count })}
                                        >
                                            +{count} {copy.months}
                                        </Button>
                                    ))}
                                </Space>
                            </div>
                        </section>

                        <section className="rounded-[24px] border border-zinc-200/80 bg-white p-5 mt-4">
                            <div className="mb-5">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    {copy.paymentSummary}
                                </p>
                                <p className="m-0 text-sm text-zinc-500">{copy.paymentSummaryHint}</p>
                            </div>

                            <div className="grid gap-x-5 gap-y-1 md:grid-cols-2">
                                <Form.Item label={copy.endPeriod}>
                                    <Input value={endPeriodLabel} readOnly />
                                </Form.Item>

                                <Form.Item label={copy.totalPayment}>
                                    <Input value={formatIDR(totalAmount)} readOnly />
                                </Form.Item>

                                <Form.Item
                                    label={copy.method}
                                    name="method"
                                    rules={[{ required: true, message: copy.selectMethod }]}
                                >
                                    <Select
                                        options={[
                                            { value: "cash", label: "Cash" },
                                            { value: "transfer", label: "Transfer" },
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={copy.paymentDate}
                                    name="paid_at"
                                    rules={[{ required: true, message: copy.selectPaymentDate }]}
                                >
                                    <DatePicker
                                        style={{ width: "100%" }}
                                        format="DD-MM-YYYY"
                                    />
                                </Form.Item>
                            </div>
                        </section>

                        <section className="rounded-[24px] border border-zinc-200/80 bg-zinc-50/75 p-5 mt-4">
                            <div className="mb-5">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    {copy.paymentMeta}
                                </p>
                                <p className="m-0 text-sm text-zinc-500">{copy.paymentMetaHint}</p>
                            </div>

                            <div className="grid gap-x-5 gap-y-1 md:grid-cols-2">
                                <Form.Item label={copy.referenceNo} name="reference_no">
                                    <Input placeholder={copy.optional} />
                                </Form.Item>
                                <div />
                                <Form.Item label={copy.notes} name="notes" className="md:col-span-2 !mb-0">
                                    <TextArea rows={4} placeholder={copy.notes} />
                                </Form.Item>
                            </div>
                        </section>
                    </Form>
                </div>
            </Drawer>

            <Drawer
                open={detailOpen}
                size="min(1280px, 78vw)"
                title={copy.paymentDetail}
                onClose={() => setDetailOpen(false)}
            >
                {detailLoading ? (
                    <div className="space-y-4">
                        <LoadingSkeleton variant="card" rows={3} />
                        <LoadingSkeleton variant="table" rows={6} />
                    </div>
                ) : detailData ? (
                    <div className="space-y-4">
                        <FormSection
                            title={detailData.member?.full_name}
                            description={`NPA ${detailData.member?.npa || "—"}`}
                        >
                            <Descriptions
                                size="middle"
                                column={2}
                                items={[
                                    { key: "npa", label: "NPA", children: detailData.member?.npa || "—" },
                                    { key: "email", label: "Email", children: detailData.member?.email || "—" },
                                    { key: "phone", label: copy.phone, children: detailData.member?.phone || "—" },
                                    { key: "education", label: copy.education, children: detailData.member?.education || "—" },
                                    { key: "sip_1", label: "SIP 1", children: detailData.member?.sip_1 || "—" },
                                    { key: "sip_2", label: "SIP 2", children: detailData.member?.sip_2 || "—" },
                                    { key: "sip_3", label: "SIP 3", children: detailData.member?.sip_3 || "—" },
                                ]}
                            />
                        </FormSection>

                        <Alert
                            type="info"
                            showIcon
                            title={copy.correctionHint}
                            className="!rounded-[16px] !border-zinc-200"
                        />

                        <Card title={copy.paymentTransactions}>
                            <DataTable
                                size="middle"
                                dataSource={detailData.payments || []}
                                rowKey="id"
                                pagination={false}
                                scroll={{ x: 980 }}
                                emptyTitle={copy.noPaymentsYet}
                                emptyDescription={copy.paymentHistoryHint}
                                columns={[
                                    {
                                        title: copy.date,
                                        dataIndex: "paid_at",
                                        width: 140,
                                        render: (value) => value ? formatDate(value) : "—",
                                    },
                                    {
                                        title: copy.period,
                                        width: 210,
                                        render: (_, row) =>
                                            row.start_period
                                                ? `${formatMonthCompact(row.start_period)} - ${formatMonthCompact(row.end_period)}`
                                                : "—",
                                    },
                                    {
                                        title: copy.amount,
                                        dataIndex: "amount",
                                        width: 160,
                                        align: "right",
                                        render: (value) => <MoneyDisplay value={value} />,
                                    },
                                    { title: copy.method, dataIndex: "method", width: 140 },
                                    {
                                        title: copy.status,
                                        width: 170,
                                        render: (_, row) =>
                                            row.status === "void" || row.voided_at ? (
                                                <StatusBadge status="void" label="Void" color="red" />
                                            ) : row.has_pending_void_request ? (
                                                <StatusBadge status="pending" label={copy.pendingApproval} color="gold" />
                                            ) : (
                                                <StatusBadge status="paid" label={copy.paidLabel} color="green" />
                                            ),
                                    },
                                    {
                                        title: copy.actions,
                                        width: 280,
                                        render: (_, row) => (
                                            <Space>
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => openEditModal(row)}
                                                    disabled={!canUpdate || !row.can_edit || row.voided_at || row.has_pending_void_request}
                                                >
                                                    {copy.edit}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={<StopOutlined />}
                                                    onClick={() => openVoidModal(row)}
                                                    disabled={!canVoid || !row.can_void || row.voided_at || row.has_pending_void_request}
                                                >
                                                    {copy.requestVoid}
                                                </Button>
                                            </Space>
                                        ),
                                    },
                                ]}
                            />
                        </Card>

                        <Card title={copy.monthlyLedger}>
                            <DataTable
                                size="middle"
                                dataSource={detailData.history || detailData.payments || []}
                                rowKey="id"
                                pagination={false}
                                scroll={{ x: 760 }}
                                emptyTitle={copy.noPaymentsYet}
                                emptyDescription={copy.paymentHistoryHint}
                                columns={[
                                    {
                                        title: copy.date,
                                        dataIndex: "paid_at",
                                        width: 140,
                                        render: (value) => value ? formatDate(value) : "—",
                                    },
                                    {
                                        title: copy.period,
                                        width: 160,
                                        render: (_, row) =>
                                            row.period
                                                ? formatMonthCompact(row.period)
                                                : row.start_period
                                                ? `${row.start_period} - ${row.end_period}`
                                                : "—",
                                    },
                                    {
                                        title: copy.amount,
                                        dataIndex: "amount",
                                        width: 160,
                                        align: "right",
                                        render: (value) => <MoneyDisplay value={value} />,
                                    },
                                    { title: copy.method, dataIndex: "method", width: 140 },
                                    {
                                        title: copy.status,
                                        width: 170,
                                        render: (_, row) =>
                                            row.status === "void" || row.voided_at ? (
                                                <StatusBadge status="void" label="Void" color="red" />
                                            ) : row.has_pending_void_request ? (
                                                <StatusBadge status="pending" label={copy.pendingApproval} color="gold" />
                                            ) : row.status === "unpaid" ? (
                                                <StatusBadge status="unpaid" label={copy.unpaidLabel} color="gold" />
                                            ) : row.status === "future" ? (
                                                <StatusBadge status="future" label={copy.futureLabel} color="blue" />
                                            ) : (
                                                <StatusBadge status="paid" label={copy.paidLabel} color="green" />
                                            ),
                                    },
                                ]}
                            />
                        </Card>
                    </div>
                ) : (
                    <EmptyState
                        title={copy.noPaymentDetail}
                        description={copy.noPaymentDetailDesc}
                    />
                )}
            </Drawer>

            <Modal
                open={!!editingPayment}
                title={copy.editPayment}
                onCancel={() => {
                    if (!editSubmitting) {
                        setEditingPayment(null);
                    }
                }}
                onOk={submitEdit}
                okText={copy.save}
                confirmLoading={editSubmitting}
                okButtonProps={{ disabled: editSubmitting }}
                cancelButtonProps={{ disabled: editSubmitting }}
            >
                <Form form={editForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label={copy.paymentDate}
                        name="paid_at"
                        rules={[{ required: true, message: copy.selectPaymentDate }]}
                    >
                        <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
                    </Form.Item>
                    <Form.Item
                        label={copy.method}
                        name="method"
                        rules={[{ required: true, message: copy.selectMethod }]}
                    >
                        <Select
                            options={[
                                { value: "cash", label: "Cash" },
                                { value: "transfer", label: "Transfer" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label={copy.referenceNo} name="reference_no">
                        <Input placeholder={copy.optional} />
                    </Form.Item>
                    <Form.Item label={copy.notes} name="notes">
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                        label={copy.editReason}
                        name="reason"
                        rules={[{ required: true, message: copy.enterEditReason }]}
                    >
                        <TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!voidingPayment}
                title={copy.voidPayment}
                onCancel={() => {
                    if (!voidSubmitting) {
                        setVoidingPayment(null);
                    }
                }}
                onOk={submitVoid}
                okText={copy.requestVoid}
                confirmLoading={voidSubmitting}
                okButtonProps={{ danger: true, disabled: voidSubmitting }}
                cancelButtonProps={{ disabled: voidSubmitting }}
            >
                <Form form={voidForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        label={copy.voidReason}
                        name="reason"
                        rules={[{ required: true, whitespace: true, message: copy.enterVoidReason }]}
                    >
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
