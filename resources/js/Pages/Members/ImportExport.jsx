import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Select,
  Space,
  Tag,
  Table,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CloudDownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

const { Text } = Typography;

export default function MembersImportExport() {
  const [fileList, setFileList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [conflictMeta, setConflictMeta] = useState({});
  const [conflictActions, setConflictActions] = useState({});
  const [conflictPage, setConflictPage] = useState(1);
  const [conflictPageSize, setConflictPageSize] = useState(200);
  const [showAllWarnings, setShowAllWarnings] = useState(false);

  const filterParams = useMemo(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    return params;
  }, []);

  const exportUrl = (format) =>
    route("members.export", {
      ...filterParams,
      format,
    });

  const templateUrl = (format) => route("members.template", { format });

  const fetchConflicts = async (
    page = conflictPage,
    batch = batchId,
    perPage = conflictPageSize
  ) => {
    if (!batch) return;
    const { data } = await axios.get(route("members.conflicts", batch), {
      params: { page, per_page: perPage },
    });

    const meta = data.meta || {
      current_page: data.current_page,
      per_page: data.per_page,
      total: data.total,
      last_page: data.last_page,
    };

    setConflicts(data.data || []);
    setConflictMeta(meta || {});
    setConflictPage(meta?.current_page || page);
    setConflictPageSize(meta?.per_page || perPage);
  };

  const handleImport = async () => {
    if (!fileList.length) {
      message.warning("Pilih file terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileList[0]);

    try {
      const { data } = await axios.post(route("members.import"), formData);
      setSummary(data);
      setBatchId(data.batch_id);
      setConflictActions({});
      await fetchConflicts(1, data.batch_id, conflictPageSize);
      message.success("Import selesai diproses.");
    } catch (error) {
      message.error("Gagal mengimpor file.");
    }
  };

  const handleResolve = async () => {
    const actions = Object.entries(conflictActions)
      .map(([rowId, value]) => ({
        row_id: Number(rowId),
        action: value.action,
        target_member_id: value.target_member_id || null,
      }))
      .filter((action) => action.action);

    if (!actions.length) {
      message.warning("Pilih aksi untuk konflik terlebih dahulu.");
      return;
    }

    try {
      const { data } = await axios.post(route("members.resolve", batchId), {
        actions,
      });
      await fetchConflicts(conflictMeta.current_page || 1);
      setSummary((prev) => ({
        ...(prev || {}),
        created_count: data.created_count,
        conflict_count: data.remaining_conflicts,
      }));
      message.success("Resolusi konflik tersimpan.");
    } catch (error) {
      message.error("Gagal menyimpan resolusi konflik.");
    }
  };

  const columnHelper = createColumnHelper();
  const columns = useMemo(
    () => [
      columnHelper.accessor("row_number", {
        header: "Baris",
        meta: { label: "Baris" },
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("npa", {
        header: "NPA",
        meta: { label: "NPA" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("full_name", {
        header: "Nama",
        meta: { label: "Nama" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("email", {
        header: "Email",
        meta: { label: "Email" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("phone", {
        header: "Telepon",
        meta: { label: "Telepon" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("division_name", {
        header: "Divisi",
        meta: { label: "Divisi" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("position_name", {
        header: "Jabatan",
        meta: { label: "Jabatan" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        meta: { label: "Status" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("conflict_type", {
        header: "Conflict",
        meta: { label: "Conflict" },
        cell: (info) => {
          const conflicts = info.getValue();
          if (!conflicts || conflicts.length === 0) return "-";
          const items = Array.isArray(conflicts)
            ? conflicts
            : String(conflicts).split(",").map((item) => item.trim());
          return (
            <Space wrap size={[4, 4]}>
              {items.map((conflict) => (
                <Tag key={conflict} color="red">
                  {conflict}
                </Tag>
              ))}
            </Space>
          );
        },
      }),
      columnHelper.accessor("conflict_members", {
        header: "Match",
        meta: { label: "Match" },
        cell: (info) => {
          const members = info.getValue() || [];
          if (!members.length) return "-";
          return (
            <Space direction="vertical" size={0}>
              {members.map((member) => (
                <Text key={member.id}>
                  {member.full_name} ({member.npa || "-"} / {member.email || "-"})
                </Text>
              ))}
            </Space>
          );
        },
      }),
      columnHelper.display({
        id: "action",
        header: "Aksi",
        meta: { label: "Aksi" },
        cell: (info) => {
          const row = info.row.original;
          const actionValue = conflictActions[row.id]?.action;
          const targetValue = conflictActions[row.id]?.target_member_id;
          const matches = row.conflict_members || [];
          const isResolved = Boolean(row.resolved_at);

          return (
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Select
                value={actionValue}
                onChange={(value) =>
                  setConflictActions((prev) => ({
                    ...prev,
                    [row.id]: {
                      ...prev[row.id],
                      action: value,
                    },
                  }))
                }
                placeholder="Pilih aksi"
                style={{ width: 180 }}
                disabled={isResolved}
                options={[
                  { value: "update", label: "Perbaharui" },
                  { value: "create", label: "Buat Duplikat" },
                  { value: "discard", label: "Abaikan" },
                ]}
              />
              {actionValue === "update" && (
                <Select
                  value={targetValue}
                  onChange={(value) =>
                    setConflictActions((prev) => ({
                      ...prev,
                      [row.id]: {
                        ...prev[row.id],
                        target_member_id: value,
                      },
                    }))
                  }
                  placeholder="Pilih target"
                  style={{ width: 240 }}
                  disabled={isResolved}
                  options={matches.map((member) => ({
                    value: member.id,
                    label: `${member.full_name} (${member.npa || "-"})`,
                  }))}
                />
              )}
              {isResolved && <Text type="secondary">Resolved</Text>}
            </Space>
          );
        },
      }),
    ],
    [conflictActions]
  );

  useEffect(() => {
    if (!batchId) return;
    fetchConflicts(1, batchId);
  }, [batchId]);

  const table = useReactTable({
    data: conflicts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const antdColumns = table.getVisibleLeafColumns().map((column) => ({
    title: column.columnDef.meta?.label || column.columnDef.header,
    key: column.id,
    dataIndex: column.id,
    render: (_, row) =>
      flexRender(column.columnDef.cell, {
        getValue: () => row[column.id],
        row: { original: row },
        column,
        table,
      }),
  }));

  return (
    <AppLayout title="Import / Export Anggota">
      <PageShell>
        <PageHeader title="Import / Export Anggota" />

        <Card style={{ borderRadius: 12, marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space wrap>
              <Button
                icon={<FileExcelOutlined />}
                href={templateUrl("xlsx")}
                target="_blank"
              >
                Download Template (XLSX)
              </Button>
              <Button
                icon={<FileTextOutlined />}
                href={templateUrl("csv")}
                target="_blank"
              >
                Download Template (CSV)
              </Button>
            </Space>

            <Space wrap>
              <Upload
                beforeUpload={(file) => {
                  setFileList([file]);
                  return false;
                }}
                fileList={fileList}
                onRemove={() => setFileList([])}
                maxCount={1}
                accept=".xlsx,.csv"
              >
                <Button icon={<UploadOutlined />}>Pilih File</Button>
              </Upload>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleImport}>
                Import Data
              </Button>
            </Space>
          </Space>
        </Card>

        <Card style={{ borderRadius: 12, marginBottom: 16 }}>
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Text type="primary" strong>
              Export Database Anggota.
            </Text>
            <Space wrap>
              
              <Button
                icon={<CloudDownloadOutlined />}
                href={exportUrl("xlsx")}
              >
                Export (XLSX)
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                href={exportUrl("csv")}
              >
                Export (CSV)
              </Button>
            </Space>
          </Space>
        </Card>

        {summary && (
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            <Space direction="vertical" size={6}>
              <Text strong>Ringkasan Import</Text>
              <Text>Total baris: {summary.total_rows}</Text>
              <Text>Berhasil dibuat: {summary.created_count}</Text>
              <Text>Konflik: {summary.conflict_count}</Text>
              <Text>Error: {summary.error_count}</Text>
              {summary.warnings?.length > 0 && (
                <Space orientation="vertical" size={4}>
                  <Text strong>Warnings</Text>
                  <Text>
                    {(showAllWarnings ? summary.warnings : summary.warnings.slice(0, 5))
                      .map(
                        (warning) =>
                          `Baris ${warning.row_number}: ${warning.reasons?.join(", ")}`
                      )
                      .join(", ")}
                  </Text>
                  {summary.warnings.length > 5 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setShowAllWarnings((prev) => !prev)}
                    >
                      {showAllWarnings ? "Tutup" : "Lihat selengkapnya"}
                    </Button>
                  )}
                </Space>
              )}
            </Space>
          </Card>
        )}

        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={antdColumns}
            dataSource={conflicts}
            rowKey="id"
            scroll={{ x: "max-content" }}
            pagination={{
              current: conflictMeta.current_page || conflictPage,
              pageSize: conflictMeta.per_page || conflictPageSize,
              total: conflictMeta.total || 0,
              showSizeChanger: true,
              pageSizeOptions: [25, 50, 100, 200],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} konflik`,
              onChange: (page, pageSize) => {
                setConflictPage(page);
                setConflictPageSize(pageSize);
                fetchConflicts(page, batchId, pageSize);
              },
            }}
            locale={{
              emptyText: "Tidak ada konflik untuk batch ini.",
            }}
          />
        </Card>

        {conflicts.length > 0 && (
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleResolve}>
              Terapkan Resolusi 
            </Button>
          </Space>
        )}
      </PageShell>
    </AppLayout>
  );
}
