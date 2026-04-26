import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import {
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    EditOutlined,
    FilterOutlined,
    MoreOutlined,
    PaperClipOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import {
    Button,
    Card,
    DatePicker,
    Dropdown,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Upload,
    message,
} from "antd";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import FilterBar from "@/Components/App/FilterBar";
import SearchInput from "@/Components/App/SearchInput";
import StatCard from "@/Components/App/StatCard";
import MoneyDisplay from "@/Components/App/MoneyDisplay";
import DataTable from "@/Components/App/DataTable";
import StatusBadge from "@/Components/App/StatusBadge";
import FormSection from "@/Components/App/FormSection";
import { useI18n } from "@/Contexts/I18nContext";
import { formatDate, formatIDR } from "@/lib/format";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

function buildQuery(filters) {
    const params = { ...filters };

    if (filters.range?.length === 2) {
        params.start_date = filters.range[0]?.format("YYYY-MM-DD");
        params.end_date = filters.range[1]?.format("YYYY-MM-DD");
    }
    delete params.range;

    Object.keys(params).forEach((key) => {
        if (params[key] === null || params[key] === undefined || params[key] === "") {
            delete params[key];
        }
    });

    return params;
}

export default function TransactionsIndex() {
    const { t } = useI18n();
    const { props } = usePage();
    const {
        transactions,
        summary,
        filters,
        categories,
        methods,
        balances_by_method: balancesByMethod,
    } = props;

    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const maxAttachmentKb = 500;
    const acceptedAttachmentTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
    ];

    const [filterState, setFilterState] = useState({
        search: filters?.search || "",
        type: filters?.type || "",
        category_id: filters?.category_id || "",
        method_id: filters?.method_id || "",
        range:
            filters?.start_date && filters?.end_date
                ? [dayjs(filters.start_date), dayjs(filters.end_date)]
                : [],
    });

    const data = transactions?.data || [];
    const [columnVisibility, setColumnVisibility] = useState({});
    const attachmentPreviewMeta = useMemo(() => {
        const attachment = attachmentPreview;
        if (!attachment?.url) {
            return { isImage: false, isPdf: false };
        }

        const source = String(attachment.mime_type || attachment.title || attachment.url || "").toLowerCase();
        const isImage =
            source.includes("image/") ||
            source.endsWith(".jpg") ||
            source.endsWith(".jpeg") ||
            source.endsWith(".png");
        const isPdf = source.includes("pdf") || source.endsWith(".pdf");

        return { isImage, isPdf };
    }, [attachmentPreview]);

    const categoryOptions = useMemo(
        () =>
            categories.map((category) => ({
                value: category.id,
                label: category.name,
                type: category.type,
            })),
        [categories],
    );

    const methodOptions = useMemo(
        () =>
            methods.map((method) => ({ value: method.id, label: method.name })),
        [methods],
    );

    const openAttachmentPreview = (attachment) => {
        if (!attachment?.url) return;
        setAttachmentPreview(attachment);
        setPreviewOpen(true);
    };

    const columns = useMemo(
        () => [
            {
                accessorKey: "tx_date",
                header: t("common.date"),
                cell: ({ row }) => formatDate(row.original.tx_date),
                meta: { width: 132, sorter: true },
            },
            {
                accessorKey: "type",
                header: t("common.type"),
                cell: ({ row }) =>
                    row.original.type === "in" ? (
                        <StatusBadge status="active" label={t("transactions.typeIn")} color="green" />
                    ) : (
                        <StatusBadge status="overdue" label={t("transactions.typeOut")} color="red" />
                    ),
                meta: { width: 110 },
            },
            {
                accessorKey: "category",
                header: t("common.category"),
                cell: ({ row }) => row.original.category || "-",
                meta: { width: 180 },
            },
            {
                accessorKey: "method",
                header: t("common.method"),
                cell: ({ row }) => row.original.method || "-",
                meta: { width: 150 },
            },
            {
                accessorKey: "description",
                header: t("common.description"),
                cell: ({ row }) => row.original.description || "-",
            },
            {
                accessorKey: "amount",
                header: t("common.amount"),
                cell: ({ row }) => (
                    <MoneyDisplay
                        value={row.original.amount}
                        tone={row.original.type === "out" ? "danger" : "success"}
                        showPrefix={row.original.type === "in"}
                    />
                ),
                meta: { width: 170, align: "right", sorter: true },
            },
            {
                accessorKey: "reference_no",
                header: t("common.reference"),
                cell: ({ row }) => row.original.reference_no || row.original.source || "-",
                meta: { width: 170 },
            },
            {
                accessorKey: "attachment",
                header: t("common.attachment"),
                cell: ({ row }) => {
                    const attachment = row.original.attachment;
                    if (!attachment?.url) {
                        return "-";
                    }

                    return (
                        <Space size={6}>
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => openAttachmentPreview(attachment)}
                                title={t("transactions.attachmentOpen")}
                            />
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                href={attachment.download_url || attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                download={attachment.title || true}
                                title={t("transactions.attachmentDownload")}
                            />
                        </Space>
                    );
                },
                meta: { width: 130 },
            },
            {
                accessorKey: "running_balance",
                header: t("common.runningBalance"),
                cell: ({ row }) => <MoneyDisplay value={row.original.running_balance} tone="muted" />,
                meta: { width: 170, align: "right" },
            },
            {
                id: "actions",
                header: t("common.actions"),
                cell: ({ row }) => {
                    const items = [
                        {
                            key: "edit",
                            icon: <EditOutlined />,
                            label: t("common.edit"),
                            disabled: row.original.is_locked,
                            onClick: () => handleEdit(row.original),
                        },
                        {
                            key: "delete",
                            icon: <DeleteOutlined />,
                            label: t("transactions.canceled"),
                            danger: true,
                            disabled: row.original.is_locked,
                            onClick: () => handleDelete(row.original),
                        },
                    ];

                    return (
                        <Dropdown menu={{ items }} trigger={["click"]}>
                            <Button size="small" icon={<MoreOutlined />} />
                        </Dropdown>
                    );
                },
                meta: { width: 90, align: "right" },
                enableHiding: false,
            },
        ],
        [t],
    );

    const table = useReactTable({
        data,
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
    });

    const antdColumns = table.getVisibleLeafColumns().map((column) => ({
        title: column.columnDef.header,
        dataIndex: column.id,
        key: column.id,
        width: column.columnDef.meta?.width,
        align: column.columnDef.meta?.align,
        sorter: column.columnDef.meta?.sorter,
        render: (_value, row) =>
            flexRender(column.columnDef.cell, {
                row: { original: row },
                getValue: () => row[column.id],
            }),
    }));

    const applyFilters = () => {
        router.get(route("transactions.index"), buildQuery(filterState), {
            replace: true,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const cleared = {
            search: "",
            type: "",
            category_id: "",
            method_id: "",
            range: [],
        };
        setFilterState(cleared);
        router.get(route("transactions.index"), {}, { replace: true });
    };

    const openModal = () => {
        setEditing(null);
        setFileList([]);
        form.resetFields();
        form.setFieldsValue({ remove_attachment: false });
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditing(record);
        setFileList([]);
        form.setFieldsValue({
            tx_date: record.tx_date ? dayjs(record.tx_date) : null,
            type: record.type,
            category_id: record.category_id,
            method_id: record.method_id,
            amount: record.amount,
            description: record.description,
            reference_no: record.reference_no,
            remove_attachment: false,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: t("transactions.cancelTransaction"),
            content: t("transactions.cancelTransactionDesc"),
            okText: t("transactions.confirmCancel"),
            okButtonProps: { danger: true },
            onOk: () =>
                router.delete(route("transactions.destroy", record.id), {
                    preserveScroll: true,
                }),
        });
    };

    const submitForm = async () => {
        const values = await form.validateFields();
        const payload = new FormData();
        payload.append("tx_date", values.tx_date.format("YYYY-MM-DD HH:mm:ss"));
        payload.append("type", values.type);
        payload.append("category_id", values.category_id);
        payload.append("method_id", values.method_id);
        payload.append("amount", values.amount);
        if (values.description) payload.append("description", values.description);
        if (values.reference_no) payload.append("reference_no", values.reference_no);
        if (fileList[0]?.originFileObj) {
            payload.append("attachment", fileList[0].originFileObj);
        }
        if (values.remove_attachment) {
            payload.append("remove_attachment", "1");
        }

        if (editing) {
            payload.append("_method", "patch");
            router.post(route("transactions.update", editing.id), payload, {
                forceFormData: true,
                preserveScroll: true,
            });
        } else {
            router.post(route("transactions.store"), payload, {
                forceFormData: true,
                preserveScroll: true,
            });
        }

        setIsModalOpen(false);
        form.resetFields();
        setFileList([]);
    };

    const visibleColumns = table
        .getAllLeafColumns()
        .filter((column) => column.getCanHide())
        .map((column) => ({
            key: column.id,
            label: column.columnDef.header,
            checked: column.getIsVisible(),
        }));

    const columnMenu = {
        items: visibleColumns.map((column) => ({
            key: column.key,
            label: (
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={column.checked}
                        onChange={() => table.getColumn(column.key).toggleVisibility()}
                    />
                    {column.label}
                </label>
            ),
        })),
    };

    return (
        <AppLayout title={t("menu.cash")}>
            <PageShell>
                <PageHeader
                    eyebrow="Cash Flow"
                    title={t("transactions.title")}
                    description={t("transactions.description")}
                    extra={
                        <Space wrap>
                            <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
                                {t("transactions.addTransaction")}
                            </Button>
                            <Dropdown menu={columnMenu} trigger={["click"]}>
                                <Button icon={<FilterOutlined />}>{t("transactions.columns")}</Button>
                            </Dropdown>
                        </Space>
                    }
                />

                <div className="idi-grid">
                    <StatCard
                        title={t("transactions.totalIn")}
                        value={<MoneyDisplay value={summary.total_in} emphasize tone="success" />}
                        hint={t("transactions.incomeAccumulated")}
                        tone="success"
                    />
                    <StatCard
                        title={t("transactions.totalOut")}
                        value={<MoneyDisplay value={summary.total_out} emphasize tone="danger" />}
                        hint={t("transactions.expenseAccumulated")}
                        tone="danger"
                    />
                    <StatCard
                        title={t("transactions.closingBalance")}
                        value={<MoneyDisplay value={summary.closing_balance} emphasize tone="inverse" />}
                        hint={t("transactions.balanceClosing")}
                        tone="primary"
                    />
                </div>

                <FilterBar>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("common.search")}
                        </p>
                        <SearchInput
                            value={filterState.search}
                            onChange={(e) =>
                                setFilterState((prev) => ({ ...prev, search: e.target.value }))
                            }
                            placeholder={t("common.search")}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("common.type")}
                        </p>
                        <Select
                            value={filterState.type || undefined}
                            onChange={(value) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    type: value || "",
                                    category_id: "",
                                }))
                            }
                            style={{ width: 160 }}
                            allowClear
                            placeholder={t("common.type")}
                            options={[
                                { value: "in", label: t("transactions.typeIn") },
                                { value: "out", label: t("transactions.typeOut") },
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("common.category")}
                        </p>
                        <Select
                            value={filterState.category_id || undefined}
                            onChange={(value) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    category_id: value || "",
                                }))
                            }
                            style={{ width: 220 }}
                            allowClear
                            placeholder={t("common.category")}
                            options={categoryOptions
                                .filter((option) =>
                                    filterState.type ? option.type === filterState.type : true,
                                )
                                .map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("common.method")}
                        </p>
                        <Select
                            value={filterState.method_id || undefined}
                            onChange={(value) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    method_id: value || "",
                                }))
                            }
                            style={{ width: 180 }}
                            allowClear
                            placeholder={t("common.method")}
                            options={methodOptions}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                            {t("common.date")}
                        </p>
                        <RangePicker
                            value={filterState.range}
                            onChange={(value) =>
                                setFilterState((prev) => ({ ...prev, range: value || [] }))
                            }
                            format="DD/MM/YYYY"
                        />
                    </div>

                    <Button type="primary" onClick={applyFilters}>
                        {t("common.apply")}
                    </Button>
                    <Button onClick={resetFilters}>{t("common.reset")}</Button>
                </FilterBar>

                <Card title={t("transactions.balanceByMethod")}>
                    <div className="grid gap-4 md:grid-cols-3">
                        {methods.map((method) => (
                            <div
                                key={method.id}
                                className="rounded-3xl border border-zinc-200 bg-zinc-50 px-5 py-4"
                            >
                                <p className="text-sm font-semibold text-zinc-900">{method.name}</p>
                                <p className="mt-2 text-lg font-semibold text-zinc-950">
                                    {formatIDR(balancesByMethod?.[method.id] || 0)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title={t("transactions.transactionList")}>
                    <p className="mb-4 text-sm text-zinc-500">
                        {t("common.runningBalance")} {t("common.calculatedChronologically")}
                    </p>
                    <DataTable
                        columns={antdColumns}
                        dataSource={data}
                        rowKey="id"
                        pagination={{
                            current: transactions?.current_page || 1,
                            pageSize: transactions?.per_page || 10,
                            total: transactions?.total || 0,
                            showSizeChanger: true,
                        }}
                        emptyTitle={t("transactions.noTransactions")}
                        emptyDescription={t("transactions.noTransactionsDesc")}
                        onChange={(pagination, _filters, sorter) => {
                            const sortBy = sorter?.field || filters?.sortBy || "tx_date";
                            const sortDir =
                                sorter?.order === "ascend"
                                    ? "asc"
                                    : sorter?.order === "descend"
                                      ? "desc"
                                      : filters?.sortDir || "desc";
                            router.get(
                                route("transactions.index"),
                                {
                                    ...buildQuery(filterState),
                                    page: pagination.current,
                                    perPage: pagination.pageSize,
                                    sortBy,
                                    sortDir,
                                },
                                { preserveState: true, replace: true },
                            );
                        }}
                    />
                </Card>
            </PageShell>

            <Modal
                title={
                    <div className="pr-6">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700/80">
                            {t("transactions.transactionInfo")}
                        </p>
                        <h3 className="m-0 text-xl font-semibold text-zinc-950">
                            {editing ? t("transactions.editModal") : t("transactions.addModal")}
                        </h3>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={submitForm}
                okText={editing ? "Simpan" : "Tambah"}
                width={760}
                className="transaction-form-modal"
                styles={{
                    header: {
                        padding: "22px 24px 4px",
                        marginBottom: 0,
                    },
                    body: {
                        padding: "18px 24px 10px",
                    },
                    footer: {
                        padding: "16px 24px 22px",
                        marginTop: 0,
                        borderTop: "1px solid rgba(228, 228, 231, 0.85)",
                    },
                }}
            >
                <FormSection
                    title={t("transactions.transactionInfo")}
                    description={t("transactions.transactionInfoDesc")}
                >
                    <Form layout="vertical" form={form} className="transaction-form-grid">
                        <section className="rounded-[22px] border border-zinc-200/80 bg-zinc-50/75 p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                            <Form.Item
                                label="Tanggal"
                                name="tx_date"
                                rules={[{ required: true, message: "Tanggal wajib diisi" }]}
                            >
                                <DatePicker showTime style={{ width: "100%" }} />
                            </Form.Item>

                            <Form.Item
                                label="Tipe"
                                name="type"
                                rules={[{ required: true, message: "Tipe wajib diisi" }]}
                            >
                                <Select
                                    onChange={() => form.setFieldsValue({ category_id: null })}
                                    options={[
                                        { value: "in", label: "Masuk" },
                                        { value: "out", label: "Keluar" },
                                    ]}
                                />
                            </Form.Item>

                            <Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                                {() => (
                                    <Form.Item
                                        label="Kategori"
                                        name="category_id"
                                        rules={[{ required: true, message: "Kategori wajib diisi" }]}
                                    >
                                        <Select
                                            options={categoryOptions
                                                .filter((option) => {
                                                    const type = form.getFieldValue("type");
                                                    return type ? option.type === type : true;
                                                })
                                                .map((option) => ({
                                                    value: option.value,
                                                    label: option.label,
                                                }))}
                                        />
                                    </Form.Item>
                                )}
                            </Form.Item>

                            <Form.Item
                                label="Metode"
                                name="method_id"
                                rules={[{ required: true, message: "Metode wajib diisi" }]}
                            >
                                <Select options={methodOptions} />
                            </Form.Item>

                            <div className="md:col-span-2">
                                <Form.Item
                                    label="Nominal"
                                    name="amount"
                                    rules={[{ required: true, message: "Nominal wajib diisi" }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={1}
                                        inputMode="numeric"
                                        addonBefore="Rp"
                                        formatter={(value) =>
                                            value
                                                ? value
                                                      .toString()
                                                      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                                                : ""
                                        }
                                        parser={(value) =>
                                            value
                                                ?.toString()
                                                .replace(/\./g, "")
                                                .replace(/[^0-9]/g, "")
                                        }
                                    />
                                </Form.Item>
                            </div>
                            </div>
                        </section>

                        <section className="mt-4 rounded-[22px] border border-zinc-200/80 bg-white p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                            <Form.Item label="Keterangan" name="description" className="md:col-span-2">
                                <TextArea rows={3} />
                            </Form.Item>

                            <Form.Item label="Referensi" name="reference_no">
                                <Input />
                            </Form.Item>

                            <Form.Item
                                label="Lampiran Bukti"
                                extra={`Format: JPG/PNG/PDF • Maks ${maxAttachmentKb}KB • Folder: /public/transactions/YYYY-MM`}
                            >
                                <Upload
                                    fileList={fileList}
                                    beforeUpload={(file) => {
                                        const isValidType = acceptedAttachmentTypes.includes(
                                            String(file.type || "").toLowerCase(),
                                        );
                                        if (!isValidType) {
                                            message.error("Format lampiran harus JPG, PNG, atau PDF.");
                                            return Upload.LIST_IGNORE;
                                        }

                                        const isValidSize = file.size / 1024 <= maxAttachmentKb;
                                        if (!isValidSize) {
                                            message.error(`Ukuran lampiran maksimal ${maxAttachmentKb}KB.`);
                                            return Upload.LIST_IGNORE;
                                        }

                                        return false;
                                    }}
                                    maxCount={1}
                                    onChange={({ fileList: newFileList }) =>
                                        setFileList(newFileList)
                                    }
                                >
                                    <Button icon={<PaperClipOutlined />}>Pilih File</Button>
                                </Upload>
                            </Form.Item>
                            </div>

                            {editing?.attachment?.url ? (
                                <div className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                                Lampiran Saat Ini
                                            </p>
                                            <p className="m-0 mt-1 truncate text-sm font-medium text-zinc-800">
                                                {editing.attachment.title || "Bukti transaksi"}
                                            </p>
                                        </div>
                                        <Space>
                                            <Button
                                                size="small"
                                                icon={<EyeOutlined />}
                                                onClick={() => openAttachmentPreview(editing.attachment)}
                                            >
                                                Lihat
                                            </Button>
                                            <Button
                                                size="small"
                                                icon={<DownloadOutlined />}
                                                href={editing.attachment.download_url || editing.attachment.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                download={editing.attachment.title || true}
                                            >
                                                Unduh
                                            </Button>
                                        </Space>
                                    </div>
                                    <Form.Item
                                        className="!mb-0 mt-3"
                                        name="remove_attachment"
                                        valuePropName="checked"
                                    >
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                                            <input
                                                type="checkbox"
                                                checked={!!form.getFieldValue("remove_attachment")}
                                                onChange={(event) =>
                                                    form.setFieldsValue({
                                                        remove_attachment: event.target.checked,
                                                    })
                                                }
                                            />
                                            Hapus lampiran saat simpan
                                        </label>
                                    </Form.Item>
                                </div>
                            ) : null}
                        </section>
                    </Form>
                </FormSection>
            </Modal>

            <Modal
                title={t("transactions.attachmentPreview")}
                open={previewOpen}
                onCancel={() => {
                    setPreviewOpen(false);
                    setAttachmentPreview(null);
                }}
                footer={null}
                width={860}
                destroyOnClose
            >
                {attachmentPreview?.url ? (
                    attachmentPreviewMeta.isImage ? (
                        <div className="flex justify-center">
                            <img
                                src={attachmentPreview.url}
                                alt={attachmentPreview.title || "attachment-preview"}
                                className="max-h-[70vh] w-auto max-w-full rounded-xl border border-zinc-200"
                            />
                        </div>
                    ) : attachmentPreviewMeta.isPdf ? (
                        <iframe
                            title={attachmentPreview.title || "attachment-preview"}
                            src={attachmentPreview.url}
                            className="h-[70vh] w-full rounded-xl border border-zinc-200"
                        />
                    ) : (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <p className="mb-2 text-sm text-zinc-700">{t("transactions.attachmentPreviewUnsupported")}</p>
                            <Space>
                                <Button
                                    icon={<EyeOutlined />}
                                    href={attachmentPreview.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t("transactions.attachmentOpen")}
                                </Button>
                                <Button
                                    icon={<DownloadOutlined />}
                                    href={attachmentPreview.download_url || attachmentPreview.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={attachmentPreview.title || true}
                                >
                                    {t("transactions.attachmentDownload")}
                                </Button>
                            </Space>
                        </div>
                    )
                ) : null}
            </Modal>
        </AppLayout>
    );
}
