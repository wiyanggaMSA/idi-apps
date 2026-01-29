import React, { useMemo, useState } from "react";
import axios from "axios";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Select,
  Space,
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

  const fetchConflicts = async (page = 1) => {
    if (!batchId) return;
    const { data } = await axios.get(route("members.conflicts", batchId), {
      params: { page },
    });
    setConflicts(data.data || []);
    setConflictMeta(data.meta || {});
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
      await fetchConflicts(1);
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
      columnHelper.accessor("conflict_type", {
        header: "Conflict",
        meta: { label: "Conflict" },
        cell: (info) => {
          const conflicts = info.getValue() || [];
          if (!conflicts.length) return "-";
          return conflicts.join(", ");
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
                  { value: "update", label: "Update Existing" },
                  { value: "create", label: "Create Duplicate" },
                  { value: "discard", label: "Discard" },
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
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
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
            <Text type="secondary">
              Export akan mengikuti filter dan sorting yang aktif di query URL.
            </Text>
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
                <Space direction="vertical" size={4}>
                  <Text strong>Warnings</Text>
                  {summary.warnings.map((warning) => (
                    <Text key={`${warning.row_number}-${warning.reasons?.join(",")}`}>
                      Baris {warning.row_number}: {warning.reasons?.join(", ")}
                    </Text>
                  ))}
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
            pagination={{
              current: conflictMeta.current_page || 1,
              pageSize: conflictMeta.per_page || 10,
              total: conflictMeta.total || 0,
              onChange: (page) => fetchConflicts(page),
            }}
            locale={{
              emptyText: "Tidak ada konflik untuk batch ini.",
            }}
          />
        </Card>

        {conflicts.length > 0 && (
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleResolve}>
              Apply Selected Actions
            </Button>
          </Space>
        )}
      </PageShell>
    </AppLayout>
  );
}
