import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
    Button,
    Card,
    Checkbox,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Tag,
    Typography,
    Upload,
    message,
} from "antd";
import {
    SaveOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    ApartmentOutlined,
    DatabaseOutlined,
    SafetyCertificateOutlined,
    CloudDownloadOutlined,
    CloudUploadOutlined,
    ReloadOutlined,
    WarningOutlined,
    FileExcelOutlined,
    HistoryOutlined,
    LockOutlined,
} from "@ant-design/icons";
import { useI18n } from "@/Contexts/I18nContext";

const { Text } = Typography;

export default function SettingsIndex() {
    const { t, language } = useI18n();
    const isEn = language === "en";
    const { props } = usePage();
    const access = props.access || { users: [], roles: [], permissions: [] };
    const profile = props.profile || {};
    const users = access.users || [];
    const roles = access.roles || [];
    const permissions = access.permissions || [];
    const backups = props.backups || [];
    const authPermissions = props.auth?.permissions || [];
    const canResetPassword =
        authPermissions.includes("users.reset-password") ||
        authPermissions.includes("users.update");
    const queryParams =
        typeof window === "undefined"
            ? new URLSearchParams()
            : new URLSearchParams(window.location.search);
    const [activeSettingsTab, setActiveSettingsTab] = useState(
        queryParams.get("tab") || "profile",
    );
    const [activeAccessTab, setActiveAccessTab] = useState(
        queryParams.get("access_tab") || "users",
    );

    const [orgForm] = Form.useForm();
    const [duesForm] = Form.useForm();
    const [userForm] = Form.useForm();
    const [resetPasswordForm] = Form.useForm();

    const [divisionForm] = Form.useForm();
    const [positionForm] = Form.useForm();
    const [cashCategoryForm] = Form.useForm();
    const [cashMethodForm] = Form.useForm();
    const [memberStatusForm] = Form.useForm();
    const [paymentStatusForm] = Form.useForm();
    const [workProgramPeriodForm] = Form.useForm();
    const [logoFileList, setLogoFileList] = useState([]);

    const [assignRoleForm] = Form.useForm();
    const [roleForm] = Form.useForm();
    const [permissionForm] = Form.useForm();
    const [editRoleForm] = Form.useForm();
    const [editPermissionForm] = Form.useForm();
    const [editUserForm] = Form.useForm();
    const [editMasterForm] = Form.useForm();

    const masterData = props.masterData || {};
    const divisions = masterData.divisions || [];
    const positions = masterData.positions || [];
    const cashCategories = masterData.cash_categories || [];
    const cashMethods = masterData.cash_methods || [];
    const memberStatuses = masterData.member_statuses || [];
    const paymentStatuses = masterData.payment_statuses || [];
    const workProgramPeriods = masterData.work_program_periods || [];
    const duesSettings = props.duesSettings || {
        dues_amount: 100000,
        dues_start_period: dayjs().format("YYYY-MM"),
        due_day: 10,
        grace_days: 7,
        auto_mark_arrears: true,
    };

    // Dummy Users (untuk tab User & Permission)
    const [assignRoleModal, setAssignRoleModal] = useState({
        open: false,
        user: null,
    });
    const [syncRoleModal, setSyncRoleModal] = useState({
        open: false,
        role: null,
    });
    const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
    const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);
    const [syncUserModal, setSyncUserModal] = useState({
        open: false,
        user: null,
    });
    const [editRoleModal, setEditRoleModal] = useState({
        open: false,
        role: null,
    });
    const [editPermissionModal, setEditPermissionModal] = useState({
        open: false,
        permission: null,
    });
    const [editUserModal, setEditUserModal] = useState({
        open: false,
        user: null,
    });
    const [resetPasswordModal, setResetPasswordModal] = useState({
        open: false,
        user: null,
    });
    const [divisionModalOpen, setDivisionModalOpen] = useState(false);
    const [positionModalOpen, setPositionModalOpen] = useState(false);
    const [cashCategoryModalOpen, setCashCategoryModalOpen] = useState(false);
    const [cashMethodModalOpen, setCashMethodModalOpen] = useState(false);
    const [memberStatusModalOpen, setMemberStatusModalOpen] = useState(false);
    const [paymentStatusModalOpen, setPaymentStatusModalOpen] = useState(false);
    const [workProgramPeriodModalOpen, setWorkProgramPeriodModalOpen] = useState(false);
    const [editMasterModal, setEditMasterModal] = useState({
        open: false,
        type: null,
        record: null,
    });
    const [selectedResetTables, setSelectedResetTables] = useState([]);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoreFileList, setRestoreFileList] = useState([]);
    const [restoreConfirmation, setRestoreConfirmation] = useState("");
    const [backupProcessing, setBackupProcessing] = useState(false);
    const [restoreProcessing, setRestoreProcessing] = useState(false);

    // --- helpers CRUD dummy ---
    useEffect(() => {
        duesForm.setFieldsValue({
            ...duesSettings,
            dues_start_period: duesSettings.dues_start_period
                ? dayjs(`${duesSettings.dues_start_period}-01`)
                : null,
        });
    }, [duesForm, duesSettings]);

    const defaultOrgProfile = {
        org_name: "IDI Cabang Purwakarta",
        address: "Alamat sekretariat...",
        phone: "",
        email: "",
        currency: "IDR",
        timezone: "Asia/Jakarta",
    };

    useEffect(() => {
        orgForm.setFieldsValue({
            ...defaultOrgProfile,
            ...profile,
        });
    }, [orgForm, profile]);

    const saveOrg = async () => {
        try {
            const values = await orgForm.validateFields();

            const fd = new FormData();
            Object.entries(values).forEach(([k, v]) => {
                if (v === undefined || v === null) return;
                fd.append(k, String(v));
            });

            const file = logoFileList?.[0]?.originFileObj; // ini File asli
            console.log("file", file, file instanceof File);

            if (file) fd.append("logo", file);

            fd.append("_method", "patch");

            router.post(route("settings.profile.update"), fd, {
                preserveScroll: true,
                // forceFormData boleh, tapi kalau sudah FormData manual biasanya tidak perlu
                onSuccess: () =>
                    message.success("Profil organisasi tersimpan."),
            });
        } catch (e) {
            console.error(e);
        }
    };

    const saveDues = async () => {
        try {
            const values = await duesForm.validateFields();
            const payload = {
                ...values,
                dues_start_period: values.dues_start_period
                    ? values.dues_start_period.format("YYYY-MM")
                    : null,
            };

            router.patch(route("settings.dues.update"), payload, {
                onSuccess: () => {
                    message.success("Pengaturan iuran tersimpan.");
                },
            });
        } catch {}
    };

    const addUser = async () => {
        try {
            const v = await userForm.validateFields();
            router.post(route("settings.access.users.store"), v, {
                onSuccess: () => {
                    userForm.resetFields();
                    message.success("User berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const addRole = async () => {
        try {
            const v = await roleForm.validateFields();
            router.post(route("settings.access.roles.store"), v, {
                onSuccess: () => {
                    roleForm.resetFields();
                    message.success("Role berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const addPermission = async () => {
        try {
            const v = await permissionForm.validateFields();
            router.post(route("settings.access.permissions.store"), v, {
                onSuccess: () => {
                    permissionForm.resetFields();
                    message.success("Permission berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const submitDivision = async () => {
        try {
            const v = await divisionForm.validateFields();
            router.post(route("settings.master-data.divisions.store"), v, {
                preserveScroll: true,
                onSuccess: () => {
                    divisionForm.resetFields();
                    setDivisionModalOpen(false);
                    message.success("Divisi berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const submitPosition = async () => {
        try {
            const v = await positionForm.validateFields();
            router.post(route("settings.master-data.positions.store"), v, {
                preserveScroll: true,
                onSuccess: () => {
                    positionForm.resetFields();
                    setPositionModalOpen(false);
                    message.success("Jabatan berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const submitCashCategory = async () => {
        try {
            const v = await cashCategoryForm.validateFields();
            router.post(
                route("settings.master-data.cash-categories.store"),
                v,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        cashCategoryForm.resetFields();
                        setCashCategoryModalOpen(false);
                        message.success(
                            "Kategori cashflow berhasil ditambahkan.",
                        );
                    },
                },
            );
        } catch {}
    };

    const submitCashMethod = async () => {
        try {
            const v = await cashMethodForm.validateFields();
            router.post(route("settings.master-data.cash-methods.store"), v, {
                preserveScroll: true,
                onSuccess: () => {
                    cashMethodForm.resetFields();
                    setCashMethodModalOpen(false);
                    message.success("Metode bayar berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const submitMemberStatus = async () => {
        try {
            const v = await memberStatusForm.validateFields();
            router.post(route("settings.master-data.member-statuses.store"), v, {
                preserveScroll: true,
                onSuccess: () => {
                    memberStatusForm.resetFields();
                    setMemberStatusModalOpen(false);
                    message.success("Status anggota berhasil ditambahkan.");
                },
            });
        } catch {}
    };

    const submitPaymentStatus = async () => {
        try {
            const v = await paymentStatusForm.validateFields();
            router.post(
                route("settings.master-data.payment-statuses.store"),
                v,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        paymentStatusForm.resetFields();
                        setPaymentStatusModalOpen(false);
                        message.success("Status bayar berhasil ditambahkan.");
                    },
                },
            );
        } catch {}
    };

    const submitWorkProgramPeriod = async () => {
        try {
            const v = await workProgramPeriodForm.validateFields();
            const payload = {
                ...v,
                start_date: v.start_date?.format("YYYY-MM-DD"),
                end_date: v.end_date?.format("YYYY-MM-DD"),
            };

            router.post(
                route("settings.master-data.work-program-periods.store"),
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        workProgramPeriodForm.resetFields();
                        setWorkProgramPeriodModalOpen(false);
                        message.success("Periode program kerja berhasil ditambahkan.");
                    },
                },
            );
        } catch {}
    };

    const masterUpdateRoutes = {
        divisions: "settings.master-data.divisions.update",
        positions: "settings.master-data.positions.update",
        cash_categories: "settings.master-data.cash-categories.update",
        cash_methods: "settings.master-data.cash-methods.update",
        member_statuses: "settings.master-data.member-statuses.update",
        payment_statuses: "settings.master-data.payment-statuses.update",
        work_program_periods: "settings.master-data.work-program-periods.update",
    };

    const masterLabels = {
        divisions: "Divisi",
        positions: "Jabatan",
        cash_categories: "Kategori Cashflow",
        cash_methods: "Metode Bayar",
        member_statuses: "Status Anggota",
        payment_statuses: "Status Bayar",
        work_program_periods: "Periode Program Kerja",
    };

    const openEditMaster = (type, record) => {
        editMasterForm.setFieldsValue({
            ...record,
            start_date: record.start_date ? dayjs(record.start_date) : null,
            end_date: record.end_date ? dayjs(record.end_date) : null,
            is_active: record.is_active ?? true,
        });
        setEditMasterModal({ open: true, type, record });
    };

    const closeEditMaster = () => {
        setEditMasterModal({ open: false, type: null, record: null });
        editMasterForm.resetFields();
    };

    const submitEditMaster = async () => {
        try {
            const values = await editMasterForm.validateFields();
            const { type, record } = editMasterModal;
            const payload = type === "work_program_periods"
                ? {
                      ...values,
                      start_date: values.start_date?.format("YYYY-MM-DD"),
                      end_date: values.end_date?.format("YYYY-MM-DD"),
                  }
                : values;

            router.patch(route(masterUpdateRoutes[type], record.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success(`${masterLabels[type]} berhasil diperbarui.`);
                    closeEditMaster();
                },
            });
        } catch {}
    };

    const renderMasterActions = (type, record, onDelete) => (
        <Space size={4}>
            <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditMaster(type, record)}
            />
            <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
            />
        </Space>
    );

    const confirmDeleteDivision = (division) => {
        Modal.confirm({
            title: "Hapus divisi?",
            content: `${division.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.divisions.destroy",
                        division.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Divisi berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDeletePosition = (position) => {
        Modal.confirm({
            title: "Hapus jabatan?",
            content: `${position.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.positions.destroy",
                        position.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Jabatan berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDeleteCashCategory = (category) => {
        Modal.confirm({
            title: "Hapus kategori cashflow?",
            content: `${category.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.cash-categories.destroy",
                        category.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(
                                "Kategori cashflow berhasil dihapus.",
                            ),
                    },
                ),
        });
    };

    const confirmDeleteCashMethod = (method) => {
        Modal.confirm({
            title: "Hapus metode bayar?",
            content: `${method.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.cash-methods.destroy",
                        method.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Metode bayar berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDeletePaymentStatus = (status) => {
        Modal.confirm({
            title: "Hapus status bayar?",
            content: `${status.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.payment-statuses.destroy",
                        status.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Status bayar berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDeleteMemberStatus = (status) => {
        Modal.confirm({
            title: "Hapus status anggota?",
            content: `${status.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.member-statuses.destroy",
                        status.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Status anggota berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDeleteWorkProgramPeriod = (period) => {
        Modal.confirm({
            title: "Hapus periode program kerja?",
            content: `${period.name} akan dihapus jika belum dipakai oleh program.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.work-program-periods.destroy",
                        period.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success("Periode program kerja berhasil dihapus."),
                    },
                ),
        });
    };

    const confirmDisableUser = (user) => {
        Modal.confirm({
            title: "Nonaktifkan user?",
            content: `${user.name} akan dinonaktifkan.`,
            okText: "Nonaktifkan",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.patch(route("settings.access.users.disable", user.id)),
        });
    };

    const openEditUser = (user) => {
        setEditUserModal({ open: true, user });
        editUserForm.setFieldsValue({ name: user.name, email: user.email });
    };

    const submitEditUser = async () => {
        try {
            const v = await editUserForm.validateFields();
            router.patch(
                route("settings.access.users.update", editUserModal.user.id),
                v,
                {
                    onSuccess: () => {
                        setEditUserModal({ open: false, user: null });
                        editUserForm.resetFields();
                        message.success("User berhasil diperbarui.");
                    },
                },
            );
        } catch {}
    };

    const openResetPassword = (user) => {
        setResetPasswordModal({ open: true, user });
        resetPasswordForm.resetFields();
    };

    const closeResetPassword = () => {
        setResetPasswordModal({ open: false, user: null });
        resetPasswordForm.resetFields();
    };

    const submitResetPassword = async () => {
        try {
            const v = await resetPasswordForm.validateFields();
            router.patch(
                route(
                    "settings.access.users.reset-password",
                    resetPasswordModal.user.id,
                ),
                v,
                {
                    onSuccess: () => {
                        closeResetPassword();
                        message.success("Password user berhasil direset.");
                    },
                },
            );
        } catch {}
    };

    const openAssignRole = (user) => {
        setAssignRoleModal({ open: true, user });
        assignRoleForm.setFieldsValue({ role: user.roles?.[0] || undefined });
    };

    const submitAssignRole = async () => {
        try {
            const v = await assignRoleForm.validateFields();
            router.patch(
                route(
                    "settings.access.users.assign-role",
                    assignRoleModal.user.id,
                ),
                v,
                {
                    onSuccess: () => {
                        setAssignRoleModal({ open: false, user: null });
                        assignRoleForm.resetFields();
                        message.success("Role user diperbarui.");
                    },
                },
            );
        } catch {}
    };

    const openSyncRolePermissions = (role) => {
        setSelectedRolePermissions(role.permissions || []);
        setSyncRoleModal({ open: true, role });
    };

    const openEditRole = (role) => {
        setEditRoleModal({ open: true, role });
        editRoleForm.setFieldsValue({ name: role.name });
    };

    const submitEditRole = async () => {
        try {
            const v = await editRoleForm.validateFields();
            router.patch(
                route("settings.access.roles.update", editRoleModal.role.id),
                v,
                {
                    onSuccess: () => {
                        setEditRoleModal({ open: false, role: null });
                        editRoleForm.resetFields();
                        message.success("Role berhasil diperbarui.");
                    },
                },
            );
        } catch {}
    };

    const confirmDeleteRole = (role) => {
        Modal.confirm({
            title: "Hapus role?",
            content: `Role ${role.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(route("settings.access.roles.destroy", role.id)),
        });
    };

    const submitSyncRolePermissions = () => {
        router.patch(
            route(
                "settings.access.roles.sync-permissions",
                syncRoleModal.role.id,
            ),
            { permissions: selectedRolePermissions },
            {
                onSuccess: () => {
                    setSyncRoleModal({ open: false, role: null });
                    message.success("Permission role diperbarui.");
                },
            },
        );
    };

    const openSyncUserPermissions = (user) => {
        setSelectedUserPermissions(user.permissions || []);
        setSyncUserModal({ open: true, user });
    };

    const openEditPermission = (permission) => {
        setEditPermissionModal({ open: true, permission });
        editPermissionForm.setFieldsValue({ name: permission.name });
    };

    const submitEditPermission = async () => {
        try {
            const v = await editPermissionForm.validateFields();
            router.patch(
                route(
                    "settings.access.permissions.update",
                    editPermissionModal.permission.id,
                ),
                v,
                {
                    onSuccess: () => {
                        setEditPermissionModal({
                            open: false,
                            permission: null,
                        });
                        editPermissionForm.resetFields();
                        message.success("Permission berhasil diperbarui.");
                    },
                },
            );
        } catch {}
    };

    const confirmDeletePermission = (permission) => {
        Modal.confirm({
            title: "Hapus permission?",
            content: `${permission.name} akan dihapus.`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () =>
                router.delete(
                    route("settings.access.permissions.destroy", permission.id),
                ),
        });
    };

    const submitSyncUserPermissions = () => {
        router.patch(
            route(
                "settings.access.users.sync-permissions",
                syncUserModal.user.id,
            ),
            { permissions: selectedUserPermissions },
            {
                onSuccess: () => {
                    setSyncUserModal({ open: false, user: null });
                    message.success("Permission user diperbarui.");
                },
            },
        );
    };

    const resetTableOptions = useMemo(
        () => [
            { key: "document_links", label: "document_links", note: "Relasi dokumen (polymorphic)" },
            { key: "letter_versions", label: "letter_versions", note: "Versi surat" },
            { key: "letters", label: "letters", note: "Surat" },
            { key: "letter_sequences", label: "letter_sequences", note: "Nomor surat" },
            { key: "letter_numbering_profiles", label: "letter_numbering_profiles", note: "Profil penomoran" },
            { key: "letter_templates", label: "letter_templates", note: "Template surat" },
            { key: "agenda", label: "agenda", note: "Agenda surat" },
            { key: "events", label: "events", note: "Kegiatan" },
            { key: "member_import_rows", label: "member_import_rows", note: "Baris import anggota" },
            { key: "member_import_batches", label: "member_import_batches", note: "Batch import anggota" },
            { key: "financial_action_requests", label: "financial_action_requests", note: "Request approval keuangan" },
            { key: "cash_transactions", label: "cash_transactions", note: "Transaksi kas" },
            { key: "dues_payment_allocations", label: "dues_payment_allocations", note: "Alokasi pembayaran iuran" },
            { key: "dues_payments", label: "dues_payments", note: "Pembayaran iuran" },
            { key: "dues_invoices", label: "dues_invoices", note: "Tagihan iuran" },
            { key: "dues_periods", label: "dues_periods", note: "Periode iuran" },
            { key: "documents", label: "documents", note: "Lampiran dokumen" },
            { key: "backups", label: "backups", note: "Log backup" },
            { key: "activity_log", label: "activity_log", note: "Log aktivitas" },
            { key: "members", label: "members", note: "Data anggota" },
            { key: "member_statuses", label: "member_statuses", note: "Status keanggotaan" },
            { key: "positions", label: "positions", note: "Master jabatan" },
            { key: "divisions", label: "divisions", note: "Master divisi" },
            { key: "payment_statuses", label: "payment_statuses", note: "Status pembayaran" },
            { key: "work_program_periods", label: "work_program_periods", note: "Periode program kerja" },
            { key: "cash_methods", label: "cash_methods", note: "Metode kas" },
            { key: "cash_categories", label: "cash_categories", note: "Kategori kas" },
            { key: "dues_settings", label: "dues_settings", note: "Pengaturan iuran" },
            { key: "app_settings", label: "app_settings", note: "Profil organisasi" },
            { key: "model_has_permissions", label: "model_has_permissions", note: "Pivot permission" },
            { key: "model_has_roles", label: "model_has_roles", note: "Pivot role" },
            { key: "role_has_permissions", label: "role_has_permissions", note: "Pivot role-permission" },
            { key: "roles", label: "roles", note: "Role (Spatie)" },
            { key: "permissions", label: "permissions", note: "Permission (Spatie)" },
            { key: "sessions", label: "sessions", note: "Session login" },
            { key: "password_reset_tokens", label: "password_reset_tokens", note: "Token reset password" },
            { key: "users", label: "users", note: "User aplikasi" },
        ],
        [],
    );

    const confirmHardReset = () => {
        Modal.confirm({
            title: "Hard Reset",
            content:
                "Aksi ini akan menghapus semua data dan membuat akun admin baru. Lanjutkan?",
            okText: "Ya, Reset",
            okType: "danger",
            cancelText: "Batal",
            onOk: () =>
                router.post(route("settings.factory-reset.hard"), {}, { preserveScroll: true }),
        });
    };

    const confirmFinanceReset = () => {
        Modal.confirm({
            title: "Reset Data Iuran & Kas",
            content: "Aksi ini menghapus transaksi iuran dan kas saja. Lanjutkan?",
            okText: "Ya, Reset",
            okType: "danger",
            cancelText: "Batal",
            onOk: () =>
                router.post(route("settings.factory-reset.finance"), {}, { preserveScroll: true }),
        });
    };

    const submitCustomReset = () => {
        Modal.confirm({
            title: "Hapus Tabel Terpilih",
            content: "Tabel yang dipilih akan dikosongkan sesuai urutan. Lanjutkan?",
            okText: "Ya, Hapus",
            okType: "danger",
            cancelText: "Batal",
            onOk: () =>
                router.post(
                    route("settings.factory-reset.custom"),
                    { tables: selectedResetTables },
                    { preserveScroll: true },
                ),
        });
    };

    const createFullBackup = () => {
        Modal.confirm({
            title: "Backup Full Database",
            content:
                "Sistem akan membuat file ZIP berisi database.sql untuk seluruh tabel database. File ini bisa digunakan untuk restore database nanti.",
            okText: "Buat Backup",
            cancelText: "Batal",
            onOk: () =>
                router.post(
                    route("settings.backups.store"),
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => setBackupProcessing(true),
                        onSuccess: () =>
                            message.success("Backup full database dibuat."),
                        onError: (errors) =>
                            message.error(
                                errors.backup ||
                                    "Backup database gagal dibuat.",
                            ),
                        onFinish: () => setBackupProcessing(false),
                    },
                ),
        });
    };

    const submitRestoreBackup = () => {
        const file = restoreFileList[0]?.originFileObj || restoreFileList[0];

        if (!file) {
            message.warning("Pilih file backup ZIP terlebih dahulu.");
            return;
        }

        if (restoreConfirmation !== "RESTORE DATABASE") {
            message.warning('Ketik "RESTORE DATABASE" untuk konfirmasi.');
            return;
        }

        const fd = new FormData();
        fd.append("backup_file", file);
        fd.append("confirmation", restoreConfirmation);

        router.post(route("settings.backups.restore"), fd, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setRestoreProcessing(true),
            onSuccess: () => {
                setRestoreModalOpen(false);
                setRestoreFileList([]);
                setRestoreConfirmation("");
                message.success("Restore database berhasil.");
            },
            onError: (errors) =>
                message.error(
                    errors.backup_file || "Restore database gagal diproses.",
                ),
            onFinish: () => setRestoreProcessing(false),
        });
    };

    // --- tabs ---
    const tabs = useMemo(() => {
        return [
            // 1) Profil Organisasi
            {
                key: "profile",
                label: (
                    <Space>
                        <ApartmentOutlined />
                        Profil Organisasi
                    </Space>
                ),
                children: (
                    <Row gutter={[12, 12]}>
                        <Col xs={24} lg={14}>
                            <Card
                                style={{ borderRadius: 12 }}
                                title={<Text strong>Profil Organisasi</Text>}
                            >
                                <Form
                                    form={orgForm}
                                    layout="vertical"
                                    requiredMark={false}
                                    initialValues={defaultOrgProfile}
                                >
                                    <Row gutter={[12, 12]}>
                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Nama Organisasi"
                                                name="org_name"
                                                rules={[
                                                    {
                                                        required: true,
                                                        message:
                                                            "Nama organisasi wajib",
                                                    },
                                                ]}
                                            >
                                                <Input />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Telepon"
                                                name="phone"
                                            >
                                                <Input />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Email"
                                                name="email"
                                            >
                                                <Input />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24}>
                                            <Form.Item
                                                label="Alamat"
                                                name="address"
                                            >
                                                <Input.TextArea rows={3} />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Mata Uang"
                                                name="currency"
                                            >
                                                <Select
                                                    options={[
                                                        {
                                                            value: "IDR",
                                                            label: "IDR",
                                                        },
                                                        {
                                                            value: "USD",
                                                            label: "USD",
                                                        },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label="Timezone"
                                                name="timezone"
                                            >
                                                <Select
                                                    options={[
                                                        {
                                                            value: "Asia/Jakarta",
                                                            label: "Asia/Jakarta",
                                                        },
                                                        {
                                                            value: "Asia/Makassar",
                                                            label: "Asia/Makassar",
                                                        },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item label="Logo Organisasi">
                                                <Space
                                                    orientation="vertical"
                                                    size={8}
                                                    style={{ width: "100%" }}
                                                >
                                                    {profile?.logo_url && (
                                                        <img
                                                            src={
                                                                profile.logo_url
                                                            }
                                                            alt="Logo organisasi"
                                                            style={{
                                                                width: 64,
                                                                height: 64,
                                                                borderRadius: 8,
                                                                objectFit:
                                                                    "cover",
                                                            }}
                                                        />
                                                    )}
                                                    <Upload
                                                        maxCount={1}
                                                        accept="image/*"
                                                        beforeUpload={() =>
                                                            false
                                                        }
                                                        fileList={logoFileList}
                                                        onChange={({
                                                            fileList,
                                                        }) =>
                                                            setLogoFileList(
                                                                fileList,
                                                            )
                                                        }
                                                        onRemove={() =>
                                                            setLogoFileList([])
                                                        }
                                                    >
                                                        <Button
                                                            icon={
                                                                <CloudDownloadOutlined />
                                                            }
                                                        >
                                                            Pilih Logo
                                                        </Button>
                                                    </Upload>

                                                    <Text type="secondary">
                                                        PNG/JPG max 2MB.
                                                    </Text>
                                                </Space>
                                            </Form.Item>
                                        </Col>

                                        <Col
                                            xs={24}
                                            style={{
                                                display: "flex",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                onClick={saveOrg}
                                            >
                                                Simpan
                                            </Button>
                                        </Col>
                                    </Row>
                                </Form>
                            </Card>
                        </Col>

                        <Col xs={24} lg={10}>
                            <Card
                                style={{
                                    borderRadius: 12,
                                    background: "#f5f7fb",
                                }}
                                title={<Text strong>Catatan</Text>}
                            >
                                <li>
                                    Profil organisasi disimpan ke{" "}
                                    <code>app_settings</code> dan dipakai oleh
                                    tampilan aplikasi, surat, dan verifikasi.
                                </li>
                                <li>
                                    Nama organisasi tampil di header & sidebar
                                    sebagai identitas.
                                </li>
                                <li>
                                    Logo, alamat, telepon, dan email dipakai
                                    untuk kop surat dan halaman verifikasi.
                                </li>
                                <li>
                                    Timezone dipakai untuk tanggal transaksi &
                                    surat.
                                </li>
                            </Card>
                        </Col>
                    </Row>
                ),
            },

            // 2) Master Data
            {
                key: "master",
                label: (
                    <Space>
                        <DatabaseOutlined />
                        Master Data
                    </Space>
                ),
                children: (
                    <Card style={{ borderRadius: 12 }}>
                        <Tabs
                            activeKey={activeAccessTab}
                            onChange={setActiveAccessTab}
                            tabBarStyle={{ marginBottom: 12 }}
                            items={[
                                {
                                    key: "divisions",
                                    label: "Divisi",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={divisions}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>Divisi</Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setDivisionModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Nama Divisi",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "divisions",
                                                            r,
                                                            confirmDeleteDivision,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "positions",
                                    label: "Jabatan",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={positions}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>Jabatan</Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setPositionModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Nama Jabatan",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "positions",
                                                            r,
                                                            confirmDeletePosition,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "cash_categories",
                                    label: "Kategori Cashflow",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={cashCategories}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        Kategori Cashflow
                                                    </Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setCashCategoryModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Tipe",
                                                    dataIndex: "type",
                                                    key: "type",
                                                    width: 110,
                                                    render: (v) =>
                                                        v === "in" ? (
                                                            <Tag color="green">
                                                                MASUK
                                                            </Tag>
                                                        ) : (
                                                            <Tag color="red">
                                                                KELUAR
                                                            </Tag>
                                                        ),
                                                },
                                                {
                                                    title: "Nama Kategori",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "cash_categories",
                                                            r,
                                                            confirmDeleteCashCategory,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "cash_methods",
                                    label: "Metode Bayar",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={cashMethods}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        Metode Bayar
                                                    </Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setCashMethodModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Nama Metode",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "cash_methods",
                                                            r,
                                                            confirmDeleteCashMethod,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "member_statuses",
                                    label: "Status Anggota",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={memberStatuses}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        Status Anggota
                                                    </Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setMemberStatusModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Code",
                                                    dataIndex: "code",
                                                    key: "code",
                                                    width: 120,
                                                },
                                                {
                                                    title: "Nama",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Flags",
                                                    key: "flags",
                                                    render: (_, r) => (
                                                        <Space wrap>
                                                            {r.is_active_member ? (
                                                                <Tag color="green">Active Member</Tag>
                                                            ) : null}
                                                            {r.is_billable ? (
                                                                <Tag color="blue">Billable</Tag>
                                                            ) : null}
                                                            {r.is_deceased ? (
                                                                <Tag color="red">Deceased</Tag>
                                                            ) : null}
                                                            {!r.is_active ? (
                                                                <Tag>Inactive</Tag>
                                                            ) : null}
                                                        </Space>
                                                    ),
                                                },
                                                {
                                                    title: "Urutan",
                                                    dataIndex: "sort_order",
                                                    key: "sort_order",
                                                    width: 90,
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "member_statuses",
                                                            r,
                                                            confirmDeleteMemberStatus,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "payment_statuses",
                                    label: "Status Bayar",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={paymentStatuses}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        Status Bayar
                                                    </Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setPaymentStatusModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Code",
                                                    dataIndex: "code",
                                                    key: "code",
                                                    width: 120,
                                                },
                                                {
                                                    title: "Nama",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Label",
                                                    dataIndex: "color",
                                                    key: "color",
                                                    width: 140,
                                                    render: (v, r) => (
                                                        <Tag
                                                            color={v || "blue"}
                                                        >
                                                            {r.name}
                                                        </Tag>
                                                    ),
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, r) =>
                                                        renderMasterActions(
                                                            "payment_statuses",
                                                            r,
                                                            confirmDeletePaymentStatus,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "work_program_periods",
                                    label: "Periode Program Kerja",
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={workProgramPeriods}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        Periode Program Kerja
                                                    </Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setWorkProgramPeriodModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Tambah
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: "Kode",
                                                    dataIndex: "code",
                                                    key: "code",
                                                    width: 140,
                                                    render: (value) => value || "-",
                                                },
                                                {
                                                    title: "Nama",
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Tanggal",
                                                    key: "date_range",
                                                    width: 230,
                                                    render: (_, record) =>
                                                        `${dayjs(record.start_date).format("DD MMM YYYY")} - ${dayjs(record.end_date).format("DD MMM YYYY")}`,
                                                },
                                                {
                                                    title: "Status",
                                                    dataIndex: "is_active",
                                                    key: "is_active",
                                                    width: 110,
                                                    render: (value) =>
                                                        value ? (
                                                            <Tag color="green">Aktif</Tag>
                                                        ) : (
                                                            <Tag>Inactive</Tag>
                                                        ),
                                                },
                                                {
                                                    title: "Catatan",
                                                    dataIndex: "notes",
                                                    key: "notes",
                                                    ellipsis: true,
                                                    render: (value) => value || "-",
                                                },
                                                {
                                                    title: "Aksi",
                                                    key: "aksi",
                                                    width: 110,
                                                    align: "right",
                                                    render: (_, record) =>
                                                        renderMasterActions(
                                                            "work_program_periods",
                                                            record,
                                                            confirmDeleteWorkProgramPeriod,
                                                        ),
                                                },
                                            ]}
                                        />
                                    ),
                                },
                                {
                                    key: "dues_settings",
                                    label: "Pengaturan Iuran",
                                    children: (
                                        <Card style={{ borderRadius: 12 }}>
                                            <Form
                                                form={duesForm}
                                                layout="vertical"
                                                requiredMark={false}
                                                initialValues={duesSettings}
                                            >
                                                <Row gutter={[12, 12]}>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label="Nominal Iuran (default)"
                                                            name="dues_amount"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        "Nominal wajib",
                                                                },
                                                            ]}
                                                        >
                                                            <InputNumber
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                min={0}
                                                                step={1000}
                                                            />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label={
                                                                isEn
                                                                    ? "Dues Start Period (month/year)"
                                                                    : "Periode Mulai Iuran (bulan/tahun)"
                                                            }
                                                            name="dues_start_period"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: isEn
                                                                        ? "Start period is required"
                                                                        : "Periode mulai wajib diisi",
                                                                },
                                                            ]}
                                                            tooltip={
                                                                isEn
                                                                    ? "All dues calculations start from this month."
                                                                    : "Semua kalkulasi iuran dimulai dari bulan ini."
                                                            }
                                                        >
                                                            <DatePicker
                                                                picker="month"
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                format="YYYY-MM"
                                                            />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label="Jatuh Tempo (tanggal setiap bulan)"
                                                            name="due_day"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        "Wajib",
                                                                },
                                                            ]}
                                                        >
                                                            <InputNumber
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                min={1}
                                                                max={28}
                                                            />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label="Masa Tenggang (hari)"
                                                            name="grace_days"
                                                        >
                                                            <InputNumber
                                                                style={{
                                                                    width: "100%",
                                                                }}
                                                                min={0}
                                                                max={60}
                                                            />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col xs={24} md={12}>
                                                        <Form.Item
                                                            label="Auto tandai menunggak"
                                                            name="auto_mark_arrears"
                                                            valuePropName="checked"
                                                        >
                                                            <Switch />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col
                                                        xs={24}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "flex-end",
                                                        }}
                                                    >
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <SaveOutlined />
                                                            }
                                                            onClick={saveDues}
                                                        >
                                                            Simpan
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        </Card>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                ),
            },

            // 3) User & Permission
            {
                key: "access",
                label: (
                    <Space>
                        <SafetyCertificateOutlined />
                        User & Permission
                    </Space>
                ),
                children: (
                    <Card style={{ borderRadius: 12 }}>
                        <Tabs
                            tabBarStyle={{ marginBottom: 12 }}
                            items={[
                                {
                                    key: "users",
                                    label: "Users",
                                    children: (
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Tambah User
                                                        </Text>
                                                    }
                                                >
                                                    <Form
                                                        form={userForm}
                                                        layout="vertical"
                                                        requiredMark={false}
                                                    >
                                                        <Row gutter={[12, 12]}>
                                                            <Col
                                                                xs={24}
                                                                md={12}
                                                            >
                                                                <Form.Item
                                                                    name="name"
                                                                    label="Nama"
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                "Nama wajib",
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Input placeholder="Nama user..." />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col
                                                                xs={24}
                                                                md={12}
                                                            >
                                                                <Form.Item
                                                                    name="email"
                                                                    label="Email"
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                "Email wajib",
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Input placeholder="email@org.id" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col
                                                                xs={24}
                                                                md={12}
                                                            >
                                                                <Form.Item
                                                                    name="role"
                                                                    label="Role"
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                "Role wajib",
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Select
                                                                        placeholder="Pilih role"
                                                                        options={roles.map(
                                                                            (
                                                                                role,
                                                                            ) => ({
                                                                                value: role.name,
                                                                                label: role.name,
                                                                            }),
                                                                        )}
                                                                    />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col
                                                                xs={24}
                                                                md={12}
                                                            >
                                                                <Form.Item
                                                                    name="password"
                                                                    label="Password"
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                "Password wajib",
                                                                        },
                                                                        {
                                                                            min: 8,
                                                                            message:
                                                                                "Minimal 8 karakter",
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Input.Password placeholder="Password sementara..." />
                                                                </Form.Item>
                                                            </Col>

                                                            <Col
                                                                xs={24}
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    justifyContent:
                                                                        "flex-end",
                                                                }}
                                                            >
                                                                <Button
                                                                    type="primary"
                                                                    icon={
                                                                        <PlusOutlined />
                                                                    }
                                                                    onClick={
                                                                        addUser
                                                                    }
                                                                >
                                                                    Tambah
                                                                </Button>
                                                            </Col>
                                                        </Row>
                                                    </Form>
                                                </Card>
                                            </Col>

                                            <Col xs={24}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Daftar User
                                                        </Text>
                                                    }
                                                >
                                                    <Table
                                                        size="small"
                                                        dataSource={users}
                                                        rowKey="id"
                                                        pagination={false}
                                                        scroll={{ x: 940 }}
                                                        columns={[
                                                            {
                                                                title: "Nama",
                                                                dataIndex:
                                                                    "name",
                                                                key: "name",
                                                            },
                                                            {
                                                                title: "Email",
                                                                dataIndex:
                                                                    "email",
                                                                key: "email",
                                                            },
                                                            {
                                                                title: "Role",
                                                                dataIndex:
                                                                    "roles",
                                                                key: "role",
                                                                width: 180,
                                                                render: (
                                                                    roles,
                                                                ) =>
                                                                    roles?.length ? (
                                                                        <Space
                                                                            wrap
                                                                        >
                                                                            {roles.map(
                                                                                (
                                                                                    role,
                                                                                ) => (
                                                                                    <Tag
                                                                                        key={
                                                                                            role
                                                                                        }
                                                                                        color="blue"
                                                                                    >
                                                                                        {
                                                                                            role
                                                                                        }
                                                                                    </Tag>
                                                                                ),
                                                                            )}
                                                                        </Space>
                                                                    ) : (
                                                                        <Tag color="default">
                                                                            Tanpa
                                                                            Role
                                                                        </Tag>
                                                                    ),
                                                            },
                                                            {
                                                                title: "Status",
                                                                dataIndex:
                                                                    "is_active",
                                                                key: "status",
                                                                width: 100,
                                                                render: (v) => (
                                                                    <Tag
                                                                        color={
                                                                            v
                                                                                ? "green"
                                                                                : "red"
                                                                        }
                                                                    >
                                                                        {v
                                                                            ? "AKTIF"
                                                                            : "NONAKTIF"}
                                                                    </Tag>
                                                                ),
                                                            },
                                                            {
                                                                title: "Aksi",
                                                                key: "aksi",
                                                                width: 380,
                                                                align: "right",
                                                                render: (
                                                                    _,
                                                                    r,
                                                                ) => (
                                                                    <Space>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openEditUser(
                                                                                    r,
                                                                                )
                                                                            }
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openAssignRole(
                                                                                    r,
                                                                                )
                                                                            }
                                                                        >
                                                                            Assign
                                                                            Role
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openSyncUserPermissions(
                                                                                    r,
                                                                                )
                                                                            }
                                                                        >
                                                                            Sync
                                                                            Permission
                                                                        </Button>
                                                                        {canResetPassword && (
                                                                            <Button
                                                                                size="small"
                                                                                icon={
                                                                                    <LockOutlined />
                                                                                }
                                                                                onClick={() =>
                                                                                    openResetPassword(
                                                                                        r,
                                                                                    )
                                                                                }
                                                                            >
                                                                                Reset
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            size="small"
                                                                            danger
                                                                            icon={
                                                                                <DeleteOutlined />
                                                                            }
                                                                            onClick={() =>
                                                                                confirmDisableUser(
                                                                                    r,
                                                                                )
                                                                            }
                                                                        />
                                                                    </Space>
                                                                ),
                                                            },
                                                        ]}
                                                    />
                                                    <Text
                                                        type="secondary"
                                                        style={{
                                                            display: "block",
                                                            marginTop: 8,
                                                        }}
                                                    >
                                                        *Data diambil dari
                                                        Spatie Permission
                                                        (roles/permissions).
                                                    </Text>
                                                </Card>
                                            </Col>
                                        </Row>
                                    ),
                                },
                                {
                                    key: "roles",
                                    label: "Roles",
                                    children: (
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Tambah Role
                                                        </Text>
                                                    }
                                                >
                                                    <Form
                                                        form={roleForm}
                                                        layout="vertical"
                                                        requiredMark={false}
                                                    >
                                                        <Form.Item
                                                            name="name"
                                                            label="Nama Role"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        "Nama role wajib",
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="Contoh: Admin" />
                                                        </Form.Item>
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <PlusOutlined />
                                                            }
                                                            onClick={addRole}
                                                        >
                                                            Tambah Role
                                                        </Button>
                                                    </Form>
                                                </Card>
                                            </Col>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Daftar Role
                                                        </Text>
                                                    }
                                                >
                                                    <Table
                                                        size="small"
                                                        dataSource={roles}
                                                        rowKey="id"
                                                        pagination={false}
                                                        columns={[
                                                            {
                                                                title: "Nama",
                                                                dataIndex:
                                                                    "name",
                                                                key: "name",
                                                            },
                                                            {
                                                                title: "Permissions",
                                                                dataIndex:
                                                                    "permissions",
                                                                key: "permissions",
                                                                render: (
                                                                    value,
                                                                ) => (
                                                                    <Space wrap>
                                                                        {(
                                                                            value ||
                                                                            []
                                                                        ).map(
                                                                            (
                                                                                permission,
                                                                            ) => (
                                                                                <Tag
                                                                                    key={
                                                                                        permission
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        permission
                                                                                    }
                                                                                </Tag>
                                                                            ),
                                                                        )}
                                                                    </Space>
                                                                ),
                                                            },
                                                            {
                                                                title: "Aksi",
                                                                key: "aksi",
                                                                width: 220,
                                                                align: "right",
                                                                render: (
                                                                    _,
                                                                    role,
                                                                ) => (
                                                                    <Space>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openEditRole(
                                                                                    role,
                                                                                )
                                                                            }
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openSyncRolePermissions(
                                                                                    role,
                                                                                )
                                                                            }
                                                                        >
                                                                            Sync
                                                                            Permission
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            danger
                                                                            icon={
                                                                                <DeleteOutlined />
                                                                            }
                                                                            onClick={() =>
                                                                                confirmDeleteRole(
                                                                                    role,
                                                                                )
                                                                            }
                                                                        />
                                                                    </Space>
                                                                ),
                                                            },
                                                        ]}
                                                    />
                                                </Card>
                                            </Col>
                                        </Row>
                                    ),
                                },
                                {
                                    key: "permissions",
                                    label: "Permissions",
                                    children: (
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Tambah Permission
                                                        </Text>
                                                    }
                                                >
                                                    <Form
                                                        form={permissionForm}
                                                        layout="vertical"
                                                        requiredMark={false}
                                                    >
                                                        <Form.Item
                                                            name="name"
                                                            label="Nama Permission"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        "Nama permission wajib",
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="Contoh: users.view" />
                                                        </Form.Item>
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <PlusOutlined />
                                                            }
                                                            onClick={
                                                                addPermission
                                                            }
                                                        >
                                                            Tambah Permission
                                                        </Button>
                                                    </Form>
                                                </Card>
                                            </Col>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            Daftar Permission
                                                        </Text>
                                                    }
                                                >
                                                    <Table
                                                        size="small"
                                                        dataSource={permissions}
                                                        rowKey="id"
                                                        pagination={false}
                                                        columns={[
                                                            {
                                                                title: "Nama",
                                                                dataIndex:
                                                                    "name",
                                                                key: "name",
                                                            },
                                                            {
                                                                title: "Aksi",
                                                                key: "aksi",
                                                                width: 140,
                                                                align: "right",
                                                                render: (
                                                                    _,
                                                                    permission,
                                                                ) => (
                                                                    <Space>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openEditPermission(
                                                                                    permission,
                                                                                )
                                                                            }
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            danger
                                                                            icon={
                                                                                <DeleteOutlined />
                                                                            }
                                                                            onClick={() =>
                                                                                confirmDeletePermission(
                                                                                    permission,
                                                                                )
                                                                            }
                                                                        />
                                                                    </Space>
                                                                ),
                                                            },
                                                        ]}
                                                    />
                                                </Card>
                                            </Col>
                                        </Row>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                ),
            },

            // 4) Backup & Export Data
            {
                key: "backup",
                label: (
                    <Space>
                        <CloudDownloadOutlined />
                        Backup & Export Data
                    </Space>
                ),
                children: (
                    <Row gutter={[12, 12]}>
                        <Col xs={24} lg={15}>
                            <Card
                                style={{ borderRadius: 12 }}
                                title={<Text strong>Backup Sistem</Text>}
                            >
                                <Text type="secondary">
                                    Backup seluruh tabel database ke file ZIP
                                    berisi database.sql untuk migrasi,
                                    pemulihan sistem, atau reimport oleh admin.
                                    File ini bukan laporan harian.
                                </Text>

                                <div style={{ marginTop: 12 }}>
                                    <Space wrap align="start">
                                        <Button
                                            type="primary"
                                            onClick={createFullBackup}
                                            icon={<DatabaseOutlined />}
                                            loading={backupProcessing}
                                        >
                                            Backup Full Database
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                setRestoreModalOpen(true)
                                            }
                                            icon={<CloudUploadOutlined />}
                                        >
                                            Import / Restore
                                        </Button>
                                        <Tag
                                            icon={<LockOutlined />}
                                            color="red"
                                            style={{ padding: "4px 10px" }}
                                        >
                                            Khusus Admin Sistem
                                        </Tag>
                                    </Space>
                                </div>
                            </Card>

                            <Card
                                style={{ borderRadius: 12, marginTop: 12 }}
                                title={<Text strong>Export Data Siap Pakai</Text>}
                            >
                                <Text type="secondary">
                                    Export untuk arsip dan laporan yang mudah
                                    dibuka oleh pengurus non-teknis. File ini
                                    tidak ditujukan untuk restore database.
                                </Text>

                                <div style={{ marginTop: 12 }}>
                                    <Space wrap>
                                        <Button
                                            onClick={() =>
                                                (window.location.href = route(
                                                    "members.export",
                                                    { format: "xlsx" },
                                                ))
                                            }
                                            icon={<FileExcelOutlined />}
                                        >
                                            Export Anggota
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                (window.location.href = route(
                                                    "dues.recap.export",
                                                ))
                                            }
                                            icon={<FileExcelOutlined />}
                                        >
                                            Export Rekap Iuran
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                (window.location.href = route(
                                                    "reports.export",
                                                ))
                                            }
                                            icon={<CloudDownloadOutlined />}
                                        >
                                            Buka Pusat Export
                                        </Button>
                                    </Space>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={9}>
                            <Card
                                style={{
                                    borderRadius: 12,
                                    background: "#f5f7fb",
                                }}
                                title={
                                    <Space>
                                        <HistoryOutlined />
                                        <Text strong>Riwayat Backup Sistem</Text>
                                    </Space>
                                }
                            >
                                <Space
                                    orientation="vertical"
                                    size={10}
                                    style={{ width: "100%" }}
                                >
                                    {backups.length ? (
                                        backups.map((backup) => (
                                            <div
                                                key={backup.id}
                                                style={{
                                                    padding: 12,
                                                    border: "1px solid #e6e8ef",
                                                    borderRadius: 10,
                                                    background: "#fff",
                                                }}
                                            >
                                                <Space
                                                    align="start"
                                                    style={{
                                                        justifyContent:
                                                            "space-between",
                                                        width: "100%",
                                                    }}
                                                >
                                                    <div>
                                                        <Text strong>
                                                            {backup.scope ===
                                                            "finance"
                                                                ? "Backup Keuangan"
                                                                : backup.scope ===
                                                                    "all"
                                                                  ? "Backup Full Database"
                                                                  : "Backup Anggota"}
                                                        </Text>
                                                        <br />
                                                        <Text type="secondary">
                                                            {backup.created_at}
                                                        </Text>
                                                        {backup.created_by ? (
                                                            <>
                                                                <br />
                                                                <Text type="secondary">
                                                                    Oleh{" "}
                                                                    {
                                                                        backup.created_by
                                                                    }
                                                                </Text>
                                                            </>
                                                        ) : null}
                                                        <br />
                                                        <Text type="secondary">
                                                            {backup.file}
                                                        </Text>
                                                    </div>
                                                    <Space orientation="vertical" align="end">
                                                        <Tag color="green">
                                                            Berhasil
                                                        </Tag>
                                                        {backup.download_url ? (
                                                            <Button
                                                                size="small"
                                                                icon={
                                                                    <CloudDownloadOutlined />
                                                                }
                                                                onClick={() =>
                                                                    (window.location.href =
                                                                        backup.download_url)
                                                                }
                                                            >
                                                                Download
                                                            </Button>
                                                        ) : null}
                                                    </Space>
                                                </Space>
                                            </div>
                                        ))
                                    ) : (
                                        <Text type="secondary">
                                            Belum ada riwayat backup sistem.
                                        </Text>
                                    )}
                                </Space>

                                <Divider style={{ margin: "16px 0" }} />

                                <Text type="secondary">
                                    Backup baru berisi <code>database.sql</code>{" "}
                                    untuk restore database. Backup format lama
                                    tetap bisa di-restore bila ZIP masih memuat
                                    <code>database.json</code>.
                                </Text>
                            </Card>
                        </Col>
                    </Row>
                ),
            },
            // 5) Factory Reset
            {
                key: "factory-reset",
                label: (
                    <Space>
                        <WarningOutlined />
                        Factory Reset
                    </Space>
                ),
                children: (
                    <Row gutter={[12, 12]}>
                        <Col xs={24} lg={10}>
                            <Card
                                style={{ borderRadius: 12, background: "#fff7e6" }}
                                title={<Text strong>Peringatan</Text>}
                            >
                                <ul style={{ paddingLeft: 18, margin: 0 }}>
                                    <li>Gunakan hanya jika benar-benar diperlukan.</li>
                                    <li>Hard reset akan membuat akun admin baru.</li>
                                    <li>Password default: <code>admin123</code>.</li>
                                    <li>Email admin: <code>admin@local.test</code>.</li>
                                </ul>
                            </Card>
                        </Col>
                        <Col xs={24} lg={14}>
                            <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                                <Card
                                    style={{ borderRadius: 12 }}
                                    title={<Text strong>Hard Reset</Text>}
                                >
                                    <Space orientation="vertical">
                                        <Text>
                                            Menghapus semua data dan membuat ulang admin + permission default.
                                        </Text>
                                        <Button danger icon={<ReloadOutlined />} onClick={confirmHardReset}>
                                            Hard Reset
                                        </Button>
                                    </Space>
                                </Card>

                                <Card
                                    style={{ borderRadius: 12 }}
                                    title={<Text strong>Reset Data Iuran & Kas</Text>}
                                >
                                    <Space orientation="vertical">
                                        <Text>
                                            Hanya menghapus data transaksi iuran dan kas, master data tetap.
                                        </Text>
                                        <Button danger icon={<ReloadOutlined />} onClick={confirmFinanceReset}>
                                            Reset Iuran & Kas
                                        </Button>
                                    </Space>
                                </Card>

                                <Card
                                    style={{ borderRadius: 12 }}
                                    title={<Text strong>Hapus per Tabel (Opsional)</Text>}
                                >
                                    <Text type="secondary">
                                        Urutan tabel sudah disesuaikan dengan relasi antar data.
                                    </Text>
                                    <Divider />
                                    <Checkbox.Group
                                        value={selectedResetTables}
                                        onChange={(values) => setSelectedResetTables(values)}
                                        style={{ width: "100%" }}
                                    >
                                        <Space orientation="vertical" style={{ width: "100%" }}>
                                            {resetTableOptions.map((option) => (
                                                <Checkbox value={option.key} key={option.key}>
                                                    <Space orientation="vertical" size={0}>
                                                        <Text>{option.label}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {option.note}
                                                        </Text>
                                                    </Space>
                                                </Checkbox>
                                            ))}
                                        </Space>
                                    </Checkbox.Group>
                                    <Divider />
                                    <Button
                                        danger
                                        icon={<ReloadOutlined />}
                                        disabled={!selectedResetTables.length}
                                        onClick={submitCustomReset}
                                    >
                                        Hapus Tabel Terpilih
                                    </Button>
                                </Card>
                            </Space>
                        </Col>
                    </Row>
                ),
            },
        ];
    }, [
        cashCategories,
        divisions,
        positions,
        paymentStatuses,
        users,
        roles,
        permissions,
        backups,
        backupProcessing,
        canResetPassword,
        activeAccessTab,
        resetTableOptions,
        selectedResetTables,
    ]);

    return (
        <AppLayout title={t("menu.settings")}>
            <PageShell>
                <PageHeader
                    eyebrow="System Control"
                    title={t("settings.title")}
                    description={t("settings.description")}
                />
                <div className="idi-panel finance-settings p-3">
                    <Tabs
                        items={tabs}
                        activeKey={activeSettingsTab}
                        onChange={setActiveSettingsTab}
                        tabBarStyle={{ marginBottom: 12 }}
                    />
                </div>
                <Modal
                    title="Import / Restore Database"
                    open={restoreModalOpen}
                    onCancel={() => {
                        if (!restoreProcessing) {
                            setRestoreModalOpen(false);
                        }
                    }}
                    onOk={submitRestoreBackup}
                    okText="Restore Database"
                    okButtonProps={{
                        danger: true,
                        loading: restoreProcessing,
                    }}
                    cancelText="Batal"
                    destroyOnHidden
                >
                    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                        <Text type="danger">
                            Restore akan menghapus data aktif lalu mengisi ulang
                            database dari file backup SQL. Pastikan Anda sudah
                            membuat backup terbaru sebelum melanjutkan.
                        </Text>

                        <Upload.Dragger
                            accept=".zip,application/zip"
                            maxCount={1}
                            beforeUpload={() => false}
                            fileList={restoreFileList}
                            onRemove={() => {
                                setRestoreFileList([]);
                            }}
                            onChange={({ fileList }) =>
                                setRestoreFileList(fileList.slice(-1))
                            }
                        >
                            <p className="ant-upload-drag-icon">
                                <CloudUploadOutlined />
                            </p>
                            <p className="ant-upload-text">
                                Pilih file backup ZIP
                            </p>
                            <p className="ant-upload-hint">
                                Gunakan file dari tombol Backup Full Database.
                            </p>
                        </Upload.Dragger>

                        <Input
                            value={restoreConfirmation}
                            onChange={(event) =>
                                setRestoreConfirmation(event.target.value)
                            }
                            placeholder='Ketik "RESTORE DATABASE"'
                        />
                    </Space>
                </Modal>
                <Modal
                    title={`Assign Role: ${assignRoleModal.user?.name || ""}`}
                    open={assignRoleModal.open}
                    onCancel={() =>
                        setAssignRoleModal({ open: false, user: null })
                    }
                    onOk={submitAssignRole}
                    okText="Simpan"
                >
                    <Form form={assignRoleForm} layout="vertical">
                        <Form.Item
                            name="role"
                            label="Role"
                            rules={[{ required: true, message: "Role wajib" }]}
                        >
                            <Select
                                placeholder="Pilih role"
                                options={roles.map((role) => ({
                                    value: role.name,
                                    label: role.name,
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Edit User: ${editUserModal.user?.name || ""}`}
                    open={editUserModal.open}
                    onCancel={() =>
                        setEditUserModal({ open: false, user: null })
                    }
                    onOk={submitEditUser}
                    okText="Simpan"
                >
                    <Form form={editUserForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label="Nama"
                            rules={[{ required: true, message: "Nama wajib" }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: "Email wajib" }]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Reset Password: ${resetPasswordModal.user?.name || ""}`}
                    open={resetPasswordModal.open}
                    onCancel={closeResetPassword}
                    onOk={submitResetPassword}
                    okText="Reset Password"
                    okButtonProps={{ danger: true }}
                >
                    <Form
                        form={resetPasswordForm}
                        layout="vertical"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="password"
                            label="Password Baru"
                            rules={[
                                {
                                    required: true,
                                    message: "Password baru wajib",
                                },
                                {
                                    min: 8,
                                    message: "Minimal 8 karakter",
                                },
                            ]}
                        >
                            <Input.Password
                                autoComplete="new-password"
                                placeholder="Password sementara baru..."
                            />
                        </Form.Item>
                        <Form.Item
                            name="password_confirmation"
                            label="Konfirmasi Password"
                            dependencies={["password"]}
                            rules={[
                                {
                                    required: true,
                                    message: "Konfirmasi password wajib",
                                },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (
                                            !value ||
                                            getFieldValue("password") === value
                                        ) {
                                            return Promise.resolve();
                                        }

                                        return Promise.reject(
                                            new Error("Konfirmasi password tidak sama."),
                                        );
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                autoComplete="new-password"
                                placeholder="Ulangi password baru..."
                            />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Sync Permission Role: ${syncRoleModal.role?.name || ""}`}
                    open={syncRoleModal.open}
                    onCancel={() =>
                        setSyncRoleModal({ open: false, role: null })
                    }
                    onOk={submitSyncRolePermissions}
                    okText="Simpan"
                    width={640}
                >
                    <Text type="secondary">
                        Pilih permission yang diberikan ke role.
                    </Text>
                    <Divider />
                    <Checkbox.Group
                        style={{ width: "100%" }}
                        value={selectedRolePermissions}
                        onChange={(value) => setSelectedRolePermissions(value)}
                    >
                        <Row gutter={[8, 8]}>
                            {permissions.map((permission) => (
                                <Col key={permission.id} span={12}>
                                    <Checkbox value={permission.name}>
                                        {permission.name}
                                    </Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Modal>

                <Modal
                    title={`Edit Role: ${editRoleModal.role?.name || ""}`}
                    open={editRoleModal.open}
                    onCancel={() =>
                        setEditRoleModal({ open: false, role: null })
                    }
                    onOk={submitEditRole}
                    okText="Simpan"
                >
                    <Form form={editRoleForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label="Nama Role"
                            rules={[
                                { required: true, message: "Nama role wajib" },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Divisi"
                    open={divisionModalOpen}
                    onCancel={() => {
                        setDivisionModalOpen(false);
                        divisionForm.resetFields();
                    }}
                    onOk={submitDivision}
                    okText="Simpan"
                >
                    <Form
                        form={divisionForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label="Nama Divisi"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama divisi wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Contoh: Keuangan" />
                        </Form.Item>
                        <Form.Item name="code" label="Kode (opsional)">
                            <Input placeholder="DIV-KEU" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Jabatan"
                    open={positionModalOpen}
                    onCancel={() => {
                        setPositionModalOpen(false);
                        positionForm.resetFields();
                    }}
                    onOk={submitPosition}
                    okText="Simpan"
                >
                    <Form
                        form={positionForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label="Nama Jabatan"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama jabatan wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Contoh: Ketua" />
                        </Form.Item>
                        <Form.Item name="code" label="Kode (opsional)">
                            <Input placeholder="JBT-KETUA" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Kategori Cashflow"
                    open={cashCategoryModalOpen}
                    onCancel={() => {
                        setCashCategoryModalOpen(false);
                        cashCategoryForm.resetFields();
                    }}
                    onOk={submitCashCategory}
                    okText="Simpan"
                >
                    <Form
                        form={cashCategoryForm}
                        layout="vertical"
                        initialValues={{ type: "out", is_active: true }}
                    >
                        <Form.Item
                            name="type"
                            label="Tipe"
                            rules={[{ required: true, message: "Tipe wajib" }]}
                        >
                            <Select
                                options={[
                                    { value: "in", label: "Masuk" },
                                    { value: "out", label: "Keluar" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label="Nama Kategori"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama kategori wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Contoh: Operasional" />
                        </Form.Item>
                        <Form.Item name="code" label="Kode (opsional)">
                            <Input placeholder="CASH-OPS" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Metode Bayar"
                    open={cashMethodModalOpen}
                    onCancel={() => {
                        setCashMethodModalOpen(false);
                        cashMethodForm.resetFields();
                    }}
                    onOk={submitCashMethod}
                    okText="Simpan"
                >
                    <Form
                        form={cashMethodForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label="Nama Metode"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama metode wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Contoh: Transfer Bank" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Status Anggota"
                    open={memberStatusModalOpen}
                    onCancel={() => {
                        setMemberStatusModalOpen(false);
                        memberStatusForm.resetFields();
                    }}
                    onOk={submitMemberStatus}
                    okText="Simpan"
                >
                    <Form
                        form={memberStatusForm}
                        layout="vertical"
                        initialValues={{
                            sort_order: (memberStatuses.at(-1)?.sort_order ?? 0) + 10,
                            is_active_member: false,
                            is_billable: false,
                            is_deceased: false,
                            is_active: true,
                        }}
                    >
                        <Form.Item
                            name="code"
                            label="Kode"
                            rules={[{ required: true, message: "Kode wajib" }]}
                        >
                            <Input placeholder="aktif" />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label="Nama Status"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama status wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Aktif" />
                        </Form.Item>
                        <Form.Item name="sort_order" label="Urutan">
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item
                            name="is_active_member"
                            label="Anggota Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_billable"
                            label="Masuk Perhitungan Iuran"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_deceased"
                            label="Status Meninggal"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Status Bayar"
                    open={paymentStatusModalOpen}
                    onCancel={() => {
                        setPaymentStatusModalOpen(false);
                        paymentStatusForm.resetFields();
                    }}
                    onOk={submitPaymentStatus}
                    okText="Simpan"
                >
                    <Form
                        form={paymentStatusForm}
                        layout="vertical"
                        initialValues={{ color: "blue", is_active: true }}
                    >
                        <Form.Item
                            name="code"
                            label="Kode"
                            rules={[{ required: true, message: "Kode wajib" }]}
                        >
                            <Input placeholder="PAID" />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label="Nama Status"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama status wajib",
                                },
                            ]}
                        >
                            <Input placeholder="Lunas" />
                        </Form.Item>
                        <Form.Item name="color" label="Warna Tag">
                            <Input placeholder="blue" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title="Tambah Periode Program Kerja"
                    open={workProgramPeriodModalOpen}
                    onCancel={() => {
                        setWorkProgramPeriodModalOpen(false);
                        workProgramPeriodForm.resetFields();
                    }}
                    onOk={submitWorkProgramPeriod}
                    okText="Simpan"
                >
                    <Form
                        form={workProgramPeriodForm}
                        layout="vertical"
                        initialValues={{
                            start_date: dayjs().startOf("year"),
                            end_date: dayjs().endOf("year"),
                            is_active: true,
                        }}
                    >
                        <Form.Item
                            name="name"
                            label="Nama Periode"
                            rules={[{ required: true, message: "Nama periode wajib" }]}
                        >
                            <Input placeholder="Contoh: Program Kerja 2026" />
                        </Form.Item>
                        <Form.Item name="code" label="Kode (opsional)">
                            <Input placeholder="PROKER-2026" />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="start_date"
                                    label="Tanggal Mulai"
                                    rules={[{ required: true, message: "Tanggal mulai wajib" }]}
                                >
                                    <DatePicker style={{ width: "100%" }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="end_date"
                                    label="Tanggal Selesai"
                                    rules={[{ required: true, message: "Tanggal selesai wajib" }]}
                                >
                                    <DatePicker style={{ width: "100%" }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="notes" label="Catatan">
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Edit ${masterLabels[editMasterModal.type] || "Master Data"}`}
                    open={editMasterModal.open}
                    onCancel={closeEditMaster}
                    onOk={submitEditMaster}
                    okText="Simpan"
                >
                    <Form form={editMasterForm} layout="vertical">
                        {editMasterModal.type === "cash_categories" ? (
                            <Form.Item
                                name="type"
                                label="Tipe"
                                rules={[{ required: true, message: "Tipe wajib" }]}
                            >
                                <Select
                                    options={[
                                        { value: "in", label: "Masuk" },
                                        { value: "out", label: "Keluar" },
                                    ]}
                                />
                            </Form.Item>
                        ) : null}

                        {["member_statuses", "payment_statuses"].includes(
                            editMasterModal.type,
                        ) ? (
                            <Form.Item
                                name="code"
                                label="Kode"
                                rules={[
                                    { required: true, message: "Kode wajib" },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        ) : null}

                        <Form.Item
                            name="name"
                            label={
                                editMasterModal.type === "cash_methods"
                                    ? "Nama Metode"
                                    : "Nama"
                            }
                            rules={[{ required: true, message: "Nama wajib" }]}
                        >
                            <Input />
                        </Form.Item>

                        {[
                            "divisions",
                            "positions",
                            "cash_categories",
                            "work_program_periods",
                        ].includes(editMasterModal.type) ? (
                            <Form.Item name="code" label="Kode (opsional)">
                                <Input />
                            </Form.Item>
                        ) : null}

                        {editMasterModal.type === "work_program_periods" ? (
                            <>
                                <Row gutter={12}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            name="start_date"
                                            label="Tanggal Mulai"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: "Tanggal mulai wajib",
                                                },
                                            ]}
                                        >
                                            <DatePicker style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            name="end_date"
                                            label="Tanggal Selesai"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: "Tanggal selesai wajib",
                                                },
                                            ]}
                                        >
                                            <DatePicker style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="notes" label="Catatan">
                                    <Input.TextArea rows={3} />
                                </Form.Item>
                            </>
                        ) : null}

                        {editMasterModal.type === "payment_statuses" ? (
                            <Form.Item name="color" label="Warna Tag">
                                <Input placeholder="blue" />
                            </Form.Item>
                        ) : null}

                        {editMasterModal.type === "member_statuses" ? (
                            <>
                                <Form.Item name="sort_order" label="Urutan">
                                    <InputNumber
                                        min={0}
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="is_active_member"
                                    label="Anggota Aktif"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                                <Form.Item
                                    name="is_billable"
                                    label="Masuk Perhitungan Iuran"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                                <Form.Item
                                    name="is_deceased"
                                    label="Status Meninggal"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </>
                        ) : null}

                        <Form.Item
                            name="is_active"
                            label="Aktif"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`Sync Permission User: ${syncUserModal.user?.name || ""}`}
                    open={syncUserModal.open}
                    onCancel={() =>
                        setSyncUserModal({ open: false, user: null })
                    }
                    onOk={submitSyncUserPermissions}
                    okText="Simpan"
                    width={640}
                >
                    <Text type="secondary">
                        Permission tambahan khusus user (override per user).
                    </Text>
                    <Divider />
                    <Checkbox.Group
                        style={{ width: "100%" }}
                        value={selectedUserPermissions}
                        onChange={(value) => setSelectedUserPermissions(value)}
                    >
                        <Row gutter={[8, 8]}>
                            {permissions.map((permission) => (
                                <Col key={permission.id} span={12}>
                                    <Checkbox value={permission.name}>
                                        {permission.name}
                                    </Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Modal>

                <Modal
                    title={`Edit Permission: ${editPermissionModal.permission?.name || ""}`}
                    open={editPermissionModal.open}
                    onCancel={() =>
                        setEditPermissionModal({
                            open: false,
                            permission: null,
                        })
                    }
                    onOk={submitEditPermission}
                    okText="Simpan"
                >
                    <Form form={editPermissionForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label="Nama Permission"
                            rules={[
                                {
                                    required: true,
                                    message: "Nama permission wajib",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>
            </PageShell>
        </AppLayout>
    );
}
