import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import {
    Button,
    Card,
    Col,
    DatePicker,
    Dropdown,
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
    Upload,
} from "antd";
import {
    PlusOutlined,
    FilterOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    PaperClipOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";

const { RangePicker } = DatePicker;
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

    const columns = useMemo(
        () => [
            {
                accessorKey: "tx_date",
                header: "Tanggal",
                cell: ({ row }) =>
                    row.original.tx_date
                        ? dayjs(row.original.tx_date).format("DD/MM/YYYY")
                        : "-",
                meta: { width: 120, sorter: true },
            },
            {
                accessorKey: "type",
                header: "Tipe",
                cell: ({ row }) =>
                    row.original.type === "in" ? (
                        <Tag color="green">Masuk</Tag>
                    ) : (
                        <Tag color="red">Keluar</Tag>
                    ),
                meta: { width: 110 },
            },
            {
                accessorKey: "category",
                header: "Kategori",
                cell: ({ row }) => row.original.category || "-",
                meta: { width: 160 },
            },
            {
                accessorKey: "method",
                header: "Metode",
                cell: ({ row }) => row.original.method || "-",
                meta: { width: 140 },
            },
            {
                accessorKey: "description",
                header: "Keterangan",
                cell: ({ row }) => row.original.description || "-",
            },
            {
                accessorKey: "amount",
                header: "Nominal",
                cell: ({ row }) => (
                    <Text
                        strong
                        style={{
                            color: row.original.type === "out" ? "#cf1322" : "#135200",
                        }}
                    >
                        {row.original.type === "out" ? "-" : "+"}{" "}
                        {formatIDR(row.original.amount)}
                    </Text>
                ),
                meta: { width: 160, align: "right", sorter: true },
            },
            {
                accessorKey: "reference_no",
                header: "Referensi",
                cell: ({ row }) => row.original.reference_no || row.original.source,
                meta: { width: 160 },
            },
            {
                accessorKey: "attachment",
                header: "Lampiran",
                cell: ({ row }) =>
                    row.original.attachment ? (
                        <a href={row.original.attachment.url} target="_blank" rel="noreferrer">
                            Buka
                        </a>
                    ) : (
                        <Text type="secondary">-</Text>
                    ),
                meta: { width: 100 },
            },
            {
                accessorKey: "running_balance",
                header: "Saldo Berjalan",
                cell: ({ row }) => (
                    <Text type="secondary">{formatIDR(row.original.running_balance)}</Text>
                ),
                meta: { width: 170, align: "right" },
            },
            {
                id: "actions",
                header: "Aksi",
                cell: ({ row }) => {
                    const items = [
                        {
                            key: "edit",
                            icon: <EditOutlined />,
                            label: "Edit",
                            disabled: row.original.is_locked,
                            onClick: () => handleEdit(row.original),
                        },
                        {
                            key: "delete",
                            icon: <DeleteOutlined />,
                            label: "Batalkan",
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
        []
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

    const categoryOptions = useMemo(
        () =>
            categories.map((category) => ({
                value: category.id,
                label: category.name,
                type: category.type,
            })),
        [categories]
    );

    const methodOptions = useMemo(
        () => methods.map((method) => ({ value: method.id, label: method.name })),
        [methods]
    );

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
        });
        setIsModalOpen(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: "Batalkan transaksi?",
            content: "Transaksi akan ditandai sebagai void.",
            okText: "Ya, batalkan",
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
        items: visibleColumns.map((col) => ({
            key: col.key,
            label: (
                <label style={{ display: "flex", gap: 8 }}>
                    <input
                        type="checkbox"
                        checked={col.checked}
                        onChange={() => table.getColumn(col.key).toggleVisibility()}
                    />
                    {col.label}
                </label>
            ),
        })),
    };

    return (
        <AppLayout title="Kas / Transaksi">
            <PageShell>
                <PageHeader
                    title="Kas / Transaksi"
                    extra={
                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={openModal}
                            >
                                Tambah Transaksi
                            </Button>
                            <Dropdown menu={columnMenu} trigger={["click"]}>
                                <Button icon={<FilterOutlined />}>
                                    Kolom
                                </Button>
                            </Dropdown>
                        </Space>
                    }
                />

                <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
                    <Space wrap size={10} style={{ width: "100%" }}>
                        <Input
                            allowClear
                            value={filterState.search}
                            onChange={(e) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    search: e.target.value,
                                }))
                            }
                            placeholder="Cari deskripsi, referensi, anggota"
                            style={{ width: 260 }}
                        />

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
                            placeholder="Tipe"
                            options={[
                                { value: "in", label: "Masuk" },
                                { value: "out", label: "Keluar" },
                            ]}
                        />

                        <Select
                            value={filterState.category_id || undefined}
                            onChange={(value) =>
                                setFilterState((prev) => ({
                                    ...prev,
                                    category_id: value || "",
                                }))
                            }
                            style={{ width: 200 }}
                            allowClear
                            placeholder="Kategori"
                            options={categoryOptions
                                .filter((option) =>
                                    filterState.type
                                        ? option.type === filterState.type
                                        : true
                                )
                                .map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                }))}
                        />

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
                            placeholder="Metode"
                            options={methodOptions}
                        />

                        <RangePicker
                            value={filterState.range}
                            onChange={(value) =>
                                setFilterState((prev) => ({ ...prev, range: value || [] }))
                            }
                            format="DD/MM/YYYY"
                        />

                        <Button type="primary" onClick={applyFilters}>
                            Terapkan
                        </Button>
                        <Button onClick={resetFilters}>Reset</Button>
                    </Space>
                </Card>

                <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#dff4ea" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#135200", fontWeight: 600 }}>
                                Total Masuk
                            </Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#135200" }}>
                                {formatIDR(summary.total_in)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#ffe3e3" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#a8071a", fontWeight: 600 }}>
                                Total Keluar
                            </Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#a8071a" }}>
                                {formatIDR(summary.total_out)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#dbeafe" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#003a8c", fontWeight: 600 }}>
                                Net Kas
                            </Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#003a8c" }}>
                                {formatIDR(summary.net)}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card style={{ borderRadius: 12, background: "#fff7e6" }} bodyStyle={{ padding: 14 }}>
                            <Text style={{ color: "#ad4e00", fontWeight: 600 }}>
                                Saldo Akhir
                            </Text>
                            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#ad4e00" }}>
                                {formatIDR(summary.closing_balance)}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
                    <Text strong>Saldo per Metode (akhir periode)</Text>
                    <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                        {methods.map((method) => (
                            <Col xs={24} md={8} key={method.id}>
                                <Card size="small" style={{ borderRadius: 10 }}>
                                    <Space direction="vertical">
                                        <Text>{method.name}</Text>
                                        <Text strong>
                                            {formatIDR(balancesByMethod?.[method.id] || 0)}
                                        </Text>
                                    </Space>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                    <Table
                        columns={antdColumns}
                        dataSource={data}
                        rowKey="id"
                        pagination={{
                            current: transactions?.current_page || 1,
                            pageSize: transactions?.per_page || 10,
                            total: transactions?.total || 0,
                            showSizeChanger: true,
                        }}
                        onChange={(pagination, _filters, sorter) => {
                            const sortBy = sorter?.field || filters?.sortBy || "tx_date";
                            const sortDir = sorter?.order === "ascend" ? "asc" : "desc";
                            router.get(
                                route("transactions.index"),
                                {
                                    ...buildQuery(filterState),
                                    page: pagination.current,
                                    perPage: pagination.pageSize,
                                    sortBy,
                                    sortDir,
                                },
                                { preserveState: true, replace: true }
                            );
                        }}
                    />
                </Card>
            </PageShell>

            <Modal
                title={editing ? "Edit Transaksi" : "Tambah Transaksi"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={submitForm}
                okText={editing ? "Simpan" : "Tambah"}
            >
                <Form layout="vertical" form={form}>
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
                    <Form.Item
                        label="Nominal"
                        name="amount"
                        rules={[{ required: true, message: "Nominal wajib diisi" }]}
                    >
                        <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            formatter={(value) =>
                                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                            }
                        />
                    </Form.Item>
                    <Form.Item label="Keterangan" name="description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label="Referensi" name="reference_no">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Lampiran">
                        <Upload
                            fileList={fileList}
                            beforeUpload={() => false}
                            maxCount={1}
                            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                        >
                            <Button icon={<PaperClipOutlined />}>Pilih File</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </AppLayout>
    );
}
