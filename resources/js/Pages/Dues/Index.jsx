import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
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
  Drawer,
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
  message,
} from "antd";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  CreditCardOutlined,
  EyeOutlined,
  FileTextOutlined,
  PrinterOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

export default function DuesIndex() {
   const { props } = usePage();
  const invoices = props.invoices?.data || [];
  const meta = props.invoices?.meta || {};
  const filters = props.filters || {};
  const periods = props.periods || [];
  const divisions = props.divisions || [];
  const paymentStatuses = props.paymentStatuses || [];
  const cashMethods = props.cashMethods || [];
  const settings = props.settings || {};
  const summary = props.summary || {};

  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [generateForm] = Form.useForm();
  const applyYearly = Form.useWatch("apply_to_year", paymentForm);

  const canCollect = props?.auth?.permissions?.includes("dues.collect");
  const canGenerate = props?.auth?.permissions?.includes("dues.generate");
  const canPrint = props?.auth?.permissions?.includes("dues.print");

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
    router.get(route("dues.index"), { ...filters, ...next }, { preserveState: true, replace: true });
  };

  const handleSort = (columnId) => {
    const sortBy = filters.sortBy || "full_name";
    const sortDir = filters.sortDir || "asc";
    const isSame = sortBy === columnId;
    const nextDir = isSame && sortDir === "asc" ? "desc" : "asc";
    applyFilters({ sortBy: columnId, sortDir: nextDir });
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    paymentForm.setFieldsValue({
      amount: invoice.outstanding || invoice.amount_due,
      paid_at: dayjs(),
      cash_method_id: cashMethods[0]?.id,
      payment_status_id: invoice.payment_status_id || paymentStatuses[0]?.id,
      note: "",
      reference_no: "",
      apply_to_year: false,
      apply_year: dayjs(),
    });
    setPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      if (!selectedInvoice) return;

      const payload = {
        ...values,
        paid_at: values.paid_at?.format("YYYY-MM-DD HH:mm:ss"),
        apply_year: values.apply_to_year ? values.apply_year?.format("YYYY") : null,
      };

      router.post(route("dues.pay", selectedInvoice.id), payload, {
        preserveScroll: true,
        onSuccess: () => {
          message.success("Pembayaran iuran berhasil disimpan.");
          setPaymentModalOpen(false);
          setSelectedInvoice(null);
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

      const openDetail = async (invoice) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const { data } = await axios.get(route("dues.detail", invoice.id));
      setDetailData(data);
    } catch {
      message.error("Gagal memuat detail iuran.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openReceipt = (invoice) => {
    if (!invoice.last_payment_id) {
      message.warning("Belum ada pembayaran untuk dicetak.");
      return;
    }
    window.open(route("dues.receipt", invoice.last_payment_id), "_blank");
  };

  const submitGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      const payload = {
        type: values.type,
        period: values.period?.format("YYYY-MM"),
        year: values.year?.format("YYYY"),
      };

      router.post(route("dues.generate"), payload, {
        preserveScroll: true,
        onSuccess: () => {
          message.success("Tagihan iuran berhasil digenerate.");
          setGenerateModalOpen(false);
          generateForm.resetFields();
        },
      });
    } catch {}
  };

  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        value: period.period,
        label: period.name || dayjs(period.period + "-01").format("MMMM YYYY"),
      })),
    [periods]
  );

  const statusOptions = useMemo(
    () =>
      paymentStatuses.map((status) => ({
        value: status.code,
        label: status.name,
      })),
    [paymentStatuses]
  );

  const columnHelper = createColumnHelper();
  const columns = useMemo(
    () => [
      columnHelper.accessor("npa", {
        header: "NPA",
        meta: { label: "NPA", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("full_name", {
        header: "Nama",
        meta: { label: "Nama", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("division", {
        header: "Divisi",
        meta: { label: "Divisi", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("status", {
        header: "Status Iuran",
        meta: { label: "Status Iuran", sortable: true },
        cell: (info) => {
          const row = info.row.original;
          return (
            <Tag color={row.status_color || "blue"}>
              {row.status_name || row.status || "-"}
            </Tag>
          );
        },
      }),
      columnHelper.accessor("amount_due", {
        header: "Nominal",
        meta: { label: "Nominal", sortable: true },
        cell: (info) => <Text strong>{formatIDR(info.getValue())}</Text>,
      }),
      columnHelper.accessor("amount_paid", {
        header: "Terbayar",
        meta: { label: "Terbayar", sortable: true },
        cell: (info) => formatIDR(info.getValue()),
      }),
      columnHelper.accessor("outstanding", {
        header: "Sisa",
        meta: { label: "Sisa" },
        cell: (info) => formatIDR(info.getValue()),
      }),
      columnHelper.accessor("due_date", {
        header: "Jatuh Tempo",
        meta: { label: "Jatuh Tempo", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.display({
        id: "actions",
        header: "Aksi",
        meta: { label: "Aksi" },
        cell: (info) => {
          const row = info.row.original;
          return (
            <Space>
              <Button
                size="small"
                icon={<CreditCardOutlined />}
                onClick={() => openPaymentModal(row)}
                disabled={!canCollect}
              >
                Bayar
              </Button>
              <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
                Detail
              </Button>
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => openReceipt(row)}
                disabled={!canPrint || !row.last_payment_id}
              >
                Kwitansi
              </Button>
            </Space>
          );
        },
      }),
    ],
    [canCollect, canPrint]
  );

  const table = useReactTable({
    data: invoices,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const antdColumns = visibleColumns.map((column) => {
    const label = column.columnDef.meta?.label || column.columnDef.header;
    const sortable = column.columnDef.meta?.sortable;
    const isSorted = (filters.sortBy || "full_name") === column.id;
    const sortDir = filters.sortDir || "asc";

    return {
      title: (
        <Space
          onClick={() => sortable && handleSort(column.id)}
          style={{ cursor: sortable ? "pointer" : "default" }}
        >
          <span>{label}</span>
          {sortable && isSorted && sortDir === "asc" && (
            <CaretUpOutlined style={{ fontSize: 12 }} />
          )}
          {sortable && isSorted && sortDir === "desc" && (
            <CaretDownOutlined style={{ fontSize: 12 }} />
          )}
        </Space>
      ),
      key: column.id,
      dataIndex: column.id,
      render: (_, row) =>
        flexRender(column.columnDef.cell, {
          getValue: () => row[column.id],
          row: { original: row },
          column,
          table,
        }),
    };
  });

  const columnMenu = (
    <Card style={{ minWidth: 220 }} bodyStyle={{ padding: 12 }}>
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        {table.getAllLeafColumns().map((column) => (
          <Checkbox
            key={column.id}
            checked={column.getIsVisible()}
            onChange={() => column.toggleVisibility()}
          >
            {column.columnDef.meta?.label || column.id}
          </Checkbox>
        ))}
      </Space>
    </Card>
  );

  return (
    <AppLayout title="Iuran">
      <PageShell>
        <PageHeader
          title="Iuran"
          extra={
            <Space>
              <Dropdown dropdownRender={() => columnMenu} trigger={["click"]}>
                <Button icon={<SettingOutlined />}>Kolom</Button>
              </Dropdown>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => setGenerateModalOpen(true)}
                disabled={!canGenerate}
              >
                Generate Tagihan
              </Button>
            </Space>
          }
        />

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Paid</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{summary.paid || 0}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Unpaid</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{summary.unpaid || 0}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Overdue</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{summary.overdue || 0}</div>
            </Card>
          </Col>
        </Row>

        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space wrap size={10} style={{ width: "100%" }}>
            <Input
              allowClear
              placeholder="Cari NPA / Nama"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder="Periode"
              options={periodOptions}
              value={filters.period || undefined}
              onChange={(value) => applyFilters({ period: value, page: 1 })}
              style={{ width: 180 }}
            />
            <Select
              allowClear
              placeholder="Status"
              options={statusOptions}
              value={filters.status || undefined}
              onChange={(value) => applyFilters({ status: value, page: 1 })}
              style={{ width: 160 }}
            />
            <Select
              allowClear
              placeholder="Divisi"
              options={divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))}
              value={filters.division_id || undefined}
              onChange={(value) => applyFilters({ division_id: value, page: 1 })}
              style={{ width: 180 }}
            />
          </Space>
        </Card>

        {/* History table */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={antdColumns}
            dataSource={invoices}
            rowKey="id"
            pagination={{
              current: meta.current_page,
              total: meta.total,
              pageSize: meta.per_page,
              onChange: (page, pageSize) =>
                applyFilters({ page, perPage: pageSize }),
            }}
          />
        </Card>
      </PageShell>
      <Modal
        open={paymentModalOpen}
        title="Input Pembayaran"
        onCancel={() => {
          setPaymentModalOpen(false);
          paymentForm.resetFields();
        }}
        onOk={submitPayment}
        okText="Simpan"
      >
        <Form form={paymentForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="Nominal"
            name="amount"
            rules={[{ required: true, message: "Masukkan nominal" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={settings.allow_partial ? 1 : selectedInvoice?.outstanding}
              formatter={(v) => `Rp ${String(v || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
              parser={(v) => Number(String(v || "").replace(/[^\d]/g, ""))}
            />
          </Form.Item>
          <Form.Item
            label="Tanggal Bayar"
            name="paid_at"
            rules={[{ required: true, message: "Pilih tanggal bayar" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item label="Metode" name="cash_method_id">
            <Select
              options={cashMethods.map((method) => ({
                value: method.id,
                label: method.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="Status Pembayaran" name="payment_status_id">
            <Select
              options={paymentStatuses.map((status) => ({
                value: status.id,
                label: status.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="No. Referensi" name="reference_no">
            <Input placeholder="Opsional" />
          </Form.Item>
          <Form.Item label="Catatan" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="apply_to_year" valuePropName="checked">
            <Checkbox>
              Bayar 1 tahun sekaligus
            </Checkbox>
          </Form.Item>
          {applyYearly && (
            <Form.Item
              label="Tahun"
              name="apply_year"
              rules={[{ required: true, message: "Pilih tahun" }]}
            >
              <DatePicker picker="year" style={{ width: "100%" }} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={generateModalOpen}
        title="Generate Tagihan Periode"
        onCancel={() => {
          setGenerateModalOpen(false);
          generateForm.resetFields();
        }}
        onOk={submitGenerate}
        okText="Generate"
      >
        <Form form={generateForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="Tipe"
            name="type"
            rules={[{ required: true, message: "Pilih tipe" }]}
            initialValue="monthly"
          >
            <Select
              options={[
                { value: "monthly", label: "Bulanan" },
                { value: "yearly", label: "Tahunan" },
              ]}
            />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) =>
              getFieldValue("type") === "monthly" ? (
                <Form.Item
                  label="Periode"
                  name="period"
                  rules={[{ required: true, message: "Pilih periode" }]}
                >
                  <DatePicker picker="month" style={{ width: "100%" }} />
                </Form.Item>
              ) : (
                <Form.Item
                  label="Tahun"
                  name="year"
                  rules={[{ required: true, message: "Pilih tahun" }]}
                >
                  <DatePicker picker="year" style={{ width: "100%" }} />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        width={480}
        title="Detail Iuran"
        onClose={() => setDetailOpen(false)}
      >
        {detailLoading ? (
          <Text>Memuat...</Text>
        ) : detailData ? (
          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <Card size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text strong>{detailData.invoice?.member?.name}</Text>
                <Text type="secondary">
                  {detailData.invoice?.member?.npa} · {detailData.invoice?.member?.division}
                </Text>
                <Text>Periode: {detailData.invoice?.period_name}</Text>
                <Text>Jatuh tempo: {detailData.invoice?.due_date}</Text>
                <Tag color="blue">{detailData.invoice?.status_name}</Tag>
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
                    title: "Nominal",
                    dataIndex: "amount",
                    render: (value) => formatIDR(value),
                  },
                  { title: "Metode", dataIndex: "method" },
                ]}
              />
            </Card>
          </Space>
        ) : (
          <Text type="secondary">Tidak ada data.</Text>
        )}
      </Drawer>
    </AppLayout>
  );
}
