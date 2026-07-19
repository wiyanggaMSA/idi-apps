import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
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
  UserOutlined,
} from "@ant-design/icons";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useI18n } from "@/Contexts/I18nContext";

const { Text, Link } = Typography;
const ELLIPSIS_WIDTHS = {
  npa: 72,
  name: 200,
  email: 200,
  phone: 170,
  education: 100,
  division: 88,
  position: 88,
  sip: 88,
};

export default function MembersIndex() {
  const { language } = useI18n();
  const isEn = language === "en";
  const { props } = usePage();
  const members = props.members?.data || [];
  const meta = props.members?.meta || props.members || {};
  const filters = props.filters || {};
  const divisions = props.divisions || [];
  const positions = props.positions || [];
  const users = props.users || [];
  const statuses = props.statuses || [];
  const genders = props.genders || [];
  const authRoles = props.auth?.roles || [];
  const canManageLinkedLoginAccount =
    authRoles.includes("admin") || authRoles.includes("superadmin");

  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailMember, setDetailMember] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [form] = Form.useForm();
  const copy = {
    pageTitle: isEn ? "Member Data" : "Data Anggota",
    search: isEn ? "Search" : "Pencarian",
    searchPlaceholder: isEn ? "Search NPA, name, email, or phone..." : "Cari NPA, nama, email, atau telepon...",
    membershipStatus: isEn ? "Membership Status" : "Status Keanggotaan",
    selectStatus: isEn ? "Select status" : "Pilih status",
    gender: "Gender",
    selectGender: isEn ? "Select gender" : "Pilih gender",
    division: isEn ? "Division" : "Divisi",
    selectDivision: isEn ? "Select division" : "Pilih divisi",
    position: isEn ? "Position" : "Jabatan",
    selectPosition: isEn ? "Select position" : "Pilih jabatan",
    reset: "Reset",
    columns: isEn ? "Columns" : "Kolom",
    addMember: isEn ? "Add Member" : "Tambah Anggota",
    editMember: isEn ? "Edit Member" : "Edit Anggota",
    memberDetail: isEn ? "Member Detail" : "Detail Anggota",
    deleteMember: isEn ? "Delete Member" : "Hapus Anggota",
    deleteConfirm: isEn ? "Are you sure you want to delete" : "Yakin ingin menghapus",
    deleteOk: isEn ? "Delete" : "Hapus",
    cancel: isEn ? "Cancel" : "Batal",
    deleted: isEn ? "Member deleted." : "Anggota dihapus.",
    updated: isEn ? "Member updated." : "Anggota diperbarui.",
    added: isEn ? "Member added." : "Anggota ditambahkan.",
    actions: isEn ? "Actions" : "Aksi",
    detail: isEn ? "Detail" : "Detail",
    edit: isEn ? "Edit" : "Edit",
    save: isEn ? "Save" : "Simpan",
    add: isEn ? "Add" : "Tambah",
    npaRequired: isEn ? "NPA is required." : "NPA wajib diisi.",
    nameRequired: isEn ? "Name is required." : "Nama wajib diisi.",
    fullName: isEn ? "Full Name" : "Nama Lengkap",
    phone: isEn ? "Phone" : "Telepon",
    education: isEn ? "Education" : "Pendidikan",
    birthPlace: isEn ? "Birth Place" : "Tempat Lahir",
    birthDate: isEn ? "Birth Date" : "Tanggal Lahir",
    joinDate: isEn ? "Join Date" : "Tanggal Bergabung",
    address: isEn ? "Address" : "Alamat",
    notes: isEn ? "Notes" : "Catatan",
    memberStatus: isEn ? "Member status" : "Status anggota",
    name: isEn ? "Name" : "Nama",
    noDetail: isEn ? "Select a member to view details." : "Pilih anggota untuk melihat detail.",
    basicInfo: isEn ? "Basic Information" : "Informasi Dasar",
    basicInfoHint: isEn ? "Primary identity and contact details." : "Identitas utama dan kontak anggota.",
    personalInfo: isEn ? "Personal Information" : "Informasi Personal",
    personalInfoHint: isEn ? "Personal profile and demographic data." : "Profil personal dan data demografis.",
    organizationalInfo: isEn ? "Organizational Information" : "Informasi Organisasi",
    organizationalInfoHint: isEn ? "Division, role, status, and membership administration." : "Divisi, jabatan, status, dan administrasi keanggotaan.",
    optionalDetails: isEn ? "Additional Details" : "Informasi Tambahan",
    optionalDetailsHint: isEn ? "Supporting notes and licensing information." : "Catatan pendukung dan informasi lisensi.",
    memberOverview: isEn ? "Member Overview" : "Ringkasan Anggota",
    contactInfo: isEn ? "Contact Information" : "Informasi Kontak",
    demographicInfo: isEn ? "Demographic Information" : "Informasi Demografis",
    workInfo: isEn ? "Work & Membership" : "Keanggotaan & Organisasi",
    licenseInfo: isEn ? "License Information" : "Informasi SIP",
    linkedAccount: isEn ? "Linked Login Account" : "Akun Login Tertaut",
    selectLinkedAccount: isEn ? "Select login account" : "Pilih akun login",
    linkedAccountHint: isEn
      ? "This account will receive signature requests for this member."
      : "Akun ini akan menerima daftar surat yang perlu ditandatangani anggota ini.",
  };

  const canCreate = props?.auth?.permissions?.includes("members.create");
  const canUpdate = props?.auth?.permissions?.includes("members.update");
  const canDelete = props?.auth?.permissions?.includes("members.delete");
  const translateStatus = (value) => {
    const map = {
      aktif: isEn ? "Active" : "Aktif",
      nonaktif: isEn ? "Inactive" : "Nonaktif",
      meninggal: isEn ? "Deceased" : "Meninggal",
      active: isEn ? "Active" : "Aktif",
      inactive: isEn ? "Inactive" : "Nonaktif",
      deceased: isEn ? "Deceased" : "Meninggal",
    };
    return map[String(value || "").toLowerCase()] || value;
  };
  const translateGender = (value) => {
    const map = {
      laki_laki: isEn ? "Male" : "Laki-laki",
      perempuan: isEn ? "Female" : "Perempuan",
      male: isEn ? "Male" : "Laki-laki",
      female: isEn ? "Female" : "Perempuan",
      m: isEn ? "Male" : "Laki-laki",
      f: isEn ? "Female" : "Perempuan",
      l: isEn ? "Male" : "Laki-laki",
      p: isEn ? "Female" : "Perempuan",
    };
    return map[String(value || "").toLowerCase()] || value;
  };
  const translatedStatuses = useMemo(
    () =>
      (statuses || []).map((status) => ({
        ...status,
        label: translateStatus(status.label || status.value),
      })),
    [statuses, language]
  );
  const translatedGenders = useMemo(
    () =>
      (genders || []).map((gender) => ({
        ...gender,
        label: translateGender(gender.label || gender.value),
      })),
    [genders, language]
  );
  const statusLabel = useMemo(
    () =>
      (statuses || []).reduce((acc, status) => {
        acc[status.value] = translateStatus(status.label || status.value);
        return acc;
      }, {}),
    [statuses, language]
  );

  const genderLabel = useMemo(
    () =>
      (genders || []).reduce((acc, gender) => {
        acc[gender.value] = translateGender(gender.label || gender.value);
        return acc;
      }, {}),
    [genders, language]
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

  const handleResetFilters = () => {
    setSearchValue("");
    applyFilters({
      search: "",
      status: null,
      gender: null,
      division_id: null,
      position_id: null,
      page: 1,
    });
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
    form.setFieldsValue({ status: translatedStatuses[0]?.value });
    setModalOpen(true);
  };

  const handleDelete = (member) => {
    Modal.confirm({
      title: copy.deleteMember,
      content: `${copy.deleteConfirm} ${member.full_name}?`,
      okText: copy.deleteOk,
      okType: "danger",
      cancelText: copy.cancel,
      onOk: () => {
        router.delete(route("members.destroy", member.id), {
          preserveScroll: true,
          onSuccess: () => message.success(copy.deleted),
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

      if (canManageLinkedLoginAccount) {
        payload.user_id = values.user_id || null;
      } else {
        delete payload.user_id;
      }

      if (editingMember) {
        router.patch(route("members.update", editingMember.id), payload, {
          preserveScroll: true,
          onSuccess: () => {
            message.success(copy.updated);
            setModalOpen(false);
          },
          });
      } else {
        router.post(route("members.store"), payload, {
          preserveScroll: true,
          onSuccess: () => {
            message.success(copy.added);
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

  const statusTone = (value) => {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "aktif" || normalized === "active") return "green";
    if (normalized === "meninggal" || normalized === "deceased") return "red";
    return "gold";
  };

  const formatDateValue = (value) => {
    if (!value) return "-";
    const parsed = dayjs(value);
    if (!parsed.isValid()) return value;
    return parsed.format("DD-MM-YYYY");
  };

  const detailRows = (items) => (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-3 rounded-lg border border-zinc-200/70 bg-zinc-50/60 px-3 py-2"
        >
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {item.label}
          </p>
          <p className="m-0 text-[12px] font-medium text-zinc-800 break-words">{item.value || "-"}</p>
        </div>
      ))}
    </div>
  );

  const renderTruncated = (value, width, options = {}) => {
    const text = value || "-";
    const className = options.className || "";

    return (
      <Tooltip title={text === "-" ? null : text}>
        <div
          className={`truncate ${className}`}
          style={{ maxWidth: width, minWidth: 0 }}
        >
          {text}
        </div>
      </Tooltip>
    );
  };

  const columnHelper = createColumnHelper();
  const columns = useMemo(
    () => [
      columnHelper.accessor("npa", {
        header: "NPA",
        meta: { label: "NPA", sortable: true, width: 100 },
        cell: (info) => (
          <Space>
            <Link onClick={() => openDetail(info.row.original)}>
              {renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.npa)}
            </Link>
          </Space>
        ),
      }),
      columnHelper.accessor("full_name", {
        header: copy.name,
        meta: { label: copy.name, sortable: true, width: 200 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.name),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        meta: { label: "Email", sortable: true, width: 150 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.email),
      }),
      columnHelper.accessor("phone", {
        header: copy.phone,
        meta: { label: copy.phone, sortable: true, width: 170 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.phone),
      }),
      columnHelper.accessor("education", {
        header: copy.education,
        meta: { label: copy.education, sortable: true, width: 110 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.education),
      }),
      columnHelper.accessor("division", {
        header: copy.division,
        meta: { label: copy.division, sortable: true, width: 92 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.division),
      }),
      columnHelper.accessor("position", {
        header: copy.position,
        meta: { label: copy.position, sortable: true, width: 92 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.position),
      }),
      columnHelper.accessor("status", {
        header: copy.membershipStatus,
        meta: { label: copy.membershipStatus, sortable: true, width: 136 },
        cell: (info) => {
          const value = info.getValue();
          const member = info.row.original;
          const color =
            value === "aktif"
              ? "green"
              : value === "meninggal"
                ? "red"
                : "orange";
          return (
            <Tag color={color} style={{ fontWeight: 600 }}>
              {member.status_name || statusLabel[value] || value || "-"}
            </Tag>
          );
        },
      }),
      columnHelper.accessor("sip_1", {
        header: "SIP 1",
        meta: { label: "SIP 1", sortable: false, width: 92 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.sip),
      }),
      columnHelper.accessor("sip_2", {
        header: "SIP 2",
        meta: { label: "SIP 2", sortable: false, width: 92 },
        cell: (info) => renderTruncated(info.getValue(), ELLIPSIS_WIDTHS.sip),
      }),
      columnHelper.display({
        id: "actions",
        header: copy.actions,
        meta: { label: copy.actions, sortable: false, width: 88 },
        cell: (info) => {
          const member = info.row.original;
          const items = [
            {
              key: "detail",
              icon: <EyeOutlined />,
              label: copy.detail,
              onClick: () => openDetail(member),
            },
            {
              key: "edit",
              icon: <EditOutlined />,
              label: copy.edit,
              disabled: !canUpdate,
              onClick: () => handleEdit(member),
            },
            {
              key: "delete",
              icon: <DeleteOutlined />,
              danger: true,
              disabled: !canDelete,
              label: copy.deleteOk,
              onClick: () => handleDelete(member),
              permissions: "members.delete",
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
    [canDelete, canUpdate, statusLabel, copy]
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
      width: column.columnDef.meta?.width,
      ellipsis: false,
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
	    <Card style={{ minWidth: 200 }} bodyStyle={{ padding: 10 }}>
	      <Space orientation="vertical" size={4} style={{ width: "100%" }}>
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
    <AppLayout title={copy.pageTitle}>
      <PageShell>
        <PageHeader
          title={copy.pageTitle}
          extra={
            <Space>
               <Dropdown popupRender={() => columnMenu} trigger={["click"]}>
                <Button icon={<SettingOutlined />}>{copy.columns}</Button>
              </Dropdown>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                disabled={!canCreate}
              >
                {copy.addMember}
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
            <Space orientation="vertical" size={4}>
	              <Text type="secondary" style={{ fontSize: 12 }}>{copy.search}</Text>
              <Input
                allowClear
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                prefix={<SearchOutlined />}
                placeholder={copy.searchPlaceholder}
	                style={{ width: 240 }}
              />
            </Space>

            <Space orientation="vertical" size={4}>
	              <Text type="secondary" style={{ fontSize: 12 }}>{copy.membershipStatus}</Text>
              <Select
                allowClear
                value={filters.status || undefined}
                onChange={(value) => applyFilters({ status: value, page: 1 })}
                placeholder={copy.selectStatus}
	                style={{ width: 170 }}
                options={translatedStatuses}
              />
            </Space>

            <Space orientation="vertical" size={4}>
	              <Text type="secondary" style={{ fontSize: 12 }}>{copy.gender}</Text>
              <Select
                allowClear
                value={filters.gender || undefined}
                onChange={(value) => applyFilters({ gender: value, page: 1 })}
                placeholder={copy.selectGender}
	                style={{ width: 150 }}
                options={translatedGenders}
              />
            </Space>

            <Space orientation="vertical" size={4}>
	              <Text type="secondary" style={{ fontSize: 12 }}>{copy.division}</Text>
              <Select
                allowClear
                value={filters.division_id || undefined}
                onChange={(value) => applyFilters({ division_id: value, page: 1 })}
                placeholder={copy.selectDivision}
	                style={{ width: 170 }}
                options={divisions.map((division) => ({
                  value: String(division.id),
                  label: division.name,
                }))}
              />
            </Space>

            <Space orientation="vertical" size={4}>
	              <Text type="secondary" style={{ fontSize: 12 }}>{copy.position}</Text>
              <Select
                allowClear
                value={filters.position_id || undefined}
                onChange={(value) => applyFilters({ position_id: value, page: 1 })}
                placeholder={copy.selectPosition}
	                style={{ width: 170 }}
                options={positions.map((position) => ({
                  value: String(position.id),
                  label: position.name,
                }))}
              />
            </Space>

            <Space orientation="vertical" size={4}>
              <Text type="secondary"></Text>
              <Button onClick={handleResetFilters}>{copy.reset}</Button>
            </Space>
          </Space>
        </Card>

        {/* Table (mirip gambar: header abu, border halus, pagination bawah) */}
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <Table
            className="members-table"
            columns={antdColumns}
            dataSource={members}
            rowKey="id"
	            size="small"
            tableLayout="fixed"
            scroll={{ x: "max-content" }}
            pagination={{
              current:
                meta.current_page || props.members?.current_page || filters.page || 1,
              pageSize: meta.per_page || props.members?.per_page || 20,
              total: meta.total || props.members?.total || 0,
              showSizeChanger: false,
              onChange: (page) => applyFilters({ page }),
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          />
        </Card>
      </PageShell>
      <Modal
        title={
          <div className="pr-6">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700/80">
              {editingMember ? copy.editMember : copy.addMember}
            </p>
            <h3 className="m-0 text-base font-semibold text-zinc-950">
              {editingMember?.full_name || copy.addMember}
            </h3>
          </div>
        }
        className="member-form-modal"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editingMember ? copy.save : copy.add}
        cancelText={copy.cancel}
        width={860}
        centered
        destroyOnHidden
        styles={{
	          header: {
	            padding: "18px 22px 0",
            marginBottom: 0,
          },
	          body: {
	            padding: "14px 22px 8px",
            maxHeight: "72vh",
            overflowY: "auto",
          },
	          footer: {
	            padding: "14px 22px 18px",
            marginTop: 0,
            borderTop: "1px solid rgba(228, 228, 231, 0.85)",
          },
        }}
      >
        <Form layout="vertical" form={form} className="member-form-grid">
	          <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/75 p-3">
	            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {copy.basicInfo}
              </p>
	              <p className="m-0 text-xs text-zinc-500">{copy.basicInfoHint}</p>
            </div>

            <div className="grid gap-x-4 md:grid-cols-2">
              <Form.Item
                label="NPA"
                name="npa"
                rules={[{ required: true, message: copy.npaRequired }]}
              >
                <Input placeholder="NPA" />
              </Form.Item>
              <Form.Item label="Email" name="email">
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item
                className="md:col-span-2"
                label={copy.fullName}
                name="full_name"
                rules={[{ required: true, message: copy.nameRequired }]}
              >
                <Input placeholder={copy.fullName} />
              </Form.Item>
              <Form.Item label={copy.phone} name="phone">
                <Input placeholder={copy.phone} />
              </Form.Item>
              <Form.Item label={copy.education} name="education">
                <Input placeholder={copy.education} />
              </Form.Item>
            </div>
          </section>

	          <section className="mt-3 rounded-2xl border border-zinc-200/80 bg-white p-3">
	            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {copy.personalInfo}
              </p>
	              <p className="m-0 text-xs text-zinc-500">{copy.personalInfoHint}</p>
            </div>

            <div className="grid gap-x-4 md:grid-cols-2">
              <Form.Item label={copy.gender} name="gender">
                <Select
                  allowClear
                  options={translatedGenders}
                  placeholder={copy.selectGender}
                />
              </Form.Item>
              <Form.Item label={copy.birthPlace} name="birth_place">
                <Input placeholder={copy.birthPlace} />
              </Form.Item>
              <Form.Item label={copy.birthDate} name="birth_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label={copy.joinDate} name="join_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </div>
          </section>

	          <section className="mt-3 rounded-2xl border border-zinc-200/80 bg-white p-3">
	            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {copy.organizationalInfo}
              </p>
	              <p className="m-0 text-xs text-zinc-500">{copy.organizationalInfoHint}</p>
            </div>

            <div className="grid gap-x-4 md:grid-cols-2">
              <Form.Item label={copy.division} name="division_id">
                <Select
                  allowClear
                  options={divisions.map((division) => ({
                    value: division.id,
                    label: division.name,
                  }))}
                  placeholder={copy.selectDivision}
                />
              </Form.Item>
              <Form.Item label={copy.position} name="position_id">
                <Select
                  allowClear
                  options={positions.map((position) => ({
                    value: position.id,
                    label: position.name,
                  }))}
                  placeholder={copy.selectPosition}
                />
              </Form.Item>
              <Form.Item label={copy.membershipStatus} name="status">
                <Select
                  allowClear
                  options={translatedStatuses}
                  placeholder={copy.memberStatus}
                />
              </Form.Item>
              {canManageLinkedLoginAccount ? (
                <Form.Item
                  label={copy.linkedAccount}
                  name="user_id"
                  tooltip={copy.linkedAccountHint}
                >
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={copy.selectLinkedAccount}
                    options={users.map((user) => ({
                      value: user.id,
                      label: `${user.name}${user.email ? ` · ${user.email}` : ""}`,
                    }))}
                  />
                </Form.Item>
              ) : null}
              <Form.Item label="SIP-1" name="sip_1">
                <Input placeholder="SIP-1" />
              </Form.Item>
              <Form.Item label="SIP-2" name="sip_2">
                <Input placeholder="SIP-2" />
              </Form.Item>
              <Form.Item label="SIP-3" name="sip_3">
                <Input placeholder="SIP-3" />
              </Form.Item>
            </div>
          </section>

	          <section className="mt-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/75 p-3">
	            <div className="mb-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {copy.optionalDetails}
              </p>
	              <p className="m-0 text-xs text-zinc-500">{copy.optionalDetailsHint}</p>
            </div>

            <div className="grid gap-x-4 md:grid-cols-2">
              <Form.Item className="md:col-span-2" label={copy.address} name="address">
                <Input.TextArea rows={3} placeholder={copy.address} />
              </Form.Item>
              <Form.Item className="md:col-span-2 !mb-0" label={copy.notes} name="notes">
                <Input.TextArea rows={3} placeholder={copy.notes} />
              </Form.Item>
            </div>
          </section>
        </Form>
      </Modal>

      <Drawer
        title={
          <div className="pr-6">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-700/80">
              {copy.memberOverview}
            </p>
	            <h3 className="m-0 text-base font-semibold text-zinc-950">{copy.memberDetail}</h3>
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="large"
        styles={{
          header: {
	            padding: "18px 22px 8px",
            marginBottom: 0,
          },
          body: {
	            padding: "14px 22px 20px",
          },
        }}
      >
        {detailMember ? (
	          <div className="space-y-3">
	            <Card style={{ borderRadius: 14 }} bodyStyle={{ padding: 14 }}>
              <div className="flex items-start gap-3">
                <Avatar
	                  size={40}
                  icon={<UserOutlined />}
                  style={{ background: "linear-gradient(145deg, #b91c1c, #991b1b)" }}
                />
                <div className="min-w-0">
	                  <p className="m-0 truncate text-base font-semibold text-zinc-900">{detailMember.full_name}</p>
	                  <p className="m-0 mt-1 text-xs text-zinc-600">NPA {detailMember.npa || "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Tag color={statusTone(detailMember.status)} style={{ fontWeight: 600 }}>
                      {detailMember.status_name || statusLabel[detailMember.status] || detailMember.status || "-"}
                    </Tag>
                    <Tag>{detailMember.division || "-"}</Tag>
                    <Tag>{detailMember.position || "-"}</Tag>
                  </div>
                </div>
              </div>
            </Card>

            <Card title={copy.contactInfo} style={{ borderRadius: 16 }}>
              {detailRows([
                { label: "Email", value: detailMember.email },
                { label: copy.phone, value: detailMember.phone },
                ...(canManageLinkedLoginAccount
                  ? [
                      {
                        label: copy.linkedAccount,
                        value: detailMember.linked_user
                          ? `${detailMember.linked_user.name || "-"} (${detailMember.linked_user.email || "-"})`
                          : null,
                      },
                    ]
                  : []),
                { label: copy.address, value: detailMember.address },
              ])}
            </Card>

            <Card title={copy.demographicInfo} style={{ borderRadius: 16 }}>
              {detailRows([
                { label: copy.education, value: detailMember.education },
                { label: copy.gender, value: genderLabel[detailMember.gender] || detailMember.gender },
                { label: copy.birthPlace, value: detailMember.birth_place },
                { label: copy.birthDate, value: formatDateValue(detailMember.birth_date) },
              ])}
            </Card>

            <Card title={copy.workInfo} style={{ borderRadius: 16 }}>
              {detailRows([
                { label: copy.division, value: detailMember.division },
                { label: copy.position, value: detailMember.position },
                { label: copy.joinDate, value: formatDateValue(detailMember.join_date) },
                {
                  label: copy.membershipStatus,
                  value: detailMember.status_name || statusLabel[detailMember.status] || detailMember.status,
                },
              ])}
            </Card>

            <Card title={copy.licenseInfo} style={{ borderRadius: 16 }}>
              {detailRows([
                { label: "SIP-1", value: detailMember.sip_1 },
                { label: "SIP-2", value: detailMember.sip_2 },
                { label: "SIP-3", value: detailMember.sip_3 },
                { label: copy.notes, value: detailMember.notes },
              ])}
            </Card>
          </div>
        ) : (
          <Text type="secondary">{copy.noDetail}</Text>
        )}
      </Drawer>
    </AppLayout>
  );
}
