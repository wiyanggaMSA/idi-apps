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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useI18n } from "@/Contexts/I18nContext";

const { Text } = Typography;

function formatIDR(value, language = "id") {
  try {
    return new Intl.NumberFormat(language === "en" ? "en-US" : "id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `Rp ${String(value || 0)}`;
  }
}

export default function DuesRecap() {
  const { language } = useI18n();
  const isEn = language === "en";
  const { props } = usePage();
  const filters = props.filters || {};
  const kpis = props.kpis || {};
  const realtimeReceived = props.realtimeReceived || 0;
  const monthlyRecap = props.monthlyRecap || [];
  const memberRecap = props.memberRecap || [];
  const topArrearsLongTerm = props.topArrearsLongTerm || [];
  const topPayersLongTerm = props.topPayersLongTerm || [];
  const analyticsRange = props.analyticsRange || {};
  const divisions = props.divisions || [];
  const canExport = props?.auth?.permissions?.includes("dues.export");
  const copy = {
    pageTitle: isEn ? "Dues Recap" : "Rekap Iuran",
    export: "Export XLSX",
    startPeriod: isEn ? "Start period" : "Periode awal",
    endPeriod: isEn ? "End period" : "Periode akhir",
    division: isEn ? "Division" : "Divisi",
    totalDue: isEn ? "Total Billed" : "Total Tagihan",
    totalPaid: isEn ? "Total Paid" : "Total Dibayar",
    totalReceived: isEn ? "Total Paid for Period" : "Total Terbayar Periode",
    realtimeReceived: isEn ? "Realtime Dues Income" : "Pemasukan Iuran Realtime",
    outstanding: isEn ? "Outstanding" : "Sisa Tagihan",
    collectionRate: isEn ? "Collection Rate" : "Rasio Penagihan",
    memberCount: isEn ? "Member Count" : "Jumlah Member",
    paid: isEn ? "Paid" : "Lunas",
    unpaid: isEn ? "Unpaid" : "Belum Bayar",
    overdue: isEn ? "Overdue" : "Menunggak",
    monthlyRecap: isEn ? "Monthly Recap" : "Rekap Per Bulan",
    monthlyTrend: isEn ? "Monthly Trend" : "Tren Bulanan",
    collectionComposition: isEn ? "Collection Composition" : "Komposisi Penagihan",
    arrearsChart: isEn ? "Top Arrears (Long-term)" : "Top Penunggak (Jangka Panjang)",
    memberRecap: isEn ? "Member Recap" : "Rekap Per Member",
    topPayersChart: isEn ? "Top Payers (Long-term)" : "Top Pembayar (Jangka Panjang)",
    analyticsWindow: isEn ? "Long-term analytics range" : "Rentang analitik jangka panjang",
    asOfActivePeriod: isEn
      ? "Long-term horizon: unpaid months without payment are treated as outstanding dues."
      : "Horizon jangka panjang: bulan tanpa pembayaran dihitung sebagai sisa tagihan.",
    monthsData: isEn ? "{count} months of data" : "{count} bulan data",
    yearsData: isEn ? "{count} years of data" : "{count} tahun data",
    period: isEn ? "Period" : "Periode",
    billed: isEn ? "Billed" : "Tagihan",
    received: isEn ? "Paid for Period" : "Terbayar Periode",
    name: isEn ? "Name" : "Nama",
    status: isEn ? "Status" : "Status",
    collectionRateShort: isEn ? "Collection" : "Kolektibilitas",
    noChartData: isEn ? "No chart data for this filter." : "Belum ada data grafik untuk filter ini.",
  };

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
    };
    window.location.href = route("dues.recap.export", params);
  };

  const monthlyColumns = useMemo(() => {
    const helper = createColumnHelper();
    return [
      helper.accessor("period_label", {
        header: copy.period,
        cell: (info) => info.getValue(),
      }),
      helper.accessor("total_due", {
        header: copy.totalDue,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("total_paid", {
        header: copy.totalPaid,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("outstanding", {
       header: copy.outstanding,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("collection_rate", {
        header: copy.collectionRate,
        cell: (info) => `${info.getValue()}%`,
      }),
      helper.accessor("overdue_count", {
        header: copy.overdue,
        cell: (info) => info.getValue(),
      }),
    ];
  }, [copy, language]);

  const memberColumns = useMemo(() => {
    const helper = createColumnHelper();
    return [
      helper.accessor("npa", {
        header: "NPA",
        cell: (info) => info.getValue(),
      }),
      helper.accessor("name", {
        header: copy.name,
        cell: (info) => info.getValue(),
      }),
      helper.accessor("total_due", {
        header: copy.totalDue,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("total_paid", {
        header: copy.totalPaid,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("outstanding", {
        header: copy.outstanding,
        cell: (info) => formatIDR(info.getValue(), language),
      }),
      helper.accessor("status", {
        header: copy.status,
        cell: (info) => {
          const value = info.getValue();
          const statusMap = {
            PAID: { label: copy.paid, color: "green" },
            UNPAID: { label: copy.unpaid, color: "gold" },
            OVERDUE: { label: copy.overdue, color: "red" },
          };
          const { label, color } = statusMap[value] || {
            label: value,
            color: "default",
          };
          return <Tag color={color}>{label}</Tag>;
        },
      }),
    ];
  }, [copy, language]);

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

  const trendChartData = useMemo(
    () =>
      monthlyRecap.map((row) => ({
        ...row,
        short_label: row.period?.slice(2) || row.period_label,
      })),
    [monthlyRecap],
  );

  const statusChartData = useMemo(
    () => [
      { name: copy.paid, value: kpis.counts?.paid || 0, color: "#16a34a" },
      { name: copy.unpaid, value: kpis.counts?.unpaid || 0, color: "#d97706" },
      { name: copy.overdue, value: kpis.counts?.overdue || 0, color: "#dc2626" },
    ].filter((item) => item.value > 0),
    [copy, kpis.counts],
  );

  const topArrearsChartData = useMemo(
    () =>
      topArrearsLongTerm
        .slice(0, 8)
        .map((row) => ({
          ...row,
          short_name:
            row.name?.length > 18 ? `${row.name.slice(0, 18).trim()}...` : row.name,
        }))
        .reverse(),
    [topArrearsLongTerm],
  );

  const topPayersChartData = useMemo(
    () =>
      topPayersLongTerm
        .slice(0, 8)
        .map((row) => ({
          ...row,
          short_name:
            row.name?.length > 18 ? `${row.name.slice(0, 18).trim()}...` : row.name,
        }))
        .reverse(),
    [topPayersLongTerm],
  );

  const analyticsMonths = useMemo(() => {
    if (!analyticsRange.start_period || !analyticsRange.end_period) return 0;
    const start = dayjs(`${analyticsRange.start_period}-01`);
    const end = dayjs(`${analyticsRange.end_period}-01`);
    if (!start.isValid() || !end.isValid()) return 0;
    return Math.max(end.diff(start, "month") + 1, 0);
  }, [analyticsRange.end_period, analyticsRange.start_period]);

  const analyticsWindowLabel = useMemo(() => {
    if (!analyticsMonths) return "—";
    if (analyticsMonths >= 12 && analyticsMonths % 12 === 0) {
      return copy.yearsData.replace("{count}", String(analyticsMonths / 12));
    }
    return copy.monthsData.replace("{count}", String(analyticsMonths));
  }, [analyticsMonths, copy.monthsData, copy.yearsData]);

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
    <AppLayout title={copy.pageTitle}>
      <PageShell>
        <PageHeader
          title={copy.pageTitle}
          extra={
            <Button type="primary" onClick={exportRecap} disabled={!canExport}>
              {copy.export}
            </Button>
          }
        />

        <Card style={{ borderRadius: 12, marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space wrap size={10} style={{ width: "100%" }}>
            <DatePicker
              picker="month"
              value={startPeriod ? dayjs(startPeriod + "-01") : null}
              placeholder={copy.startPeriod}
              onChange={(value) => {
                const next = value ? value.format("YYYY-MM") : null;
                setStartPeriod(next);
                applyFilters({ start_period: next });
              }}
            />
            <DatePicker
              picker="month"
              value={endPeriod ? dayjs(endPeriod + "-01") : null}
              placeholder={copy.endPeriod}
              onChange={(value) => {
                const next = value ? value.format("YYYY-MM") : null;
                setEndPeriod(next);
                applyFilters({ end_period: next });
              }}
            />
            <Select
              allowClear
              placeholder={copy.division}
              value={filters.division_id || undefined}
              onChange={(value) => applyFilters({ division_id: value })}
              options={divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))}
              style={{ minWidth: 180 }}
            />
          </Space>
        </Card>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.totalDue}</Text>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatIDR(kpis.total_due, language)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.totalReceived}</Text>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatIDR(kpis.total_paid, language)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.realtimeReceived}</Text>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatIDR(realtimeReceived, language)}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.outstanding}</Text>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatIDR(kpis.outstanding, language)}</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} md={8}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.collectionRate}</Text>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{kpis.collection_rate}%</div>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{copy.memberCount}</Text>
              <Row style={{ marginTop: 10 }}>
                <Col span={8}>
                  <Text style={{ fontSize: 12 }}>{copy.paid}</Text>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{kpis.counts?.paid || 0}</div>
                </Col>
                <Col span={8}>
                  <Text style={{ fontSize: 12 }}>{copy.unpaid}</Text>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{kpis.counts?.unpaid || 0}</div>
                </Col>
                <Col span={8}>
                  <Text style={{ fontSize: 12 }}>{copy.overdue}</Text>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{kpis.counts?.overdue || 0}</div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} lg={16}>
            <Card title={copy.monthlyTrend} style={{ borderRadius: 12 }}>
              {trendChartData.length ? (
	                <div className="min-w-0" style={{ height: 300 }}>
	                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                    <ComposedChart data={trendChartData} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
	                      <XAxis dataKey="period_label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
	                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={84}
                        tickFormatter={(value) => formatIDR(value, language).replace("Rp", "").replace("IDR", "").trim()}
                      />
                      <RechartsTooltip
                        formatter={(value, name) => [
                          formatIDR(value, language),
                          name === "total_due"
                            ? copy.billed
                            : name === "total_paid"
                              ? copy.received
                              : copy.outstanding,
                        ]}
                        labelFormatter={(label) => `${copy.period}: ${label}`}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid rgba(228,228,231,0.9)",
                          boxShadow: "0 18px 44px -34px rgba(15,23,42,0.28)",
                        }}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "total_due"
                            ? copy.billed
                            : value === "total_paid"
                              ? copy.received
                              : copy.outstanding
                        }
                      />
                      <Bar dataKey="total_due" fill="#fecaca" radius={[10, 10, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="total_paid" fill="#16a34a" radius={[10, 10, 0, 0]} maxBarSize={32} />
                      <Line
                        type="monotone"
                        dataKey="outstanding"
                        stroke="#b91c1c"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#b91c1c" }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-zinc-500">
                  {copy.noChartData}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={copy.collectionComposition} style={{ borderRadius: 12 }}>
              {statusChartData.length ? (
	                <div className="min-w-0" style={{ height: 300 }}>
	                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={102}
                        paddingAngle={3}
                      >
                        {statusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid rgba(228,228,231,0.9)",
                          boxShadow: "0 18px 44px -34px rgba(15,23,42,0.28)",
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-zinc-500">
                  {copy.noChartData}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} lg={14}>
            <Card title={copy.monthlyRecap} style={{ borderRadius: 12 }}>
	              <Table
	                className="finance-compact-table"
	                columns={buildAntdColumns(monthlyTable)}
	                dataSource={monthlyRecap}
	                rowKey="period"
	                size="small"
	                pagination={false}
	              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={copy.arrearsChart}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {analyticsRange.start_period} - {analyticsRange.end_period} ({analyticsWindowLabel})
                </Text>
              }
              style={{ borderRadius: 12 }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                {copy.asOfActivePeriod}
              </Text>
              {topArrearsChartData.length ? (
	                <div className="min-w-0" style={{ height: 320 }}>
	                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
                    <BarChart
                      data={topArrearsChartData}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                      <XAxis
                        type="number"
	                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatIDR(value, language).replace("Rp", "").replace("IDR", "").trim()}
                      />
                      <YAxis
                        type="category"
                        dataKey="short_name"
                        width={110}
	                        tick={{ fill: "#52525b", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        formatter={(value) => [formatIDR(value, language), copy.outstanding]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || "—"}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid rgba(228,228,231,0.9)",
                          boxShadow: "0 18px 44px -34px rgba(15,23,42,0.28)",
                        }}
                      />
                      <Bar dataKey="outstanding" radius={[0, 10, 10, 0]} fill="#b91c1c" maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[356px] items-center justify-center text-sm text-zinc-500">
                  {copy.noChartData}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={14}>
            <Card title={copy.memberRecap} style={{ borderRadius: 12 }}>
	              <Table
	                className="finance-compact-table"
	                columns={buildAntdColumns(memberTable)}
	                dataSource={memberRecap}
	                rowKey="member_id"
	                size="small"
	                pagination={{ pageSize: 8 }}
	              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={copy.topPayersChart}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {analyticsRange.start_period} - {analyticsRange.end_period} ({analyticsWindowLabel})
                </Text>
              }
              style={{ borderRadius: 12 }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                {copy.asOfActivePeriod}
              </Text>
              {topPayersChartData.length ? (
	                <div className="min-w-0" style={{ height: 320 }}>
	                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
                    <BarChart
                      data={topPayersChartData}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                      <XAxis
                        type="number"
	                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatIDR(value, language).replace("Rp", "").replace("IDR", "").trim()}
                      />
                      <YAxis
                        type="category"
                        dataKey="short_name"
                        width={110}
	                        tick={{ fill: "#52525b", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        formatter={(value) => [formatIDR(value, language), copy.totalReceived]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || "—"}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid rgba(228,228,231,0.9)",
                          boxShadow: "0 18px 44px -34px rgba(15,23,42,0.28)",
                        }}
                      />
                      <Bar dataKey="total_paid" radius={[0, 10, 10, 0]} fill="#166534" maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[356px] items-center justify-center text-sm text-zinc-500">
                  {copy.noChartData}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </PageShell>
    </AppLayout>
  );
}
