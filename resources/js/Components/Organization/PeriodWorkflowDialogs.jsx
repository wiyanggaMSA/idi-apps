import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    CopyOutlined,
    ExclamationCircleOutlined,
    RocketOutlined,
    StopOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Descriptions,
    Drawer,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Spin,
    Statistic,
    Tag,
    message,
} from "antd";
import useBilingual from "@/Hooks/useBilingual";

const STATUS_LABELS = {
    draft: "Draft",
    published: "Dipublikasikan",
    active: "Aktif",
    ended: "Berakhir",
    archived: "Diarsipkan",
};

function applyServerErrors(form, error) {
    const errors = error.response?.data?.errors || {};
    form?.setFields(Object.entries(errors).map(([name, messages]) => ({
        name,
        errors: Array.isArray(messages) ? messages : [String(messages)],
    })));

    return error.response?.data?.message || "Workflow periode gagal diproses.";
}

function todayWithin(period) {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    if (!period) return local;
    if (local < period.start_date) return period.start_date;
    if (local > period.end_date) return period.end_date;
    return local;
}

function PeriodFormDrawer({ mode, open, period, periods, onClose, onCompleted }) {
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const cloneStructure = Form.useWatch("clone_structure", form);
    const sourceOptions = useMemo(() => periods.map((period) => ({
        value: period.id,
        label: `${period.name} · ${({ draft: tx("Draf", "Draft"), published: tx("Dipublikasikan", "Published"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), archived: tx("Diarsipkan", "Archived") })[period.status] || period.status}`,
    })), [periods, tx]);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        form.setFieldsValue(mode === "edit" ? {
            name: period?.name,
            start_date: period?.start_date,
            end_date: period?.end_date,
            notes: period?.notes || "",
            clone_structure: false,
        } : { clone_structure: false });
    }, [form, mode, open, period]);

    const submit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                name: values.name,
                start_date: values.start_date,
                end_date: values.end_date,
                notes: values.notes,
                ...(mode === "create" ? { source_period_id: values.clone_structure ? values.source_period_id : null } : {}),
            };
            const response = mode === "edit"
                ? await axios.patch(route("organization.periods.update", period.id), payload)
                : await axios.post(route("organization.periods.store"), payload);
            const period = response.data?.data;
            message.success(mode === "edit" ? tx("Metadata periode berhasil diperbarui.", "Period metadata updated successfully.") : tx("Periode draf berhasil dibuat.", "Draft period created successfully."));
            onCompleted?.(period?.id, mode === "edit" ? "structure" : "units");
        } catch (error) {
            message.error(applyServerErrors(form, error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer
            rootClassName="organization-management-drawer"
            title={<Space><CalendarOutlined /><span>{mode === "edit" ? tx("Edit Periode", "Edit Period") : tx("Buat Periode Baru", "Create New Period")}</span></Space>}
            open={open}
            onClose={onClose}
            size={620}
            destroyOnHidden
            maskClosable={!submitting}
        >
            <Alert
                className="mb-5"
                type="info"
                showIcon
                message={mode === "edit" ? tx("Koreksi metadata periode", "Correct period metadata") : tx("Periode dibuat sebagai draf", "The period will be created as a draft")}
                description={mode === "edit"
                    ? tx("Perubahan tanggal akan kembali divalidasi terhadap penugasan saat publikasi atau aktivasi.", "Date changes will be validated against assignments again during publication or activation.")
                    : tx("Struktur dan kandidat pengurus dapat disiapkan tanpa memberikan peran atau akses portal sebelum periode diaktifkan.", "The structure and management candidates can be prepared without granting roles or portal access before the period is activated.")}
            />

            <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" scrollToFirstError>
                <Form.Item label={tx("Nama Periode", "Period Name")} name="name" rules={[{ required: true, message: tx("Nama periode wajib diisi.", "The period name is required.") }]}>
                    <Input maxLength={255} autoComplete="off" placeholder="Contoh: Kepengurusan 2030–2033" />
                </Form.Item>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Form.Item label={tx("Tanggal Mulai", "Start Date")} name="start_date" rules={[{ required: true, message: tx("Tanggal mulai wajib diisi.", "The start date is required.") }]}>
                        <Input type="date" />
                    </Form.Item>
                    <Form.Item
                        label={tx("Tanggal Selesai", "End Date")}
                        name="end_date"
                        dependencies={["start_date"]}
                        rules={[
                            { required: true, message: tx("Tanggal selesai wajib diisi.", "The end date is required.") },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || !getFieldValue("start_date") || value >= getFieldValue("start_date")) return Promise.resolve();
                                    return Promise.reject(new Error(tx("Tanggal selesai tidak boleh sebelum tanggal mulai.", "The end date cannot be before the start date.")));
                                },
                            }),
                        ]}
                    >
                        <Input type="date" min={form.getFieldValue("start_date")} />
                    </Form.Item>
                </div>
                <Form.Item label={tx("Catatan", "Notes")} name="notes">
                    <Input.TextArea rows={4} maxLength={5000} showCount />
                </Form.Item>
                {mode === "create" ? (
                    <>
                        <Form.Item name="clone_structure" valuePropName="checked">
                            <Checkbox>
                                <span className="font-medium text-zinc-900">{tx("Salin struktur dari periode sebelumnya", "Copy structure from a previous period")}</span>
                            </Checkbox>
                        </Form.Item>
                        {cloneStructure ? (
                            <Form.Item
                                label={tx("Periode Sumber", "Source Period")}
                                name="source_period_id"
                                rules={[{ required: true, message: tx("Periode sumber wajib dipilih.", "A source period is required.") }]}
                                extra="Hierarchy, unit, tipe, urutan, dan slot posisi disalin. Assignment member, akun, role, dan divisi tidak ikut disalin."
                            >
                                <Select showSearch optionFilterProp="label" placeholder="Pilih periode sumber" options={sourceOptions} />
                            </Form.Item>
                        ) : null}
                    </>
                ) : null}

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-zinc-200 bg-white/95 py-4 backdrop-blur">
                    <Button onClick={onClose} disabled={submitting}>{tx("Batal", "Cancel")}</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>{mode === "edit" ? tx("Simpan Perubahan", "Save Changes") : tx("Buat Periode Draf", "Create Draft Period")}</Button>
                </div>
            </Form>
        </Drawer>
    );
}

function ReadinessContent({ data, loading, error, onRetry, onNavigate }) {
    const { tx } = useBilingual();
    if (loading) return <div className="flex min-h-56 items-center justify-center"><Spin /></div>;
    if (error) return <Alert type="error" showIcon message={tx("Validasi periode gagal dimuat", "Period validation could not be loaded")} description={error} action={<Button onClick={onRetry}>{tx("Coba Lagi", "Try Again")}</Button>} />;
    if (!data) return null;

    const assignmentIssues = (data.issues || []).some((issue) => [
        "required_position_empty",
        "invalid_assignment",
        "role_missing",
        "duplicate_member",
        "duplicate_slot",
    ].includes(issue.code));

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <Card size="small"><Statistic title={tx("Unit Aktif", "Active Units")} value={data.summary?.units || 0} /></Card>
                <Card size="small"><Statistic title={tx("Posisi Wajib", "Required Positions")} value={data.summary?.required_positions || 0} /></Card>
                <Card size="small"><Statistic title={tx("Kandidat Pengurus", "Management Candidates")} value={data.summary?.assignments || 0} /></Card>
            </div>
            {data.ready ? (
                <Alert type="success" showIcon message={tx("Periode siap diproses", "The period is ready")} description={tx("Struktur, posisi wajib, anggota, peran, dan penugasan telah melewati validasi backend.", "The structure, required positions, members, roles, and assignments have passed backend validation.")} />
            ) : (
                <Alert
                    type="warning"
                    showIcon
                    message={`${data.issues?.length || 0} masalah perlu diperbaiki`}
                    description={(
                        <ul className="mt-2 list-disc space-y-2 pl-5">
                            {(data.issues || []).map((issue, index) => <li key={`${issue.code}-${issue.assignment_id || issue.unit_position_id || index}`}>{issue.message}</li>)}
                        </ul>
                    )}
                    action={<Button onClick={() => onNavigate?.(assignmentIssues ? "members" : "units")}>{tx("Perbaiki Data", "Fix Data")}</Button>}
                />
            )}
        </div>
    );
}

function WorkflowModal({ mode, period, open, onClose, onCompleted, onNavigate }) {
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const requestRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const loadSummary = async () => {
        if (!open || !period?.id || ["create", "edit"].includes(mode)) return;
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const response = await axios.get(route("organization.periods.workflow-summary", period.id), {
                params: { action: mode },
                signal: controller.signal,
            });
            setData(response.data?.data || null);
        } catch (requestError) {
            if (requestError.code !== "ERR_CANCELED") setError(requestError.response?.data?.message || "Summary workflow gagal dimuat.");
        } finally {
            if (requestRef.current === controller) {
                requestRef.current = null;
                if (!controller.signal.aborted) setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!open || ["create", "edit"].includes(mode)) return undefined;
        form.resetFields();
        if (mode === "end") form.setFieldsValue({ ended_at: todayWithin(period) });
        loadSummary();
        return () => requestRef.current?.abort();
    }, [form, mode, open, period?.id]);

    const submit = async (values = {}) => {
        setSubmitting(true);
        try {
            const response = await axios.post(route(`organization.periods.${mode}`, period.id), values);
            message.success(mode === "publish" ? tx("Periode berhasil dipublikasikan.", "Period published successfully.") : mode === "activate" ? tx("Periode berhasil diaktifkan.", "Period activated successfully.") : tx("Periode berhasil diakhiri.", "Period ended successfully."));
            onCompleted?.(response.data?.data?.id || period.id, mode === "end" ? "history" : "structure");
        } catch (submitError) {
            const errorMessage = applyServerErrors(mode === "end" ? form : null, submitError);
            setError(errorMessage);
            message.error(errorMessage);
            if (mode !== "end") loadSummary();
        } finally {
            setSubmitting(false);
        }
    };

    const title = mode === "publish" ? tx("Publikasikan Periode", "Publish Period") : mode === "activate" ? tx("Aktifkan Periode", "Activate Period") : tx("Akhiri Periode", "End Period");
    const icon = mode === "publish" ? <CheckCircleOutlined /> : mode === "activate" ? <RocketOutlined /> : <StopOutlined />;

    return (
        <Modal
            rootClassName="organization-management-drawer"
            title={<Space>{icon}<span>{title}</span></Space>}
            open={open && !["create", "edit"].includes(mode)}
            onCancel={onClose}
            footer={null}
            width={720}
            destroyOnHidden
            maskClosable={!submitting}
        >
            <div className="pt-3">
                <Alert
                    className="mb-4"
                    type={mode === "end" ? "warning" : "info"}
                    showIcon
                    icon={mode === "end" ? <ExclamationCircleOutlined /> : undefined}
                    message={`${period?.name || tx("Periode", "Period")} · ${({ draft: tx("Draf", "Draft"), published: tx("Dipublikasikan", "Published"), active: tx("Aktif", "Active"), ended: tx("Berakhir", "Ended"), archived: tx("Diarsipkan", "Archived") })[period?.status] || period?.status}`}
                    description={mode === "publish"
                        ? "Publikasi mengunci kesiapan data untuk tahap aktivasi, tetapi belum memberikan akses portal."
                        : mode === "activate"
                            ? tx("Aktivasi membuat akun yang diperlukan, menetapkan peran dan unit, lalu mengaktifkan seluruh penugasan draf dalam satu transaksi.", "Activation creates required accounts, assigns roles and units, then activates all draft assignments in one transaction.")
                            : tx("Seluruh penugasan berjalan akan diakhiri, akses khusus dicabut, sesi diinvalidasi, dan riwayat tetap dipertahankan.", "All current assignments will end, special access will be revoked, sessions invalidated, and history retained.")}
                />

                {mode === "end" ? (
                    loading ? <div className="flex min-h-48 items-center justify-center"><Spin /></div> : error && !data ? (
                        <Alert type="error" showIcon message={tx("Ringkasan akhir periode gagal dimuat", "End-of-period summary could not be loaded")} description={error} action={<Button onClick={loadSummary}>{tx("Coba Lagi", "Try Again")}</Button>} />
                    ) : (
                        <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" scrollToFirstError>
                            <Descriptions bordered column={1} size="small" className="mb-5">
                                <Descriptions.Item label={tx("Pengurus diakhiri", "Managers ended")}>{data?.assignments || 0}</Descriptions.Item>
                                <Descriptions.Item label={tx("Peran disesuaikan", "Roles adjusted")}>{data?.roles || 0}</Descriptions.Item>
                                <Descriptions.Item label="Penempatan dikosongkan">{data?.divisions || 0}</Descriptions.Item>
                                <Descriptions.Item label={tx("Periode pengganti", "Replacement period")}>
                                    {data?.replacement_period ? <Space wrap><span>{data.replacement_period.name}</span><Tag>{data.replacement_period.status}</Tag></Space> : tx("Belum tersedia", "Not available")}
                                </Descriptions.Item>
                            </Descriptions>
                            <Form.Item label={tx("Tanggal Akhir Efektif", "Effective End Date")} name="ended_at" rules={[{ required: true, message: tx("Tanggal akhir wajib diisi.", "The end date is required.") }]}>
                                <Input type="date" min={period?.start_date} max={period?.end_date} />
                            </Form.Item>
                            <Form.Item label={tx("Alasan / Catatan", "Reason / Notes")} name="reason">
                                <Input.TextArea rows={3} maxLength={2000} showCount />
                            </Form.Item>
                            {error ? <Alert className="mb-4" type="error" showIcon message={error} /> : null}
                            <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4">
                                <Button onClick={onClose} disabled={submitting}>{tx("Batal", "Cancel")}</Button>
                                <Button danger type="primary" htmlType="submit" loading={submitting}>{tx("Akhiri Periode", "End Period")}</Button>
                            </div>
                        </Form>
                    )
                ) : (
                    <>
                        <ReadinessContent data={data} loading={loading} error={error} onRetry={loadSummary} onNavigate={onNavigate} />
                        <div className="mt-5 flex justify-end gap-2 border-t border-zinc-200 pt-4">
                            <Button onClick={onClose} disabled={submitting}>{tx("Batal", "Cancel")}</Button>
                            <Button type="primary" loading={submitting} disabled={loading || !data?.ready} onClick={() => submit()}>
                                {mode === "publish" ? tx("Publikasikan Periode", "Publish Period") : tx("Aktifkan Periode", "Activate Period")}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default function PeriodWorkflowDialogs({ mode, period, periods = [], onClose, onCompleted, onNavigate }) {
    return (
        <>
            <PeriodFormDrawer mode={mode} open={["create", "edit"].includes(mode)} period={period} periods={periods} onClose={onClose} onCompleted={onCompleted} />
            <WorkflowModal mode={mode} period={period} open={Boolean(mode)} onClose={onClose} onCompleted={onCompleted} onNavigate={onNavigate} />
        </>
    );
}
