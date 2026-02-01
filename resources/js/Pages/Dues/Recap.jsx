import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
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

export default function DuesRecap() {
  const { props } = usePage();
  const filters = props.filters || {};
  const kpis = props.kpis || {};
  const monthlyRecap = props.monthlyRecap || [];
  const memberRecap = props.memberRecap || [];
  const trend = props.trend || [];
  const topArrears = props.topArrears || [];
  const divisions = props.divisions || [];
  const members = props.members || [];
  const canExport = props?.auth?.permissions?.includes("dues.export");

  const [startPeriod, setStartPeriod] = useState(filters.start_period);
  const [endPeriod, setEndPeriod] = useState(filters.end_period);

  useEffect(() => {
    setStartPeriod(filters.start_period);
    setEndPeriod(filters.end_period);
  }, [filters.start_period, filters.end_period]);

  const applyFilters = (next) => {
    router.get(route("dues.recap"), { ...filters, ...next }, { preserveState: true, replace: true });
  };

  const exportRecap = () => {
    const params = {
      start_period: filters.start_period,
      end_period: filters.end_period,
      division_id: filters.division_id,
      member_id: filters.member_id,
    };
    window.location.href = route("dues.recap.export", params);
  };

  const monthlyColumns = useMemo(() => {
    const helper = createColumnHelper();
    return [
      helper.accessor("period_label", {
        header: "Periode",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("total_due", {
        header: "Total Tagihan",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("total_paid", {
        header: "Total Dibayar",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("outstanding", {
       header: "Sisa Tagihan",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("collection_rate", {
        header: "Rasio Penagihan",
        cell: (info) => `${info.getValue()}%`,
      }),
      helper.accessor("overdue_count", {
        header: "Menunggak",
        cell: (info) => info.getValue(),
      }),
    ];
  }, []);

  const memberColumns = useMemo(() => {
    const helper = createColumnHelper();
    return [
      helper.accessor("npa", {
        header: "NPA",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("name", {
        header: "Nama",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("total_due", {
        header: "Total Tagihan",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("total_paid", {
        header: "Total Dibayar",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("outstanding", {
        header: "Sisa Tagihan",
        cell: (info) => formatIDR(info.getValue()),
      }),
      helper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const value = info.getValue();
          const statusMap = {
            PAID: { label: "Lunas", color: "green" },
            UNPAID: { label: "Belum Bayar", color: "gold" },
            OVERDUE: { label: "Menunggak", color: "red" },
          };
          const { label, color } = statusMap[value] || {
            label: value,
            color: "default",
          };
          return <Tag color={color}>{label}</Tag>;
        },
      }),
    ];
  }, []);

  const monthlyTable = useReactTable({
    data: monthlyRecap,
    columns: monthlyColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const memberTable = useReactTable({
    data: memberRecap,
    columns: memberColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const buildAntdColumns = (table) =>
    table.getVisibleLeafColumns().map((column) => ({
      title: column.columnDef.header,
      dataIndex: column.id,
      key: column.id,
      render: (_, row) =>
        flexRender(column.columnDef.cell, {
          getValue: () => row[column.id],
          row: { original: row },
          column,
          table,
        }),
    }));

  return (
    <AppLayout title="Rekap Iuran">
      <PageShell>
        <PageHeader
          title="Rekap Iuran"
          extra={
            <Button type="primary" onClick={exportRecap} disabled={!canExport}>
              Export XLSX
            </Button>
          }
        />

        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space wrap size={10} style={{ width: "100%" }}>
            <DatePicker
              picker="month"
              value={startPeriod ? dayjs(startPeriod + "-01") : null}
              placeholder="Periode awal"
              onChange={(value) => {
                const next = value ? value.format("YYYY-MM") : null;
                setStartPeriod(next);
                applyFilters({ start_period: next });
              }}
            />
            <DatePicker
              picker="month"
              value={endPeriod ? dayjs(endPeriod + "-01") : null}
              placeholder="Periode akhir"
              onChange={(value) => {
                const next = value ? value.format("YYYY-MM") : null;
                setEndPeriod(next);
                applyFilters({ end_period: next });
              }}
            />
            <Select
              allowClear
              placeholder="Divisi"
              value={filters.division_id || undefined}
              onChange={(value) => applyFilters({ division_id: value })}
              options={divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))}
              style={{ minWidth: 180 }}
            />
            <Select
              allowClear
              placeholder="Anggota"
              value={filters.member_id || undefined}
              onChange={(value) => applyFilters({ member_id: value })}
              options={members.map((member) => ({
                value: member.id,
                label: `${member.npa} - ${member.full_name}`,
              }))}
              style={{ minWidth: 240 }}
              showSearch
              optionFilterProp="label"
            />
          </Space>
        </Card>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Total Tagihan</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{formatIDR(kpis.total_due)}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Total Diterima</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{formatIDR(kpis.total_paid)}</div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Sisa Tagihan</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{formatIDR(kpis.outstanding)}</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Rasio Penagihan</Text>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{kpis.collection_rate}%</div>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
              <Text type="secondary">Jumlah Member</Text>
              <Row style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Text>Lunas</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{kpis.counts?.paid || 0}</div>
                </Col>
                <Col span={8}>
                  <Text>Belum Bayar</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{kpis.counts?.unpaid || 0}</div>
                </Col>
                <Col span={8}>
                  <Text>Menunggak</Text>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{kpis.counts?.overdue || 0}</div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} lg={14}>
            <Card title="Rekap Per Bulan" style={{ borderRadius: 12 }}>
              <Table
                columns={buildAntdColumns(monthlyTable)}
                dataSource={monthlyRecap}
                rowKey="period"
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Tren Bulanan (tanpa chart library)" style={{ borderRadius: 12 }}>
              <Table
                columns={[
                  { title: "Periode", dataIndex: "period" },
                  {
                    title: "Tagihan",
                    dataIndex: "total_due",
                    render: (value) => formatIDR(value),
                  },
                  {
                    title: "Diterima",
                    dataIndex: "total_paid",
                    render: (value) => formatIDR(value),
                  },
                ]}
                dataSource={trend}
                rowKey="period"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={14}>
            <Card title="Rekap Per Member" style={{ borderRadius: 12 }}>
              <Table
                columns={buildAntdColumns(memberTable)}
                dataSource={memberRecap}
                rowKey="member_id"
                pagination={{ pageSize: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Top 10 Penunggak" style={{ borderRadius: 12 }}>
              <Table
                dataSource={topArrears}
                rowKey="member_id"
                pagination={false}
                columns={[
                  { title: "NPA", dataIndex: "npa" },
                  { title: "Nama", dataIndex: "name" },
                  {
                    title: "Sisa Tagihan",
                    dataIndex: "outstanding",
                    render: (value) => formatIDR(value),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </PageShell>
    </AppLayout>
  );
}