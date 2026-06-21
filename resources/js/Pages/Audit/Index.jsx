import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Button,
    Card,
    Descriptions,
    Input,
    Modal,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    message,
} from "antd";
import {
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import FilterBar from "@/Components/App/FilterBar";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import { useI18n } from "@/Contexts/I18nContext";
import { formatDate } from "@/lib/format";

const { TextArea } = Input;
const { Text } = Typography;

function statusColor(status) {
    if (status === "approved") return "green";
    if (status === "rejected") return "red";
    return "gold";
}

export default function AuditIndex() {
    const { language } = useI18n();
    const isEn = language === "en";
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const activities = props.activities || {};
    const actionRequests = props.actionRequests || {};
    const filters = props.filters || {};
    const [search, setSearch] = useState(filters.search || "");
    const [module, setModule] = useState(filters.module || "");
    const [requestStatus, setRequestStatus] = useState(filters.request_status || "pending");
    const [detailActivity, setDetailActivity] = useState(null);
    const [reviewState, setReviewState] = useState({ open: false, mode: null, request: null, note: "" });

    const copy = {
        title: isEn ? "Audit & Approval" : "Audit & Approval",
        eyebrow: isEn ? "Financial Control" : "Kontrol Keuangan",
        description: isEn
            ? "Review void requests and trace important finance activities with before/after evidence."
            : "Review request void dan telusuri aktivitas keuangan penting dengan bukti before/after.",
        approvals: isEn ? "Void Approvals" : "Approval Void",
        activities: isEn ? "Activity Trail" : "Jejak Aktivitas",
        pending: isEn ? "Pending" : "Menunggu",
        approved: isEn ? "Approved" : "Disetujui",
        rejected: isEn ? "Rejected" : "Ditolak",
        all: isEn ? "All" : "Semua",
        apply: isEn ? "Apply" : "Terapkan",
        reset: isEn ? "Reset" : "Reset",
        search: isEn ? "Search activity" : "Cari aktivitas",
        module: isEn ? "Module" : "Modul",
        status: isEn ? "Status" : "Status",
        target: isEn ? "Target" : "Target",
        amount: isEn ? "Amount" : "Nominal",
        date: isEn ? "Date" : "Tanggal",
        requestedBy: isEn ? "Requested By" : "Diajukan Oleh",
        reviewedBy: isEn ? "Reviewed By" : "Direview Oleh",
        reason: isEn ? "Reason" : "Alasan",
        note: isEn ? "Review note" : "Catatan review",
        approve: isEn ? "Approve" : "Setujui",
        reject: isEn ? "Reject" : "Tolak",
        detail: isEn ? "Detail" : "Detail",
        event: isEn ? "Event" : "Event",
        actor: isEn ? "Actor" : "Aktor",
        subject: isEn ? "Subject" : "Subject",
        properties: isEn ? "Properties" : "Properties",
        approveTitle: isEn ? "Approve void request?" : "Setujui request void?",
        rejectTitle: isEn ? "Reject void request?" : "Tolak request void?",
        approveSuccess: isEn ? "Void request approved." : "Request void disetujui.",
        rejectSuccess: isEn ? "Void request rejected." : "Request void ditolak.",
        approvalError: isEn ? "Unable to review request." : "Gagal mereview request.",
        noPermission: isEn ? "You do not have review permission." : "Anda tidak memiliki izin review.",
        selfReview: isEn ? "Requester cannot review their own request." : "Pemohon tidak dapat mereview request sendiri.",
        selfReviewShort: isEn ? "Own request" : "Request sendiri",
        emptyRequests: isEn ? "No void requests" : "Belum ada request void",
        emptyActivities: isEn ? "No activity logs" : "Belum ada activity log",
    };

    const canApproveDues = permissions.includes("dues.void.approve");
    const canApproveTransactions = permissions.includes("transactions.void.approve");
    const currentUserId = props.auth?.user?.id;

    const applyFilters = (next = {}) => {
        router.get(
            route("audit.index"),
            {
                search,
                module,
                request_status: requestStatus,
                ...next,
            },
            { preserveState: true, replace: true },
        );
    };

    const resetFilters = () => {
        setSearch("");
        setModule("");
        setRequestStatus("pending");
        router.get(route("audit.index"), { request_status: "pending" }, { replace: true });
    };

    const openReview = (mode, request) => {
        const isDues = request.target_type === "DuesPayment";
        const allowed = isDues ? canApproveDues : canApproveTransactions;
        if (!allowed) {
            message.error(copy.noPermission);
            return;
        }
        if (request.requested_by_id === currentUserId) {
            message.error(copy.selfReview);
            return;
        }
        setReviewState({ open: true, mode, request, note: "" });
    };

    const submitReview = () => {
        const { mode, request, note } = reviewState;
        router.post(
            route(`audit.action-requests.${mode}`, request.id),
            { note },
            {
                preserveScroll: true,
                onSuccess: () => {
                    message.success(mode === "approve" ? copy.approveSuccess : copy.rejectSuccess);
                    setReviewState({ open: false, mode: null, request: null, note: "" });
                },
                onError: () => message.error(copy.approvalError),
            },
        );
    };

    const requestColumns = useMemo(
        () => [
            {
                title: copy.status,
                dataIndex: "status",
                width: 120,
                render: (value) => <Tag color={statusColor(value)}>{copy[value] || value}</Tag>,
            },
            {
                title: copy.target,
                dataIndex: "target_label",
                render: (value, row) => (
                    <div>
                        <p className="mb-0 font-semibold text-zinc-950">{value}</p>
                        <p className="mb-0 text-xs text-zinc-500">{row.target_type} #{row.target_id}</p>
                    </div>
                ),
            },
            {
                title: copy.amount,
                dataIndex: "amount",
                width: 150,
                align: "right",
                render: (value) => <MoneyDisplay value={value || 0} />,
            },
            {
                title: copy.date,
                dataIndex: "date",
                width: 130,
                render: (value) => value || "-",
            },
            {
                title: copy.requestedBy,
                dataIndex: "requested_by",
                width: 170,
                render: (value, row) => (
                    <div>
                        <p className="mb-0">{value || "-"}</p>
                        <p className="mb-0 text-xs text-zinc-500">{formatDate(row.created_at)}</p>
                    </div>
                ),
            },
            {
                title: copy.reason,
                dataIndex: "reason",
                ellipsis: true,
            },
            {
                title: copy.reviewedBy,
                dataIndex: "reviewed_by",
                width: 170,
                render: (value, row) => value ? (
                    <div>
                        <p className="mb-0">{value}</p>
                        <p className="mb-0 text-xs text-zinc-500">{formatDate(row.reviewed_at)}</p>
                    </div>
                ) : "-",
            },
            {
                title: copy.detail,
                key: "actions",
                width: 150,
                align: "right",
                render: (_, row) => {
                    if (row.status !== "pending") {
                        return <Text type="secondary">{row.review_note || "-"}</Text>;
                    }

                    const isDues = row.target_type === "DuesPayment";
                    const allowed = isDues ? canApproveDues : canApproveTransactions;
                    const isOwnRequest = row.requested_by_id === currentUserId;
                    const disabled = !allowed || isOwnRequest;
                    const disabledReason = isOwnRequest ? copy.selfReviewShort : copy.noPermission;

                    return (
                        <Space>
                            <Tooltip title={disabled ? disabledReason : copy.approve}>
                                <Button
                                    size="small"
                                    icon={<CheckOutlined />}
                                    disabled={disabled}
                                    onClick={() => openReview("approve", row)}
                                />
                            </Tooltip>
                            <Tooltip title={disabled ? disabledReason : copy.reject}>
                                <Button
                                    danger
                                    size="small"
                                    icon={<CloseOutlined />}
                                    disabled={disabled}
                                    onClick={() => openReview("reject", row)}
                                />
                            </Tooltip>
                        </Space>
                    );
                },
            },
        ],
        [copy, canApproveDues, canApproveTransactions, currentUserId],
    );

    const activityColumns = useMemo(
        () => [
            {
                title: copy.date,
                dataIndex: "created_at",
                width: 170,
                render: (value) => formatDate(value),
            },
            {
                title: copy.event,
                dataIndex: "event",
                width: 230,
                render: (value) => <Tag color="blue">{value}</Tag>,
            },
            {
                title: copy.actor,
                dataIndex: "causer_name",
                width: 170,
                render: (value) => value || "-",
            },
            {
                title: copy.subject,
                key: "subject",
                render: (_, row) => `${row.subject_type || "-"} #${row.subject_id || "-"}`,
            },
            {
                title: copy.detail,
                key: "detail",
                width: 90,
                align: "right",
                render: (_, row) => (
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailActivity(row)} />
                ),
            },
        ],
        [copy],
    );

    return (
        <AppLayout title={copy.title}>
            <PageShell>
                <PageHeader
                    eyebrow={copy.eyebrow}
                    title={copy.title}
                    description={copy.description}
                    extra={<SafetyCertificateOutlined className="text-2xl text-red-700" />}
                />

                <FilterBar>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{copy.search}</p>
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{copy.module}</p>
                        <Select
                            value={module || undefined}
                            allowClear
                            style={{ width: 180 }}
                            onChange={(value) => setModule(value || "")}
                            options={[
                                { value: "finance", label: "Finance" },
                                { value: "dues_payment", label: "Dues" },
                                { value: "cash_transaction", label: "Transactions" },
                            ]}
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{copy.status}</p>
                        <Select
                            value={requestStatus}
                            style={{ width: 170 }}
                            onChange={setRequestStatus}
                            options={[
                                { value: "pending", label: copy.pending },
                                { value: "approved", label: copy.approved },
                                { value: "rejected", label: copy.rejected },
                                { value: "", label: copy.all },
                            ]}
                        />
                    </div>
                    <Button type="primary" onClick={() => applyFilters()}>{copy.apply}</Button>
                    <Button onClick={resetFilters}>{copy.reset}</Button>
                </FilterBar>

                <Tabs
                    items={[
                        {
                            key: "approvals",
                            label: copy.approvals,
                            children: (
                                <Card>
                                    <Table
                                        columns={requestColumns}
                                        dataSource={actionRequests.data || []}
                                        rowKey="id"
                                        pagination={{
                                            current: actionRequests.current_page || 1,
                                            pageSize: actionRequests.per_page || 10,
                                            total: actionRequests.total || 0,
                                            onChange: (page) => applyFilters({ requests_page: page }),
                                        }}
                                        locale={{ emptyText: copy.emptyRequests }}
                                        scroll={{ x: 980 }}
                                    />
                                </Card>
                            ),
                        },
                        {
                            key: "activities",
                            label: copy.activities,
                            children: (
                                <Card>
                                    <Table
                                        columns={activityColumns}
                                        dataSource={activities.data || []}
                                        rowKey="id"
                                        pagination={{
                                            current: activities.current_page || 1,
                                            pageSize: activities.per_page || 15,
                                            total: activities.total || 0,
                                            onChange: (page) => applyFilters({ page }),
                                        }}
                                        locale={{ emptyText: copy.emptyActivities }}
                                        scroll={{ x: 820 }}
                                    />
                                </Card>
                            ),
                        },
                    ]}
                />
            </PageShell>

            <Modal
                title={reviewState.mode === "approve" ? copy.approveTitle : copy.rejectTitle}
                open={reviewState.open}
                okText={reviewState.mode === "approve" ? copy.approve : copy.reject}
                okButtonProps={{ danger: reviewState.mode === "reject" }}
                onOk={submitReview}
                onCancel={() => setReviewState({ open: false, mode: null, request: null, note: "" })}
            >
                <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label={copy.target}>{reviewState.request?.target_label}</Descriptions.Item>
                    <Descriptions.Item label={copy.reason}>{reviewState.request?.reason}</Descriptions.Item>
                </Descriptions>
                <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-zinc-700">{copy.note}</p>
                    <TextArea
                        rows={3}
                        value={reviewState.note}
                        onChange={(event) => setReviewState((prev) => ({ ...prev, note: event.target.value }))}
                    />
                </div>
            </Modal>

            <Modal
                title={copy.properties}
                open={Boolean(detailActivity)}
                footer={null}
                width={820}
                onCancel={() => setDetailActivity(null)}
            >
                <pre className="max-h-[60vh] overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-50">
                    {JSON.stringify(detailActivity?.properties || {}, null, 2)}
                </pre>
            </Modal>
        </AppLayout>
    );
}
