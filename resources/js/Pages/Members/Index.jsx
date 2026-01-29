import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
  EyeOutlined,
  SettingOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

const { Text, Link } = Typography;

export default function MembersIndex() {
  const { props } = usePage();
  const members = props.members?.data || [];
  const meta = props.members?.meta || {};
  const filters = props.filters || {};
  const divisions = props.divisions || [];
  const positions = props.positions || [];
  const statuses = props.statuses || [];
  const genders = props.genders || [];

  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailMember, setDetailMember] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [form] = Form.useForm();

  const canCreate = props?.auth?.permissions?.includes("members.create");
  const canUpdate = props?.auth?.permissions?.includes("members.update");
  const canDelete = props?.auth?.permissions?.includes("members.delete");
  const statusLabel = useMemo(
    () =>
      (statuses || []).reduce((acc, status) => {
        acc[status.value] = status.label;
        return acc;
      }, {}),
    [statuses]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchValue !== (filters.search || "")) {
        applyFilters({ search: searchValue, page: 1 });
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchValue]);

      useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

      const applyFilters = (nextFilters) => {
    router.get(
      route("members.index"),
      { ...filters, ...nextFilters },
      { preserveState: true, replace: true }
    );
  };

  const handleSort = (columnId) => {
    const sortBy = filters.sortBy || "full_name";
    const sortDir = filters.sortDir || "asc";
    const isSame = sortBy === columnId;
    const nextDir = isSame && sortDir === "asc" ? "desc" : "asc";
    applyFilters({ sortBy: columnId, sortDir: nextDir });
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    form.setFieldsValue({
      ...member,
      birth_date: member.birth_date ? dayjs(member.birth_date) : null,
      join_date: member.join_date ? dayjs(member.join_date) : null,
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingMember(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = (member) => {
    Modal.confirm({
      title: "Hapus Anggota",
      content: `Yakin ingin menghapus ${member.full_name}?`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: () => {
        router.delete(route("members.destroy", member.id), {
          preserveScroll: true,
          onSuccess: () => message.success("Anggota dihapus."),
        });
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        birth_date: values.birth_date
          ? values.birth_date.format("YYYY-MM-DD")
          : null,
        join_date: values.join_date ? values.join_date.format("YYYY-MM-DD") : null,
      };

      if (editingMember) {
        router.patch(route("members.update", editingMember.id), payload, {
          preserveScroll: true,
          onSuccess: () => {
            message.success("Anggota diperbarui.");
            setModalOpen(false);
          },
          });
      } else {
        router.post(route("members.store"), payload, {
          preserveScroll: true,
          onSuccess: () => {
            message.success("Anggota ditambahkan.");
            setModalOpen(false);
          },
        });
      }
    } catch {}
  };

        const openDetail = (member) => {
    setDetailMember(member);
    setDrawerOpen(true);
  };

  const columnHelper = createColumnHelper();
  const columns = useMemo(
    () => [
      columnHelper.accessor("npa", {
        header: "NPA",
        meta: { label: "NPA", sortable: true },
        cell: (info) => (
          <Space>
            <Link onClick={() => openDetail(info.row.original)}>
              {info.getValue()}
            </Link>
          </Space>
        ),
      }),
      columnHelper.accessor("full_name", {
        header: "Nama",
        meta: { label: "Nama", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("email", {
        header: "Email",
        meta: { label: "Email", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("phone", {
        header: "Telepon",
        meta: { label: "Telepon", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("division", {
        header: "Divisi",
        meta: { label: "Divisi", sortable: false },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("position", {
        header: "Jabatan",
        meta: { label: "Jabatan", sortable: false },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        meta: { label: "Status", sortable: true },
        cell: (info) => {
          const value = info.getValue();
          const color = value === "active" ? "green" : value === "inactive" ? "red" : "blue";
          return (
            <Tag color={color} style={{ fontWeight: 600 }}>
              {statusLabel[value] || value || "-"}
            </Tag>
          );
        },
      }),
      columnHelper.accessor("join_date", {
        header: "Tgl Bergabung",
        meta: { label: "Tanggal Bergabung", sortable: true },
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.display({
        id: "actions",
        header: "Aksi",
        meta: { label: "Aksi", sortable: false },
        cell: (info) => {
          const member = info.row.original;
          const items = [
            {
              key: "detail",
              icon: <EyeOutlined />,
              label: "Detail",
              onClick: () => openDetail(member),
            },
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "Edit",
              disabled: !canUpdate,
              onClick: () => handleEdit(member),
            },
            {
              key: "delete",
              icon: <DeleteOutlined />,
              danger: true,
              disabled: !canDelete,
              label: "Hapus",
              onClick: () => handleDelete(member),
            },
          ];

          return (
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          );
        },
      }),
    ],
    [canDelete, canUpdate, statusLabel]
  );

  const table = useReactTable({
    data: members,
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
    <AppLayout title="Data Anggota">
      <PageShell>
        <PageHeader
          title="Data Anggota"
          extra={
            <Space>
               <Dropdown dropdownRender={() => columnMenu} trigger={["click"]}>
                <Button icon={<SettingOutlined />}>Kolom</Button>
              </Dropdown>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                disabled={!canCreate}
              >
                Tambah Anggota
              </Button>
              
            </Space>
          }
        />

        {/* Filter bar (mirip gambar) */}
        <Card
          style={{ borderRadius: 12, marginBottom: 12 }}
          bodyStyle={{ padding: 12 }}
        >
          <Space wrap size={10} style={{ width: "100%" }}>
            <Input
              allowClear
               value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              prefix={<SearchOutlined />}
              placeholder="Cari NPA, nama, email, atau telepon..."
              style={{ width: 260 }}
            />

            <Select
             allowClear
              value={filters.status || undefined}
              onChange={(value) => applyFilters({ status: value, page: 1 })}
              placeholder="Status"
              style={{ width: 170 }}
              options={statuses}
            />

            <Select
              allowClear
              value={filters.gender || undefined}
              onChange={(value) => applyFilters({ gender: value, page: 1 })}
              placeholder="Gender"
              style={{ width: 160 }}
              options={genders}
            />

            <Select
              allowClear
              value={filters.division_id || undefined}
              onChange={(value) => applyFilters({ division_id: value, page: 1 })}
              placeholder="Divisi"
              style={{ width: 190 }}
              options={divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))}
            />

            <Select
              allowClear
              value={filters.position_id || undefined}
              onChange={(value) => applyFilters({ position_id: value, page: 1 })}
              placeholder="Jabatan"
              style={{ width: 190 }}
              options={positions.map((position) => ({
                value: position.id,
                label: position.name,
              }))}
            />
          </Space>
        </Card>

        {/* Table (mirip gambar: header abu, border halus, pagination bawah) */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            columns={antdColumns}
            dataSource={members}
            rowKey="id"
            size="middle"
            pagination={{
              current: meta.current_page || 1,
              pageSize: meta.per_page || 10,
              total: meta.total || 0,
              showSizeChanger: true,
              onChange: (page, perPage) =>
                applyFilters({ page, perPage: perPage || meta.per_page }),
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>
      </PageShell>
      <Modal
        title={editingMember ? "Edit Anggota" : "Tambah Anggota"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingMember ? "Simpan" : "Tambah"}
        width={720}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="NPA"
            name="npa"
            rules={[{ required: true, message: "NPA wajib diisi." }]}
          >
            <Input placeholder="NPA" />
          </Form.Item>
          <Form.Item
            label="Nama Lengkap"
            name="full_name"
            rules={[{ required: true, message: "Nama wajib diisi." }]}
          >
            <Input placeholder="Nama lengkap" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item label="No. HP" name="phone">
            <Input placeholder="Nomor HP" />
          </Form.Item>
          <Form.Item label="Pendidikan" name="education">
            <Input placeholder="Pendidikan" />
          </Form.Item>
          <Form.Item label="Jenis Kelamin" name="gender">
            <Select
              allowClear
              options={genders}
              placeholder="Pilih gender"
            />
          </Form.Item>
          <Form.Item label="Tempat Lahir" name="birth_place">
            <Input placeholder="Tempat lahir" />
          </Form.Item>
          <Form.Item label="Tanggal Lahir" name="birth_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Divisi" name="division_id">
            <Select
              allowClear
              options={divisions.map((division) => ({
                value: division.id,
                label: division.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="Jabatan" name="position_id">
            <Select
              allowClear
              options={positions.map((position) => ({
                value: position.id,
                label: position.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="Tanggal Bergabung" name="join_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select allowClear options={statuses} placeholder="Status anggota" />
          </Form.Item>
          <Form.Item label="Alamat" name="address">
            <Input.TextArea rows={2} placeholder="Alamat" />
          </Form.Item>
          <Form.Item label="Catatan" name="notes">
            <Input.TextArea rows={2} placeholder="Catatan" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Detail Anggota"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
      >
        {detailMember ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="NPA">
              {detailMember.npa}
            </Descriptions.Item>
            <Descriptions.Item label="Nama">
              {detailMember.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {detailMember.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Telepon">
              {detailMember.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Pendidikan">
              {detailMember.education || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Gender">
              {detailMember.gender || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tempat Lahir">
              {detailMember.birth_place || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal Lahir">
              {detailMember.birth_date || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Divisi">
              {detailMember.division || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Jabatan">
              {detailMember.position || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal Bergabung">
              {detailMember.join_date || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {detailMember.status || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Alamat">
              {detailMember.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Catatan">
              {detailMember.notes || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">Pilih anggota untuk melihat detail.</Text>
        )}
      </Drawer>
    </AppLayout>
  );
}
