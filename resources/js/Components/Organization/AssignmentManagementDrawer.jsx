import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
    CheckCircleOutlined,
    SearchOutlined,
    StopOutlined,
    SwapOutlined,
    UserAddOutlined,
    UserOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import {
    Alert,
    Avatar,
    Button,
    Card,
    Drawer,
    Form,
    Input,
    Select,
    Space,
    Spin,
    Tag,
    message,
} from "antd";
import { notifyOrganizationDataChanged } from "@/Components/Organization/events";
import useBilingual from "@/Hooks/useBilingual";

function initials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || <UserOutlined />;
}

function applyServerErrors(form, error, fallback) {
    const errors = error.response?.data?.errors || {};
    const fields = Object.entries(errors).map(([name, messages]) => ({
        name,
        errors: Array.isArray(messages) ? messages : [String(messages)],
    }));

    if (fields.length > 0) form.setFields(fields);
    return error.response?.data?.message || fallback;
}

function MemberPreview({ member, eligibility, loading, period }) {
    const { tx } = useBilingual();
    if (!member) {
        return (
            <Alert
                type="info"
                showIcon
                icon={<SearchOutlined />}
                message={tx("Cari anggota dari database", "Search members in the database")}
                description={tx("Ketik nama, NPA, email, atau ID internal.", "Enter a name, NPA, email, or internal ID.")}
            />
        );
    }

    const account = eligibility?.account || member.account;
    const eligible = eligibility?.eligible;

    return (
        <Card size="small" className="border-zinc-200 bg-zinc-50 shadow-none" aria-busy={loading}>
            <div className="flex items-start gap-3">
                <Avatar size={48} className="bg-zinc-900">{initials(member.full_name)}</Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="font-semibold text-zinc-950">
                                {member.full_name}{member.education ? `, ${member.education}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">NPA {member.npa || "—"} · {member.email || tx("Tanpa email", "No email")}</p>
                        </div>
                        {loading ? <Spin size="small" /> : (
                            <Tag color={eligible ? "green" : "red"}>{eligible ? tx("Memenuhi syarat", "Eligible") : tx("Perlu perhatian", "Needs attention")}</Tag>
                        )}
                    </div>

                    {!loading && eligibility?.reason ? (
                        <Alert className="mt-3" type="warning" showIcon message={eligibility.reason} />
                    ) : null}

                    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">{tx("Pratinjau Akun Login", "Login Account Preview")}</p>
                        {account?.exists ? (
                            <p className="mt-2 text-sm text-zinc-700">
                                {tx("Akun tersedia dan berstatus", "The account exists and is")} <strong>{account.is_active ? tx("aktif", "active") : tx("nonaktif", "inactive")}</strong>. {tx("Peran dan akses organisasi akan disinkronkan oleh layanan resmi.", "The role and organization access will be synchronized by the official service.")}
                            </p>
                        ) : (
                            <p className="mt-2 text-sm text-zinc-700">
                                {tx("Belum memiliki akun. Akun akan dibuat otomatis", "No account exists yet. An account will be created automatically")} {period?.is_active ? tx("saat penugasan disimpan", "when the assignment is saved") : tx("ketika penugasan diaktifkan", "when the assignment is activated")}.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function AssignmentManagementDrawer({
    open,
    mode = "create",
    assignment = null,
    period,
    options = {},
    onClose,
    onSaved,
}) {
    const { tx } = useBilingual();
    const [form] = Form.useForm();
    const memberRequestRef = useRef(null);
    const eligibilityRequestRef = useRef(null);
    const searchTimerRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [memberOptions, setMemberOptions] = useState([]);
    const [memberMeta, setMemberMeta] = useState({ current_page: 1, last_page: 1 });
    const [memberQuery, setMemberQuery] = useState("");
    const [memberLoading, setMemberLoading] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [eligibility, setEligibility] = useState(null);
    const [eligibilityLoading, setEligibilityLoading] = useState(false);
    const modeCopy = {
        create: { title: tx("Tambah Pengurus", "Add Manager"), submit: tx("Tetapkan Pengurus", "Assign Manager"), icon: <UserAddOutlined /> },
        edit: { title: tx("Edit Penugasan", "Edit Assignment"), submit: tx("Simpan Perubahan", "Save Changes"), icon: <CheckCircleOutlined /> },
        replace: { title: tx("Ganti Pengurus", "Replace Manager"), submit: tx("Ganti Pengurus", "Replace Manager"), icon: <SwapOutlined /> },
        end: { title: tx("Akhiri Jabatan", "End Position"), submit: tx("Akhiri Jabatan", "End Position"), icon: <StopOutlined /> },
    };
    const copy = modeCopy[mode] || modeCopy.create;
    const isCreate = mode === "create";
    const needsMember = mode === "create" || mode === "replace";

    const fetchSlots = useCallback(async (unitId) => {
        if (!unitId) {
            setSlots([]);
            return;
        }

        setSlotsLoading(true);
        try {
            const response = await axios.get(route("organization.units.positions.index", unitId));
            setSlots(response.data?.data || []);
        } catch (error) {
            message.error(error.response?.data?.message || "Slot posisi gagal dimuat.");
        } finally {
            setSlotsLoading(false);
        }
    }, []);

    const fetchMembers = useCallback(async (query, page = 1, append = false) => {
        if (!period?.id || query.trim().length < 1) return;
        memberRequestRef.current?.abort();
        const controller = new AbortController();
        memberRequestRef.current = controller;
        setMemberLoading(true);

        try {
            const response = await axios.get(route("organization.members.search"), {
                params: { q: query.trim(), period_id: period.id, page, per_page: 20 },
                signal: controller.signal,
            });
            const next = (response.data?.data || []).map((member) => ({
                value: member.id,
                label: `${member.full_name} · ${member.npa || tx("Tanpa NPA", "No NPA")}`,
                member,
            }));
            setMemberOptions((current) => append
                ? [...current, ...next.filter((candidate) => !current.some((item) => item.value === candidate.value))]
                : next);
            setMemberMeta(response.data?.meta || { current_page: page, last_page: page });
        } catch (error) {
            if (error.code !== "ERR_CANCELED") message.error(tx("Pencarian anggota gagal.", "Member search failed."));
        } finally {
            if (memberRequestRef.current === controller) {
                memberRequestRef.current = null;
                if (!controller.signal.aborted) setMemberLoading(false);
            }
        }
    }, [period?.id]);

    const validateMember = useCallback(async (member) => {
        if (!member?.id || !period?.id) return;
        eligibilityRequestRef.current?.abort();
        const controller = new AbortController();
        eligibilityRequestRef.current = controller;
        setEligibilityLoading(true);
        setEligibility(null);

        try {
            const response = await axios.get(route("organization.members.eligibility", member.id), {
                params: { period_id: period.id },
                signal: controller.signal,
            });
            setEligibility(response.data?.data || null);
        } catch (error) {
            if (error.code !== "ERR_CANCELED") message.error(tx("Validasi anggota gagal.", "Member validation failed."));
        } finally {
            if (eligibilityRequestRef.current === controller) {
                eligibilityRequestRef.current = null;
                if (!controller.signal.aborted) setEligibilityLoading(false);
            }
        }
    }, [period?.id]);

    useEffect(() => {
        if (!open) return;
        form.resetFields();
        setSlots([]);
        setMemberOptions([]);
        setSelectedMember(null);
        setEligibility(null);
        setMemberQuery("");

        if (mode === "create") {
            form.setFieldsValue({
                period_id: period?.id,
                started_at: period?.start_date || "",
            });
        } else if (mode === "edit") {
            form.setFieldsValue({
                started_at: assignment?.started_at || "",
                appointment_number: assignment?.appointment_number || "",
                appointment_date: assignment?.appointment_date || "",
                notes: assignment?.notes || "",
            });
        } else if (mode === "replace") {
            form.setFieldsValue({
                started_at: new Date().toISOString().slice(0, 10),
                portal_role_id: assignment?.role?.id,
            });
        } else if (mode === "end") {
            form.setFieldsValue({ ended_at: new Date().toISOString().slice(0, 10) });
        }

        return () => {
            memberRequestRef.current?.abort();
            eligibilityRequestRef.current?.abort();
            window.clearTimeout(searchTimerRef.current);
        };
    }, [assignment, form, mode, open, period]);

    const handleMemberSearch = (query) => {
        setMemberQuery(query);
        window.clearTimeout(searchTimerRef.current);
        if (query.trim().length < 1) {
            setMemberOptions([]);
            return;
        }
        searchTimerRef.current = window.setTimeout(() => fetchMembers(query, 1, false), 350);
    };

    const handleMemberScroll = (event) => {
        const target = event.currentTarget;
        const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
        if (nearBottom && !memberLoading && memberMeta.current_page < memberMeta.last_page) {
            fetchMembers(memberQuery, memberMeta.current_page + 1, true);
        }
    };

    const submit = async (values) => {
        setSubmitting(true);
        form.setFields(Object.keys(values).map((name) => ({ name, errors: [] })));

        try {
            if (mode === "create") {
                await axios.post(route("organization.assignments.store"), {
                    ...values,
                    period_id: period.id,
                    organization_unit_id: values.organization_unit_id,
                    unit_position_id: values.unit_position_id,
                    member_id: values.member_id,
                });
            } else if (mode === "replace") {
                await axios.post(route("organization.assignments.replace", assignment.id), values);
            } else if (mode === "edit") {
                await axios.patch(route("organization.assignments.update", assignment.id), values);
            } else if (mode === "end") {
                await axios.post(route("organization.assignments.end", assignment.id), values);
            }

            message.success(`${copy.title} ${tx("berhasil disimpan.", "was saved successfully.")}`);
            notifyOrganizationDataChanged(period.id);
            onSaved?.();
            onClose?.();
        } catch (error) {
            message.error(applyServerErrors(form, error, tx("Data gagal disimpan.", "The data could not be saved.")));
        } finally {
            setSubmitting(false);
        }
    };

    const slotOptions = slots
        .filter((slot) => slot.is_active && !slot.assignment)
        .map((slot) => ({
            value: slot.id,
            label: `${slot.title}${slot.is_required ? ` · ${tx("Wajib", "Required")}` : ""}`,
        }));

    return (
        <Drawer
            rootClassName="organization-management-drawer"
            title={<Space>{copy.icon}<span>{copy.title}</span></Space>}
            open={open}
            onClose={onClose}
            size={620}
            destroyOnHidden
            maskClosable={!submitting}
        >
            {assignment && mode !== "create" ? (
                <Alert
                    className="mb-5"
                    type={mode === "end" ? "warning" : "info"}
                    showIcon
                    icon={mode === "end" ? <WarningOutlined /> : undefined}
                    message={`${assignment.member?.full_name || tx("Pengurus", "Manager")} · ${assignment.position?.title || tx("Jabatan", "Position")}`}
                    description={`${assignment.unit?.name || tx("Unit", "Unit")} · ${assignment.period?.name || period?.name}`}
                />
            ) : null}

            <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" scrollToFirstError>
                {isCreate ? (
                    <>
                        <Form.Item label={tx("Periode", "Period")} name="period_id">
                            <Select disabled options={[{ value: period?.id, label: period?.name }]} />
                        </Form.Item>
                        <Form.Item label={tx("Unit / Bidang", "Unit / Division")} name="organization_unit_id" rules={[{ required: true, message: tx("Unit wajib dipilih.", "A unit is required.") }]}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={tx("Pilih unit", "Select unit")}
                                options={options.units || []}
                                onChange={(value) => {
                                    form.setFieldValue("unit_position_id", undefined);
                                    fetchSlots(value);
                                }}
                            />
                        </Form.Item>
                        <Form.Item label={tx("Jabatan / Slot Posisi", "Position / Position Slot")} name="unit_position_id" rules={[{ required: true, message: tx("Slot jabatan wajib dipilih.", "A position slot is required.") }]}>
                            <Select loading={slotsLoading} disabled={slots.length === 0} placeholder={slots.length === 0 ? tx("Pilih unit terlebih dahulu", "Select a unit first") : tx("Pilih posisi kosong", "Select a vacant position")} options={slotOptions} />
                        </Form.Item>
                    </>
                ) : null}

                {needsMember ? (
                    <>
                        <Form.Item label={tx("Anggota", "Member")} name="member_id" rules={[{ required: true, message: tx("Anggota wajib dipilih.", "A member is required.") }]}>
                            <Select
                                showSearch
                                filterOption={false}
                                placeholder={tx("Ketik nama, NPA, email, atau ID", "Enter a name, NPA, email, or ID")}
                                options={memberOptions}
                                onSearch={handleMemberSearch}
                                onPopupScroll={handleMemberScroll}
                                loading={memberLoading}
                                notFoundContent={memberLoading ? <Spin size="small" /> : tx("Ketik nama, NPA, email, atau ID", "Enter a name, NPA, email, or ID")}
                                onChange={(_value, option) => {
                                    setSelectedMember(option.member);
                                    validateMember(option.member);
                                }}
                            />
                        </Form.Item>
                        <div className="mb-5" aria-live="polite">
                            <MemberPreview member={selectedMember} eligibility={eligibility} loading={eligibilityLoading} period={period} />
                        </div>
                        <Form.Item label={tx("Peran Portal", "Portal Role")} name="portal_role_id" rules={[{ required: mode === "create", message: tx("Peran portal wajib dipilih.", "A portal role is required.") }]}>
                            <Select showSearch optionFilterProp="label" placeholder={tx("Pilih peran", "Select role")} options={options.roles || []} />
                        </Form.Item>
                    </>
                ) : null}

                {mode !== "end" ? (
                    <>
                        <Form.Item label={tx("Tanggal Mulai", "Start Date")} name="started_at" rules={[{ required: true, message: tx("Tanggal mulai wajib diisi.", "The start date is required.") }]}>
                            <Input type="date" min={period?.start_date} max={period?.end_date} />
                        </Form.Item>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Form.Item label={tx("Nomor SK", "Appointment Letter Number")} name="appointment_number">
                                <Input maxLength={255} placeholder={tx("Opsional", "Optional")} />
                            </Form.Item>
                            <Form.Item label={tx("Tanggal SK", "Appointment Letter Date")} name="appointment_date">
                                <Input type="date" />
                            </Form.Item>
                        </div>
                        <Form.Item label={tx("Catatan", "Notes")} name="notes">
                            <Input.TextArea rows={4} maxLength={5000} showCount />
                        </Form.Item>
                    </>
                ) : null}

                {mode === "replace" ? (
                    <Form.Item label={tx("Alasan Penggantian", "Replacement Reason")} name="reason" rules={[{ required: true, message: tx("Alasan penggantian wajib diisi.", "A replacement reason is required.") }]}>
                        <Input.TextArea rows={3} maxLength={2000} showCount />
                    </Form.Item>
                ) : null}

                {mode === "end" ? (
                    <>
                        <Form.Item label={tx("Tanggal Berakhir", "End Date")} name="ended_at" rules={[{ required: true, message: tx("Tanggal berakhir wajib diisi.", "The end date is required.") }]}>
                            <Input type="date" min={assignment?.started_at} max={period?.end_date} />
                        </Form.Item>
                        <Form.Item label={tx("Alasan", "Reason")} name="reason">
                            <Input.TextArea rows={4} maxLength={2000} showCount />
                        </Form.Item>
                    </>
                ) : null}

                <div aria-live="assertive" className="sr-only">
                    {form.getFieldsError().some((field) => field.errors.length > 0) ? tx("Form memiliki kesalahan validasi.", "The form has validation errors.") : ""}
                </div>

                <div className="sticky bottom-0 -mx-1 mt-6 flex justify-end gap-2 border-t border-zinc-200 bg-white/95 px-1 py-4 backdrop-blur">
                    <Button onClick={onClose} disabled={submitting}>{tx("Batal", "Cancel")}</Button>
                    <Button type="primary" htmlType="submit" loading={submitting} danger={mode === "end"}>
                        {copy.submit}
                    </Button>
                </div>
            </Form>
        </Drawer>
    );
}
