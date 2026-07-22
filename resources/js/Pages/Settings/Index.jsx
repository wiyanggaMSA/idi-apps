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
    const tx = (indonesian, english) => (isEn ? english : indonesian);
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
        address: tx("Alamat sekretariat...", "Secretariat address..."),
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
                    message.success(tx("Profil organisasi tersimpan.", "Organization profile saved.")),
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
                    message.success(tx("Pengaturan iuran tersimpan.", "Dues settings saved."));
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
                    message.success(tx("User berhasil ditambahkan.", "User added successfully."));
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
                    message.success(tx("Role berhasil ditambahkan.", "Role added successfully."));
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
                    message.success(tx("Permission berhasil ditambahkan.", "Permission added successfully."));
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
                    message.success(tx("Divisi berhasil ditambahkan.", "Division added successfully."));
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
                    message.success(tx("Jabatan berhasil ditambahkan.", "Position added successfully."));
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
                            tx("Kategori cashflow berhasil ditambahkan.", "Cashflow category added successfully."),
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
                    message.success(tx("Metode bayar berhasil ditambahkan.", "Payment method added successfully."));
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
                    message.success(tx("Status anggota berhasil ditambahkan.", "Member status added successfully."));
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
                        message.success(tx("Status bayar berhasil ditambahkan.", "Payment status added successfully."));
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
                        message.success(tx("Periode program kerja berhasil ditambahkan.", "Work program period added successfully."));
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
        divisions: tx("Divisi", "Division"),
        positions: tx("Jabatan", "Position"),
        cash_categories: tx("Kategori Cashflow", "Cashflow Category"),
        cash_methods: tx("Metode Bayar", "Payment Method"),
        member_statuses: tx("Status Anggota", "Member Status"),
        payment_statuses: tx("Status Bayar", "Payment Status"),
        work_program_periods: tx("Periode Program Kerja", "Work Program Period"),
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
                    message.success(tx(`${masterLabels[type]} berhasil diperbarui.`, `${masterLabels[type]} updated successfully.`));
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
            title: tx("Hapus divisi?", "Remove division?"),
            content: tx(`${division.name} akan dihapus.`, `${division.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.divisions.destroy",
                        division.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Divisi berhasil dihapus.", "Division removed successfully.")),
                    },
                ),
        });
    };

    const confirmDeletePosition = (position) => {
        Modal.confirm({
            title: tx("Hapus jabatan?", "Remove position?"),
            content: tx(`${position.name} akan dihapus.`, `${position.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.positions.destroy",
                        position.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Jabatan berhasil dihapus.", "Position removed successfully.")),
                    },
                ),
        });
    };

    const confirmDeleteCashCategory = (category) => {
        Modal.confirm({
            title: tx("Hapus kategori cashflow?", "Remove cashflow category?"),
            content: tx(`${category.name} akan dihapus.`, `${category.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
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
                                tx("Kategori cashflow berhasil dihapus.", "Cashflow category removed successfully."),
                            ),
                    },
                ),
        });
    };

    const confirmDeleteCashMethod = (method) => {
        Modal.confirm({
            title: tx("Hapus metode bayar?", "Remove payment method?"),
            content: tx(`${method.name} akan dihapus.`, `${method.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.cash-methods.destroy",
                        method.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Metode bayar berhasil dihapus.", "Payment method removed successfully.")),
                    },
                ),
        });
    };

    const confirmDeletePaymentStatus = (status) => {
        Modal.confirm({
            title: tx("Hapus status bayar?", "Remove payment status?"),
            content: tx(`${status.name} akan dihapus.`, `${status.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.payment-statuses.destroy",
                        status.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Status bayar berhasil dihapus.", "Payment status removed successfully.")),
                    },
                ),
        });
    };

    const confirmDeleteMemberStatus = (status) => {
        Modal.confirm({
            title: tx("Hapus status anggota?", "Remove member status?"),
            content: tx(`${status.name} akan dihapus.`, `${status.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.member-statuses.destroy",
                        status.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Status anggota berhasil dihapus.", "Member status removed successfully.")),
                    },
                ),
        });
    };

    const confirmDeleteWorkProgramPeriod = (period) => {
        Modal.confirm({
            title: tx("Hapus periode program kerja?", "Remove work program period?"),
            content: tx(`${period.name} akan dihapus jika belum dipakai oleh program.`, `${period.name} will be removed if it is not used by a program.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.delete(
                    route(
                        "settings.master-data.work-program-periods.destroy",
                        period.id,
                    ),
                    {
                        preserveScroll: true,
                        onSuccess: () =>
                            message.success(tx("Periode program kerja berhasil dihapus.", "Work program period removed successfully.")),
                    },
                ),
        });
    };

    const confirmDisableUser = (user) => {
        Modal.confirm({
            title: tx("Nonaktifkan user?", "Deactivate user?"),
            content: tx(`${user.name} akan dinonaktifkan.`, `${user.name} will be deactivated.`),
            okText: tx("Nonaktifkan", "Deactivate"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
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
                        message.success(tx("User berhasil diperbarui.", "User updated successfully."));
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
                        message.success(tx("Password user berhasil direset.", "User password reset successfully."));
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
                        message.success(tx("Role user diperbarui.", "User role updated."));
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
                        message.success(tx("Role berhasil diperbarui.", "Role updated successfully."));
                    },
                },
            );
        } catch {}
    };

    const confirmDeleteRole = (role) => {
        Modal.confirm({
            title: tx("Hapus role?", "Remove role?"),
            content: tx(`Role ${role.name} akan dihapus.`, `Role ${role.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
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
                    message.success(tx("Permission role diperbarui.", "Role permissions updated."));
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
                        message.success(tx("Permission berhasil diperbarui.", "Permission updated successfully."));
                    },
                },
            );
        } catch {}
    };

    const confirmDeletePermission = (permission) => {
        Modal.confirm({
            title: tx("Hapus permission?", "Remove permission?"),
            content: tx(`${permission.name} akan dihapus.`, `${permission.name} will be removed.`),
            okText: tx("Hapus", "Remove"),
            okButtonProps: { danger: true },
            cancelText: tx("Batal", "Cancel"),
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
                    message.success(tx("Permission user diperbarui.", "User permissions updated."));
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
        ].map((option) => ({
            ...option,
            note: isEn
                ? option.key.replaceAll("_", " ")
                : option.note,
        })),
        [isEn],
    );

    const confirmHardReset = () => {
        Modal.confirm({
            title: "Hard Reset",
            content: tx("Aksi ini akan menghapus semua data dan membuat akun admin baru. Lanjutkan?", "This action will delete all data and create a new administrator account. Continue?"),
            okText: tx("Ya, Reset", "Yes, Reset"),
            okType: "danger",
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.post(route("settings.factory-reset.hard"), {}, { preserveScroll: true }),
        });
    };

    const confirmFinanceReset = () => {
        Modal.confirm({
            title: tx("Reset Data Iuran & Kas", "Reset Dues & Cash Data"),
            content: tx("Aksi ini menghapus transaksi iuran dan kas saja. Lanjutkan?", "This action deletes dues and cash transactions only. Continue?"),
            okText: tx("Ya, Reset", "Yes, Reset"),
            okType: "danger",
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.post(route("settings.factory-reset.finance"), {}, { preserveScroll: true }),
        });
    };

    const submitCustomReset = () => {
        Modal.confirm({
            title: tx("Hapus Tabel Terpilih", "Clear Selected Tables"),
            content: tx("Tabel yang dipilih akan dikosongkan sesuai urutan. Lanjutkan?", "The selected tables will be cleared in order. Continue?"),
            okText: tx("Ya, Hapus", "Yes, Clear"),
            okType: "danger",
            cancelText: tx("Batal", "Cancel"),
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
            content: tx("Sistem akan membuat file ZIP berisi database.sql untuk seluruh tabel database. File ini bisa digunakan untuk restore database nanti.", "The system will create a ZIP file containing database.sql for all database tables. This file can be used to restore the database later."),
            okText: tx("Buat Backup", "Create Backup"),
            cancelText: tx("Batal", "Cancel"),
            onOk: () =>
                router.post(
                    route("settings.backups.store"),
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => setBackupProcessing(true),
                        onSuccess: () =>
                            message.success(tx("Backup full database dibuat.", "Full database backup created.")),
                        onError: (errors) =>
                            message.error(
                                errors.backup ||
                                    tx("Backup database gagal dibuat.", "Database backup could not be created."),
                            ),
                        onFinish: () => setBackupProcessing(false),
                    },
                ),
        });
    };

    const submitRestoreBackup = () => {
        const file = restoreFileList[0]?.originFileObj || restoreFileList[0];

        if (!file) {
            message.warning(tx("Pilih file backup ZIP terlebih dahulu.", "Select a backup ZIP file first."));
            return;
        }

        if (restoreConfirmation !== "RESTORE DATABASE") {
            message.warning(tx('Ketik "RESTORE DATABASE" untuk konfirmasi.', 'Type "RESTORE DATABASE" to confirm.'));
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
                message.success(tx("Restore database berhasil.", "Database restored successfully."));
            },
            onError: (errors) =>
                message.error(
                    errors.backup_file || tx("Restore database gagal diproses.", "Database restoration could not be processed."),
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
                        {tx("Profil Organisasi", "Organization Profile")}
                    </Space>
                ),
                children: (
                    <Row gutter={[12, 12]}>
                        <Col xs={24} lg={14}>
                            <Card
                                style={{ borderRadius: 12 }}
                                title={<Text strong>{tx("Profil Organisasi", "Organization Profile")}</Text>}
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
                                                label={tx("Nama Organisasi", "Organization Name")}
                                                name="org_name"
                                                rules={[
                                                    {
                                                        required: true,
                                                        message:
                                                            tx("Nama organisasi wajib", "Organization name is required"),
                                                    },
                                                ]}
                                            >
                                                <Input />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label={tx("Telepon", "Phone")}
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
                                                label={tx("Alamat", "Address")}
                                                name="address"
                                            >
                                                <Input.TextArea rows={3} />
                                            </Form.Item>
                                        </Col>

                                        <Col xs={24} md={12}>
                                            <Form.Item
                                                label={tx("Mata Uang", "Currency")}
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
                                            <Form.Item label={tx("Logo Organisasi", "Organization Logo")}>
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
                                                            alt={tx("Logo organisasi", "Organization logo")}
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
                                                            {tx("Pilih Logo", "Choose Logo")}
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
                                                {tx("Simpan", "Save")}
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
                                title={<Text strong>{tx("Catatan", "Notes")}</Text>}
                            >
                                <li>
                                    {tx("Profil organisasi disimpan ke", "The organization profile is stored in")}{" "}
                                    <code>app_settings</code>{" "}
                                    {tx("dan dipakai oleh tampilan aplikasi, surat, dan verifikasi.", "and used by the application UI, letters, and verification pages.")}
                                </li>
                                <li>
                                    {tx("Nama organisasi tampil di header & sidebar sebagai identitas.", "The organization name appears in the header and sidebar as its identity.")}
                                </li>
                                <li>
                                    {tx("Logo, alamat, telepon, dan email dipakai untuk kop surat dan halaman verifikasi.", "The logo, address, phone, and email are used for letterheads and verification pages.")}
                                </li>
                                <li>
                                    {tx("Timezone dipakai untuk tanggal transaksi & surat.", "The timezone is used for transaction and letter dates.")}
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
                                    label: tx("Divisi", "Divisions"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={divisions}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>{tx("Divisi", "Divisions")}</Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setDivisionModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Nama Divisi", "Division Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Jabatan", "Positions"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={positions}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>{tx("Jabatan", "Positions")}</Text>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() =>
                                                            setPositionModalOpen(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Nama Jabatan", "Position Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Kategori Cashflow", "Cashflow Categories"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={cashCategories}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        {tx("Kategori Cashflow", "Cashflow Categories")}
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
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Tipe", "Type"),
                                                    dataIndex: "type",
                                                    key: "type",
                                                    width: 110,
                                                    render: (v) =>
                                                        v === "in" ? (
                                                            <Tag color="green">
                                                                {tx("MASUK", "INCOME")}
                                                            </Tag>
                                                        ) : (
                                                            <Tag color="red">
                                                                {tx("KELUAR", "EXPENSE")}
                                                            </Tag>
                                                        ),
                                                },
                                                {
                                                    title: tx("Nama Kategori", "Category Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Metode Bayar", "Payment Methods"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={cashMethods}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        {tx("Metode Bayar", "Payment Methods")}
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
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Nama Metode", "Method Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Status Anggota", "Member Statuses"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={memberStatuses}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        {tx("Status Anggota", "Member Statuses")}
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
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Kode", "Code"),
                                                    dataIndex: "code",
                                                    key: "code",
                                                    width: 120,
                                                },
                                                {
                                                    title: tx("Nama", "Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: "Flags",
                                                    key: "flags",
                                                    render: (_, r) => (
                                                        <Space wrap>
                                                            {r.is_active_member ? (
                                                                <Tag color="green">{tx("Anggota Aktif", "Active Member")}</Tag>
                                                            ) : null}
                                                            {r.is_billable ? (
                                                                <Tag color="blue">{tx("Ditagih", "Billable")}</Tag>
                                                            ) : null}
                                                            {r.is_deceased ? (
                                                                <Tag color="red">{tx("Meninggal", "Deceased")}</Tag>
                                                            ) : null}
                                                            {!r.is_active ? (
                                                                <Tag>{tx("Tidak Aktif", "Inactive")}</Tag>
                                                            ) : null}
                                                        </Space>
                                                    ),
                                                },
                                                {
                                                    title: tx("Urutan", "Order"),
                                                    dataIndex: "sort_order",
                                                    key: "sort_order",
                                                    width: 90,
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Status Bayar", "Payment Statuses"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={paymentStatuses}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        {tx("Status Bayar", "Payment Statuses")}
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
                                                        {tx("Tambah", "Add")}
                                                    </Button>
                                                </Space>
                                            )}
                                            columns={[
                                                {
                                                    title: tx("Kode", "Code"),
                                                    dataIndex: "code",
                                                    key: "code",
                                                    width: 120,
                                                },
                                                {
                                                    title: tx("Nama", "Name"),
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
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Periode Program Kerja", "Work Program Periods"),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            dataSource={workProgramPeriods}
                                            rowKey="id"
                                            title={() => (
                                                <Space>
                                                    <Text strong>
                                                        {tx("Periode Program Kerja", "Work Program Periods")}
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
                                                        {tx("Tambah", "Add")}
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
                                                    title: tx("Nama", "Name"),
                                                    dataIndex: "name",
                                                    key: "name",
                                                },
                                                {
                                                    title: tx("Tanggal", "Dates"),
                                                    key: "date_range",
                                                    width: 230,
                                                    render: (_, record) =>
                                                        `${dayjs(record.start_date).format("DD MMM YYYY")} - ${dayjs(record.end_date).format("DD MMM YYYY")}`,
                                                },
                                                {
                                                    title: tx("Status", "Status"),
                                                    dataIndex: "is_active",
                                                    key: "is_active",
                                                    width: 110,
                                                    render: (value) =>
                                                        value ? (
                                                            <Tag color="green">{tx("Aktif", "Active")}</Tag>
                                                        ) : (
                                                            <Tag>{tx("Tidak Aktif", "Inactive")}</Tag>
                                                        ),
                                                },
                                                {
                                                    title: tx("Catatan", "Notes"),
                                                    dataIndex: "notes",
                                                    key: "notes",
                                                    ellipsis: true,
                                                    render: (value) => value || "-",
                                                },
                                                {
                                                    title: tx("Aksi", "Actions"),
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
                                    label: tx("Pengaturan Iuran", "Dues Settings"),
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
                                                            label={tx("Nominal Iuran (default)", "Default Dues Amount")}
                                                            name="dues_amount"
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        tx("Nominal wajib", "Amount is required"),
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
                                                            label={tx("Jatuh Tempo (tanggal setiap bulan)", "Due Date (day of each month)")}
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
                                                            label={tx("Masa Tenggang (hari)", "Grace Period (days)")}
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
                                                            label={tx("Auto tandai menunggak", "Automatically mark as overdue")}
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
                                                            {tx("Simpan", "Save")}
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
                        {tx("User & Permission", "Users & Permissions")}
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
                                                            {tx("Tambah User", "Add User")}
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
                                                                    label={tx("Nama", "Name")}
                                                                    rules={[
                                                                        {
                                                                            required: true,
                                                                            message:
                                                                                tx("Nama wajib", "Name is required"),
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Input placeholder={tx("Nama user...", "User name...")} />
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
                                                                                tx("Email wajib", "Email is required"),
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
                                                                                tx("Role wajib", "Role is required"),
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Select
                                                                        placeholder={tx("Pilih role", "Select role")}
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
                                                                                tx("Password wajib", "Password is required"),
                                                                        },
                                                                        {
                                                                            min: 8,
                                                                            message:
                                                                                tx("Minimal 8 karakter", "At least 8 characters"),
                                                                        },
                                                                    ]}
                                                                >
                                                                    <Input.Password placeholder={tx("Password sementara...", "Temporary password...")} />
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
                                                        {tx("Tambah", "Add")}
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
                                                            {tx("Daftar User", "User List")}
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
                                                                title: tx("Nama", "Name"),
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
                                                                            {tx("Tanpa Role", "No Role")}
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
                                                                            ? tx("AKTIF", "ACTIVE")
                                                                            : tx("NONAKTIF", "INACTIVE")}
                                                                    </Tag>
                                                                ),
                                                            },
                                                            {
                                                                title: tx("Aksi", "Actions"),
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
                                                                            {tx("Tetapkan Role", "Assign Role")}
                                                                        </Button>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() =>
                                                                                openSyncUserPermissions(
                                                                                    r,
                                                                                )
                                                                            }
                                                                        >
                                                                            {tx("Sinkronisasi Permission", "Sync Permissions")}
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
                                                        {tx("*Data diambil dari Spatie Permission (roles/permissions).", "*Data is loaded from Spatie Permission (roles/permissions).")}
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
                                                            {tx("Tambah Role", "Add Role")}
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
                                                            label={tx("Nama Role", "Role Name")}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        tx("Nama role wajib", "Role name is required"),
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder={tx("Contoh: Admin", "Example: Admin")} />
                                                        </Form.Item>
                                                        <Button
                                                            type="primary"
                                                            icon={
                                                                <PlusOutlined />
                                                            }
                                                            onClick={addRole}
                                                        >
                                                            {tx("Tambah Role", "Add Role")}
                                                        </Button>
                                                    </Form>
                                                </Card>
                                            </Col>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            {tx("Daftar Role", "Role List")}
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
                                                                title: tx("Nama", "Name"),
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
                                                                title: tx("Aksi", "Actions"),
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
                                                            {tx("Tambah Permission", "Add Permission")}
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
                                                            label={tx("Nama Permission", "Permission Name")}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message:
                                                                        tx("Nama permission wajib", "Permission name is required"),
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder={tx("Contoh: users.view", "Example: users.view")} />
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
                                                            {tx("Tambah Permission", "Add Permission")}
                                                        </Button>
                                                    </Form>
                                                </Card>
                                            </Col>
                                            <Col xs={24} lg={12}>
                                                <Card
                                                    style={{ borderRadius: 12 }}
                                                    title={
                                                        <Text strong>
                                                            {tx("Daftar Permission", "Permission List")}
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
                                                                title: tx("Nama", "Name"),
                                                                dataIndex:
                                                                    "name",
                                                                key: "name",
                                                            },
                                                            {
                                                                title: tx("Aksi", "Actions"),
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
                        {tx("Backup & Export Data", "Backup & Data Export")}
                    </Space>
                ),
                children: (
                    <Row gutter={[12, 12]}>
                        <Col xs={24} lg={15}>
                            <Card
                                style={{ borderRadius: 12 }}
                                title={<Text strong>{tx("Backup Sistem", "System Backup")}</Text>}
                            >
                                <Text type="secondary">
                                    {tx("Backup seluruh tabel database ke file ZIP berisi database.sql untuk migrasi, pemulihan sistem, atau reimport oleh admin. File ini bukan laporan harian.", "Back up all database tables to a ZIP file containing database.sql for migration, system recovery, or administrator reimport. This file is not a daily report.")}
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
                                            {tx("Khusus Admin Sistem", "System Administrators Only")}
                                        </Tag>
                                    </Space>
                                </div>
                            </Card>

                            <Card
                                style={{ borderRadius: 12, marginTop: 12 }}
                                title={<Text strong>{tx("Export Data Siap Pakai", "Ready-to-Use Data Export")}</Text>}
                            >
                                <Text type="secondary">
                                    {tx("Export untuk arsip dan laporan yang mudah dibuka oleh pengurus non-teknis. File ini tidak ditujukan untuk restore database.", "Export archives and reports that non-technical board members can open easily. These files are not intended for database restoration.")}
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
                                            {tx("Export Anggota", "Export Members")}
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                (window.location.href = route(
                                                    "dues.recap.export",
                                                ))
                                            }
                                            icon={<FileExcelOutlined />}
                                        >
                                            {tx("Export Rekap Iuran", "Export Dues Recap")}
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                (window.location.href = route(
                                                    "reports.export",
                                                ))
                                            }
                                            icon={<CloudDownloadOutlined />}
                                        >
                                            {tx("Buka Pusat Export", "Open Export Center")}
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
                                        <Text strong>{tx("Riwayat Backup Sistem", "System Backup History")}</Text>
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
                                                                ? tx("Backup Keuangan", "Financial Backup")
                                                                : backup.scope ===
                                                                    "all"
                                                                  ? "Backup Full Database"
                                                                  : tx("Backup Anggota", "Member Backup")}
                                                        </Text>
                                                        <br />
                                                        <Text type="secondary">
                                                            {backup.created_at}
                                                        </Text>
                                                        {backup.created_by ? (
                                                            <>
                                                                <br />
                                                                <Text type="secondary">
                                                                    {tx("Oleh", "By")}{" "}
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
                                                            {tx("Berhasil", "Successful")}
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
                                            {tx("Belum ada riwayat backup sistem.", "No system backup history yet.")}
                                        </Text>
                                    )}
                                </Space>

                                <Divider style={{ margin: "16px 0" }} />

                                <Text type="secondary">
                                    {tx("Backup baru berisi", "New backups contain")} <code>database.sql</code>{" "}
                                    {tx("untuk restore database. Backup format lama tetap bisa di-restore bila ZIP masih memuat", "for database restoration. Legacy backups can still be restored if the ZIP contains")} <code>database.json</code>.
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
                                title={<Text strong>{tx("Peringatan", "Warning")}</Text>}
                            >
                                <ul style={{ paddingLeft: 18, margin: 0 }}>
                                    <li>{tx("Gunakan hanya jika benar-benar diperlukan.", "Use only when absolutely necessary.")}</li>
                                    <li>{tx("Hard reset akan membuat akun admin baru.", "A hard reset will create a new administrator account.")}</li>
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
                                            {tx("Menghapus semua data dan membuat ulang admin + permission default.", "Deletes all data and recreates the administrator account and default permissions.")}
                                        </Text>
                                        <Button danger icon={<ReloadOutlined />} onClick={confirmHardReset}>
                                            Hard Reset
                                        </Button>
                                    </Space>
                                </Card>

                                <Card
                                    style={{ borderRadius: 12 }}
                                    title={<Text strong>{tx("Reset Data Iuran & Kas", "Reset Dues & Cash Data")}</Text>}
                                >
                                    <Space orientation="vertical">
                                        <Text>
                                            {tx("Hanya menghapus data transaksi iuran dan kas, master data tetap.", "Deletes dues and cash transactions only; master data remains intact.")}
                                        </Text>
                                        <Button danger icon={<ReloadOutlined />} onClick={confirmFinanceReset}>
                                            {tx("Reset Iuran & Kas", "Reset Dues & Cash")}
                                        </Button>
                                    </Space>
                                </Card>

                                <Card
                                    style={{ borderRadius: 12 }}
                                    title={<Text strong>{tx("Hapus per Tabel (Opsional)", "Clear Individual Tables (Optional)")}</Text>}
                                >
                                    <Text type="secondary">
                                        {tx("Urutan tabel sudah disesuaikan dengan relasi antar data.", "The table order has been adjusted for data relationships.")}
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
                                        {tx("Hapus Tabel Terpilih", "Clear Selected Tables")}
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
        cashMethods,
        divisions,
        duesSettings,
        isEn,
        memberStatuses,
        positions,
        paymentStatuses,
        workProgramPeriods,
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
                    title={tx("Import / Restore Database", "Import / Restore Database")}
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
                    cancelText={tx("Batal", "Cancel")}
                    destroyOnHidden
                >
                    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                        <Text type="danger">
                            {tx("Restore akan menghapus data aktif lalu mengisi ulang database dari file backup SQL. Pastikan Anda sudah membuat backup terbaru sebelum melanjutkan.", "Restoring will delete active data and reload the database from the SQL backup file. Make sure you have created a recent backup before continuing.")}
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
                                {tx("Pilih file backup ZIP", "Select a backup ZIP file")}
                            </p>
                            <p className="ant-upload-hint">
                                {tx("Gunakan file dari tombol Backup Full Database.", "Use a file created by the Full Database Backup button.")}
                            </p>
                        </Upload.Dragger>

                        <Input
                            value={restoreConfirmation}
                            onChange={(event) =>
                                setRestoreConfirmation(event.target.value)
                            }
                            placeholder={tx('Ketik "RESTORE DATABASE"', 'Type "RESTORE DATABASE"')}
                        />
                    </Space>
                </Modal>
                <Modal
                    title={`${tx("Tetapkan Role", "Assign Role")}: ${assignRoleModal.user?.name || ""}`}
                    open={assignRoleModal.open}
                    onCancel={() =>
                        setAssignRoleModal({ open: false, user: null })
                    }
                    onOk={submitAssignRole}
                    okText={tx("Simpan", "Save")}
                >
                    <Form form={assignRoleForm} layout="vertical">
                        <Form.Item
                            name="role"
                            label="Role"
                            rules={[{ required: true, message: tx("Role wajib", "Role is required") }]}
                        >
                            <Select
                                placeholder={tx("Pilih role", "Select role")}
                                options={roles.map((role) => ({
                                    value: role.name,
                                    label: role.name,
                                }))}
                            />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`${tx("Edit User", "Edit User")}: ${editUserModal.user?.name || ""}`}
                    open={editUserModal.open}
                    onCancel={() =>
                        setEditUserModal({ open: false, user: null })
                    }
                    onOk={submitEditUser}
                    okText={tx("Simpan", "Save")}
                >
                    <Form form={editUserForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label={tx("Nama", "Name")}
                            rules={[{ required: true, message: tx("Nama wajib", "Name is required") }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: tx("Email wajib", "Email is required") }]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`${tx("Reset Kata Sandi", "Reset Password")}: ${resetPasswordModal.user?.name || ""}`}
                    open={resetPasswordModal.open}
                    onCancel={closeResetPassword}
                    onOk={submitResetPassword}
                    okText={tx("Reset Kata Sandi", "Reset Password")}
                    okButtonProps={{ danger: true }}
                >
                    <Form
                        form={resetPasswordForm}
                        layout="vertical"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="password"
                            label={tx("Password Baru", "New Password")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Password baru wajib", "New password is required"),
                                },
                                {
                                    min: 8,
                                    message: "Minimal 8 karakter",
                                },
                            ]}
                        >
                            <Input.Password
                                autoComplete="new-password"
                                placeholder={tx("Password sementara baru...", "New temporary password...")}
                            />
                        </Form.Item>
                        <Form.Item
                            name="password_confirmation"
                            label={tx("Konfirmasi Password", "Confirm Password")}
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
                                placeholder={tx("Ulangi password baru...", "Repeat the new password...")}
                            />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`${tx("Sinkronisasi Permission Role", "Sync Role Permissions")}: ${syncRoleModal.role?.name || ""}`}
                    open={syncRoleModal.open}
                    onCancel={() =>
                        setSyncRoleModal({ open: false, role: null })
                    }
                    onOk={submitSyncRolePermissions}
                    okText={tx("Simpan", "Save")}
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
                    title={`${tx("Edit Role", "Edit Role")}: ${editRoleModal.role?.name || ""}`}
                    open={editRoleModal.open}
                    onCancel={() =>
                        setEditRoleModal({ open: false, role: null })
                    }
                    onOk={submitEditRole}
                    okText={tx("Simpan", "Save")}
                >
                    <Form form={editRoleForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label={tx("Nama Role", "Role Name")}
                            rules={[
                                { required: true, message: tx("Nama role wajib", "Role name is required") },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Divisi", "Add Division")}
                    open={divisionModalOpen}
                    onCancel={() => {
                        setDivisionModalOpen(false);
                        divisionForm.resetFields();
                    }}
                    onOk={submitDivision}
                    okText={tx("Simpan", "Save")}
                >
                    <Form
                        form={divisionForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label={tx("Nama Divisi", "Division Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama divisi wajib", "Division name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Contoh: Keuangan", "Example: Finance")} />
                        </Form.Item>
                        <Form.Item name="code" label={tx("Kode (opsional)", "Code (optional)")}>
                            <Input placeholder="DIV-KEU" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Jabatan", "Add Position")}
                    open={positionModalOpen}
                    onCancel={() => {
                        setPositionModalOpen(false);
                        positionForm.resetFields();
                    }}
                    onOk={submitPosition}
                    okText={tx("Simpan", "Save")}
                >
                    <Form
                        form={positionForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label={tx("Nama Jabatan", "Position Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama jabatan wajib", "Position name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Contoh: Ketua", "Example: Chair") } />
                        </Form.Item>
                        <Form.Item name="code" label={tx("Kode (opsional)", "Code (optional)")}>
                            <Input placeholder="JBT-KETUA" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Kategori Cashflow", "Add Cashflow Category")}
                    open={cashCategoryModalOpen}
                    onCancel={() => {
                        setCashCategoryModalOpen(false);
                        cashCategoryForm.resetFields();
                    }}
                    onOk={submitCashCategory}
                    okText={tx("Simpan", "Save")}
                >
                    <Form
                        form={cashCategoryForm}
                        layout="vertical"
                        initialValues={{ type: "out", is_active: true }}
                    >
                        <Form.Item
                            name="type"
                            label={tx("Tipe", "Type")}
                            rules={[{ required: true, message: tx("Tipe wajib", "Type is required") }]}
                        >
                            <Select
                                options={[
                                    { value: "in", label: tx("Masuk", "Income") },
                                    { value: "out", label: tx("Keluar", "Expense") },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label={tx("Nama Kategori", "Category Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama kategori wajib", "Category name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Contoh: Operasional", "Example: Operations")} />
                        </Form.Item>
                        <Form.Item name="code" label={tx("Kode (opsional)", "Code (optional)")}>
                            <Input placeholder="CASH-OPS" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Metode Bayar", "Add Payment Method")}
                    open={cashMethodModalOpen}
                    onCancel={() => {
                        setCashMethodModalOpen(false);
                        cashMethodForm.resetFields();
                    }}
                    onOk={submitCashMethod}
                    okText={tx("Simpan", "Save")}
                >
                    <Form
                        form={cashMethodForm}
                        layout="vertical"
                        initialValues={{ is_active: true }}
                    >
                        <Form.Item
                            name="name"
                            label={tx("Nama Metode", "Method Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama metode wajib", "Method name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Contoh: Transfer Bank", "Example: Bank Transfer")} />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Status Anggota", "Add Member Status")}
                    open={memberStatusModalOpen}
                    onCancel={() => {
                        setMemberStatusModalOpen(false);
                        memberStatusForm.resetFields();
                    }}
                    onOk={submitMemberStatus}
                    okText={tx("Simpan", "Save")}
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
                            rules={[{ required: true, message: tx("Kode wajib", "Code is required") }]}
                        >
                            <Input placeholder="aktif" />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label={tx("Nama Status", "Status Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama status wajib", "Status name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Aktif", "Active")} />
                        </Form.Item>
                        <Form.Item name="sort_order" label={tx("Urutan", "Order")}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item
                            name="is_active_member"
                            label={tx("Anggota Aktif", "Active Member")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_billable"
                            label={tx("Masuk Perhitungan Iuran", "Included in Dues Calculation")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_deceased"
                            label={tx("Status Meninggal", "Deceased Status")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Status Bayar", "Add Payment Status")}
                    open={paymentStatusModalOpen}
                    onCancel={() => {
                        setPaymentStatusModalOpen(false);
                        paymentStatusForm.resetFields();
                    }}
                    onOk={submitPaymentStatus}
                    okText={tx("Simpan", "Save")}
                >
                    <Form
                        form={paymentStatusForm}
                        layout="vertical"
                        initialValues={{ color: "blue", is_active: true }}
                    >
                        <Form.Item
                            name="code"
                            label="Kode"
                            rules={[{ required: true, message: tx("Kode wajib", "Code is required") }]}
                        >
                            <Input placeholder="PAID" />
                        </Form.Item>
                        <Form.Item
                            name="name"
                            label={tx("Nama Status", "Status Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama status wajib", "Status name is required"),
                                },
                            ]}
                        >
                            <Input placeholder={tx("Lunas", "Paid")} />
                        </Form.Item>
                        <Form.Item name="color" label={tx("Warna Tag", "Tag Color")}>
                            <Input placeholder="blue" />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={tx("Tambah Periode Program Kerja", "Add Work Program Period")}
                    open={workProgramPeriodModalOpen}
                    onCancel={() => {
                        setWorkProgramPeriodModalOpen(false);
                        workProgramPeriodForm.resetFields();
                    }}
                    onOk={submitWorkProgramPeriod}
                    okText={tx("Simpan", "Save")}
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
                            label={tx("Nama Periode", "Period Name")}
                            rules={[{ required: true, message: tx("Nama periode wajib", "Period name is required") }]}
                        >
                            <Input placeholder={tx("Contoh: Program Kerja 2026", "Example: 2026 Work Program")} />
                        </Form.Item>
                        <Form.Item name="code" label={tx("Kode (opsional)", "Code (optional)")}>
                            <Input placeholder="PROKER-2026" />
                        </Form.Item>
                        <Row gutter={12}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="start_date"
                                    label={tx("Tanggal Mulai", "Start Date")}
                                    rules={[{ required: true, message: tx("Tanggal mulai wajib", "Start date is required") }]}
                                >
                                    <DatePicker style={{ width: "100%" }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="end_date"
                                    label={tx("Tanggal Selesai", "End Date")}
                                    rules={[{ required: true, message: tx("Tanggal selesai wajib", "End date is required") }]}
                                >
                                    <DatePicker style={{ width: "100%" }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="notes" label={tx("Catatan", "Notes")}>
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
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
                    okText={tx("Simpan", "Save")}
                >
                    <Form form={editMasterForm} layout="vertical">
                        {editMasterModal.type === "cash_categories" ? (
                            <Form.Item
                                name="type"
                            label={tx("Tipe", "Type")}
                                rules={[{ required: true, message: tx("Tipe wajib", "Type is required") }]}
                            >
                                <Select
                                    options={[
                                        { value: "in", label: tx("Masuk", "Income") },
                                        { value: "out", label: tx("Keluar", "Expense") },
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
                                    { required: true, message: tx("Kode wajib", "Code is required") },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        ) : null}

                        <Form.Item
                            name="name"
                            label={
                                editMasterModal.type === "cash_methods"
                                    ? tx("Nama Metode", "Method Name")
                                    : tx("Nama", "Name")
                            }
                            rules={[{ required: true, message: tx("Nama wajib", "Name is required") }]}
                        >
                            <Input />
                        </Form.Item>

                        {[
                            "divisions",
                            "positions",
                            "cash_categories",
                            "work_program_periods",
                        ].includes(editMasterModal.type) ? (
                            <Form.Item name="code" label={tx("Kode (opsional)", "Code (optional)")}>
                                <Input />
                            </Form.Item>
                        ) : null}

                        {editMasterModal.type === "work_program_periods" ? (
                            <>
                                <Row gutter={12}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            name="start_date"
                                            label={tx("Tanggal Mulai", "Start Date")}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: tx("Tanggal mulai wajib", "Start date is required"),
                                                },
                                            ]}
                                        >
                                            <DatePicker style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            name="end_date"
                                            label={tx("Tanggal Selesai", "End Date")}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: tx("Tanggal selesai wajib", "End date is required"),
                                                },
                                            ]}
                                        >
                                            <DatePicker style={{ width: "100%" }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="notes" label={tx("Catatan", "Notes")}>
                                    <Input.TextArea rows={3} />
                                </Form.Item>
                            </>
                        ) : null}

                        {editMasterModal.type === "payment_statuses" ? (
                            <Form.Item name="color" label={tx("Warna Tag", "Tag Color")}>
                                <Input placeholder="blue" />
                            </Form.Item>
                        ) : null}

                        {editMasterModal.type === "member_statuses" ? (
                            <>
                                <Form.Item name="sort_order" label={tx("Urutan", "Order")}>
                                    <InputNumber
                                        min={0}
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="is_active_member"
                                    label={tx("Anggota Aktif", "Active Member")}
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                                <Form.Item
                                    name="is_billable"
                                    label={tx("Masuk Perhitungan Iuran", "Included in Dues Calculation")}
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                                <Form.Item
                                    name="is_deceased"
                                    label={tx("Status Meninggal", "Deceased Status")}
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            </>
                        ) : null}

                        <Form.Item
                            name="is_active"
                            label={tx("Aktif", "Active")}
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal
                    title={`${tx("Sinkronisasi Permission User", "Sync User Permissions")}: ${syncUserModal.user?.name || ""}`}
                    open={syncUserModal.open}
                    onCancel={() =>
                        setSyncUserModal({ open: false, user: null })
                    }
                    onOk={submitSyncUserPermissions}
                    okText={tx("Simpan", "Save")}
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
                    title={`${tx("Edit Permission", "Edit Permission")}: ${editPermissionModal.permission?.name || ""}`}
                    open={editPermissionModal.open}
                    onCancel={() =>
                        setEditPermissionModal({
                            open: false,
                            permission: null,
                        })
                    }
                    onOk={submitEditPermission}
                    okText={tx("Simpan", "Save")}
                >
                    <Form form={editPermissionForm} layout="vertical">
                        <Form.Item
                            name="name"
                            label={tx("Nama Permission", "Permission Name")}
                            rules={[
                                {
                                    required: true,
                                    message: tx("Nama permission wajib", "Permission name is required"),
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
