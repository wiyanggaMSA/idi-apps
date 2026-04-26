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
import { useI18n } from "@/Contexts/I18nContext";

const { Text } = Typography;

export default function MembersImportExport() {
  const { language } = useI18n();
  const copy =
    language === "en"
      ? {
          pageTitle: "Member Import / Export",
          title: "Member Import / Export",
          row: "Row",
          name: "Name",
          phone: "Phone",
          division: "Division",
          position: "Position",
          status: "Status",
          conflict: "Conflict",
          match: "Match",
          actions: "Actions",
          selectAction: "Select action",
          update: "Update Existing",
          create: "Create Duplicate",
          discard: "Ignore",
          selectTarget: "Select target",
          resolved: "Resolved",
          chooseFileFirst: "Please choose a file first.",
          importDone: "Import finished successfully.",
          importFailed: "Failed to import file.",
          chooseConflictAction: "Please choose an action for conflicts first.",
          resolveSaved: "Conflict resolution saved.",
          resolveFailed: "Failed to save conflict resolution.",
          chooseFile: "Choose File",
          importData: "Import Data",
          exportDatabase: "Export member database.",
          exportXlsx: "Export (XLSX)",
          exportCsv: "Export (CSV)",
          importSummary: "Import Summary",
          totalRows: "Total rows",
          createdCount: "Created successfully",
          conflictCount: "Conflicts",
          errorCount: "Errors",
          warnings: "Warnings",
          rowWarning: "Row",
          close: "Close",
          seeMore: "See more",
          noConflicts: "No conflicts found for this batch.",
          conflictRange: "conflicts",
          applyResolution: "Apply Resolution",
          downloadTemplateXlsx: "Download Template (XLSX)",
          downloadTemplateCsv: "Download Template (CSV)",
          uploadFile: "Upload File",
          startImport: "Start Import",
        }
      : {
          pageTitle: "Import / Export Anggota",
          title: "Import / Export Anggota",
          row: "Baris",
          name: "Nama",
          phone: "Telepon",
          division: "Divisi",
          position: "Jabatan",
          status: "Status",
          conflict: "Conflict",
          match: "Match",
          actions: "Aksi",
          selectAction: "Pilih aksi",
          update: "Perbaharui",
          create: "Buat Duplikat",
          discard: "Abaikan",
          selectTarget: "Pilih target",
          resolved: "Resolved",
          chooseFileFirst: "Pilih file terlebih dahulu.",
          importDone: "Import selesai diproses.",
          importFailed: "Gagal mengimpor file.",
          chooseConflictAction: "Pilih aksi untuk konflik terlebih dahulu.",
          resolveSaved: "Resolusi konflik tersimpan.",
          resolveFailed: "Gagal menyimpan resolusi konflik.",
          chooseFile: "Pilih File",
          importData: "Import Data",
          exportDatabase: "Export database anggota.",
          exportXlsx: "Export (XLSX)",
          exportCsv: "Export (CSV)",
          importSummary: "Ringkasan Import",
          totalRows: "Total baris",
          createdCount: "Berhasil dibuat",
          conflictCount: "Konflik",
          errorCount: "Error",
          warnings: "Peringatan",
          rowWarning: "Baris",
          close: "Tutup",
          seeMore: "Lihat selengkapnya",
          noConflicts: "Tidak ada konflik untuk batch ini.",
          conflictRange: "konflik",
          applyResolution: "Terapkan Resolusi",
          downloadTemplateXlsx: "Download Template (XLSX)",
          downloadTemplateCsv: "Download Template (CSV)",
          uploadFile: "Upload File",
          startImport: "Mulai Import",
        };
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
      message.warning(copy.chooseFileFirst);
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
      message.success(copy.importDone);
    } catch (error) {
      message.error(copy.importFailed);
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
      message.warning(copy.chooseConflictAction);
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
      message.success(copy.resolveSaved);
    } catch (error) {
      message.error(copy.resolveFailed);
    }
  };

  const columnHelper = createColumnHelper();
  const columns = useMemo(
    () => [
      columnHelper.accessor("row_number", {
        header: copy.row,
        meta: { label: copy.row },
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("npa", {
        header: "NPA",
        meta: { label: "NPA" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("full_name", {
        header: copy.name,
        meta: { label: copy.name },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("email", {
        header: "Email",
        meta: { label: "Email" },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("phone", {
        header: copy.phone,
        meta: { label: copy.phone },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("division_name", {
        header: copy.division,
        meta: { label: copy.division },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("position_name", {
        header: copy.position,
        meta: { label: copy.position },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("status", {
        header: copy.status,
        meta: { label: copy.status },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("conflict_type", {
        header: copy.conflict,
        meta: { label: copy.conflict },
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
        header: copy.match,
        meta: { label: copy.match },
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
        header: copy.actions,
        meta: { label: copy.actions },
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
                placeholder={copy.selectAction}
                style={{ width: 180 }}
                disabled={isResolved}
                options={[
                  { value: "update", label: copy.update },
                  { value: "create", label: copy.create },
                  { value: "discard", label: copy.discard },
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
                  placeholder={copy.selectTarget}
                  style={{ width: 240 }}
                  disabled={isResolved}
                  options={matches.map((member) => ({
                    value: member.id,
                    label: `${member.full_name} (${member.npa || "-"})`,
                  }))}
                />
              )}
              {isResolved && <Text type="secondary">{copy.resolved}</Text>}
            </Space>
          );
        },
      }),
    ],
    [conflictActions, copy]
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
    <AppLayout title={copy.pageTitle}>
      <PageShell>
        <PageHeader title={copy.title} />

        <Card style={{ borderRadius: 12, marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space wrap>
              <Button
                icon={<FileExcelOutlined />}
                href={templateUrl("xlsx")}
                target="_blank"
              >
                {copy.downloadTemplateXlsx}
              </Button>
              <Button
                icon={<FileTextOutlined />}
                href={templateUrl("csv")}
                target="_blank"
              >
                {copy.downloadTemplateCsv}
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
                <Button icon={<UploadOutlined />}>{copy.chooseFile}</Button>
              </Upload>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleImport}>
                {copy.importData}
              </Button>
            </Space>
          </Space>
        </Card>

        <Card style={{ borderRadius: 12, marginBottom: 16 }}>
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Text type="primary" strong>
              {copy.exportDatabase}
            </Text>
            <Space wrap>
              <Button
                icon={<CloudDownloadOutlined />}
                href={exportUrl("xlsx")}
              >
                {copy.exportXlsx}
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                href={exportUrl("csv")}
              >
                {copy.exportCsv}
              </Button>
            </Space>
          </Space>
        </Card>

        {summary && (
          <Card style={{ borderRadius: 12, marginBottom: 16 }}>
            <Space direction="vertical" size={6}>
              <Text strong>{copy.importSummary}</Text>
              <Text>{copy.totalRows}: {summary.total_rows}</Text>
              <Text>{copy.createdCount}: {summary.created_count}</Text>
              <Text>{copy.conflictCount}: {summary.conflict_count}</Text>
              <Text>{copy.errorCount}: {summary.error_count}</Text>
              {summary.warnings?.length > 0 && (
                <Space orientation="vertical" size={4}>
                  <Text strong>{copy.warnings}</Text>
                  <Text>
                    {(showAllWarnings ? summary.warnings : summary.warnings.slice(0, 5))
                      .map(
                        (warning) =>
                          `${copy.rowWarning} ${warning.row_number}: ${warning.reasons?.join(", ")}`
                      )
                      .join(", ")}
                  </Text>
                  {summary.warnings.length > 5 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setShowAllWarnings((prev) => !prev)}
                    >
                      {showAllWarnings ? copy.close : copy.seeMore}
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
                `${range[0]}-${range[1]} / ${total} ${copy.conflictRange}`,
              onChange: (page, pageSize) => {
                setConflictPage(page);
                setConflictPageSize(pageSize);
                fetchConflicts(page, batchId, pageSize);
              },
            }}
            locale={{
              emptyText: copy.noConflicts,
            }}
          />
        </Card>

        {conflicts.length > 0 && (
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleResolve}>
              {copy.applyResolution}
            </Button>
          </Space>
        )}
      </PageShell>
    </AppLayout>
  );
}
