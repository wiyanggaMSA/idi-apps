import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  CloudDownloadOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function SettingsIndex() {
  const { props } = usePage();
  const access = props.access || { users: [], roles: [], permissions: [] };
  const users = access.users || [];
  const roles = access.roles || [];
  const permissions = access.permissions || [];

  const [orgForm] = Form.useForm();
  const [duesForm] = Form.useForm();
  const [userForm] = Form.useForm();
  
  const [assignRoleForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [editRoleForm] = Form.useForm();
  const [editPermissionForm] = Form.useForm();
  const [editUserForm] = Form.useForm();
  

  // ✅ Master Data: Divisi
  const [divisions, setDivisions] = useState(() => [
    { key: 1, name: "Umum" },
    { key: 2, name: "Keuangan" },
    { key: 3, name: "Komite" },
  ]);

  // ✅ Master Data: Jabatan (baru)
  const [positions, setPositions] = useState(() => [
    { key: 1, name: "Ketua" },
    { key: 2, name: "Sekretaris" },
    { key: 3, name: "Bendahara" },
  ]);

  // ✅ Master Data: Kategori Cashflow (masuk/keluar)
  const [cashCategories, setCashCategories] = useState(() => [
    { key: 1, type: "in", name: "Iuran Anggota" },
    { key: 2, type: "in", name: "Donasi" },
    { key: 3, type: "out", name: "Operasional" },
    { key: 4, type: "out", name: "Rapat" },
  ]);

  // ✅ Master Data: Status Bayar (baru)
  const [paymentStatuses, setPaymentStatuses] = useState(() => [
    { key: 1, code: "PAID", name: "Sudah Bayar", color: "green" },
    { key: 2, code: "UNPAID", name: "Belum Bayar", color: "gold" },
    { key: 3, code: "OVERDUE", name: "Menunggak", color: "red" },
  ]);

  // Dummy Users (untuk tab User & Permission)
  const [assignRoleModal, setAssignRoleModal] = useState({ open: false, user: null });
  const [syncRoleModal, setSyncRoleModal] = useState({ open: false, role: null });
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);
  const [syncUserModal, setSyncUserModal] = useState({ open: false, user: null });
  const [editRoleModal, setEditRoleModal] = useState({ open: false, role: null });
  const [editPermissionModal, setEditPermissionModal] = useState({ open: false, permission: null });
  const [editUserModal, setEditUserModal] = useState({ open: false, user: null });

  // --- helpers CRUD dummy ---
  const addRow = (setter, row) => {
    setter((p) => [{ key: Date.now(), ...row }, ...p]);
    message.success("Ditambah (dummy).");
  };
  const removeRow = (setter, key) => {
    setter((p) => p.filter((x) => x.key !== key));
    message.info("Dihapus (dummy).");
  };

  const saveOrg = async () => {
    try {
      await orgForm.validateFields();
      message.success("Profil organisasi tersimpan (dummy).");
    } catch {}
  };

  const saveDues = async () => {
    try {
      await duesForm.validateFields();
      message.success("Pengaturan iuran tersimpan (dummy).");
    } catch {}
  };

  const addUser = async () => {
    try {
      const v = await userForm.validateFields();
      router.post(route("settings.access.users.store"), v, {
        onSuccess: () => {
          userForm.resetFields();
          message.success("User berhasil ditambahkan.");
        },
      });
    } catch {}
  };

  const addRole = async () => {
    try {
      const v = await roleForm.validateFields();
      router.post(route("settings.access.roles.store"), v, {
        onSuccess: () => {
          roleForm.resetFields();
          message.success("Role berhasil ditambahkan.");
        },
      });
    } catch {}
  };

  const addPermission = async () => {
    try {
      const v = await permissionForm.validateFields();
      router.post(route("settings.access.permissions.store"), v, {
        onSuccess: () => {
          permissionForm.resetFields();
          message.success("Permission berhasil ditambahkan.");
        },
      });
    } catch {}
  };

  const confirmDisableUser = (user) => {
    Modal.confirm({
      title: "Nonaktifkan user?",
      content: `${user.name} akan dinonaktifkan.`,
      okText: "Nonaktifkan",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: () => router.patch(route("settings.access.users.disable", user.id)),
    });
  };

  const openEditUser = (user) => {
    setEditUserModal({ open: true, user });
    editUserForm.setFieldsValue({ name: user.name, email: user.email });
  };

  const submitEditUser = async () => {
    try {
      const v = await editUserForm.validateFields();
      router.patch(route("settings.access.users.update", editUserModal.user.id), v, {
        onSuccess: () => {
          setEditUserModal({ open: false, user: null });
          editUserForm.resetFields();
          message.success("User berhasil diperbarui.");
        },
      });
    } catch {}
  };

  const openAssignRole = (user) => {
    setAssignRoleModal({ open: true, user });
    assignRoleForm.setFieldsValue({ role: user.roles?.[0] || undefined });
  };

  const submitAssignRole = async () => {
    try {
      const v = await assignRoleForm.validateFields();
      router.patch(route("settings.access.users.assign-role", assignRoleModal.user.id), v, {
        onSuccess: () => {
          setAssignRoleModal({ open: false, user: null });
          assignRoleForm.resetFields();
          message.success("Role user diperbarui.");
        },
      });
    } catch {}
  };

  const openSyncRolePermissions = (role) => {
    setSelectedRolePermissions(role.permissions || []);
    setSyncRoleModal({ open: true, role });
  };

  const openEditRole = (role) => {
    setEditRoleModal({ open: true, role });
    editRoleForm.setFieldsValue({ name: role.name });
  };

  const submitEditRole = async () => {
    try {
      const v = await editRoleForm.validateFields();
      router.patch(route("settings.access.roles.update", editRoleModal.role.id), v, {
        onSuccess: () => {
          setEditRoleModal({ open: false, role: null });
          editRoleForm.resetFields();
          message.success("Role berhasil diperbarui.");
        },
      });
    } catch {}
  };

  const confirmDeleteRole = (role) => {
    Modal.confirm({
      title: "Hapus role?",
      content: `Role ${role.name} akan dihapus.`,
      okText: "Hapus",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: () => router.delete(route("settings.access.roles.destroy", role.id)),
    });
  };

  const submitSyncRolePermissions = () => {
    router.patch(
      route("settings.access.roles.sync-permissions", syncRoleModal.role.id),
      { permissions: selectedRolePermissions },
      {
        onSuccess: () => {
          setSyncRoleModal({ open: false, role: null });
          message.success("Permission role diperbarui.");
        },
      }
    );
  };

  const openSyncUserPermissions = (user) => {
    setSelectedUserPermissions(user.permissions || []);
    setSyncUserModal({ open: true, user });
  };

  const openEditPermission = (permission) => {
    setEditPermissionModal({ open: true, permission });
    editPermissionForm.setFieldsValue({ name: permission.name });
  };

  const submitEditPermission = async () => {
    try {
      const v = await editPermissionForm.validateFields();
      router.patch(route("settings.access.permissions.update", editPermissionModal.permission.id), v, {
        onSuccess: () => {
          setEditPermissionModal({ open: false, permission: null });
          editPermissionForm.resetFields();
          message.success("Permission berhasil diperbarui.");
        },
      });
    } catch {}
  };

  const confirmDeletePermission = (permission) => {
    Modal.confirm({
      title: "Hapus permission?",
      content: `${permission.name} akan dihapus.`,
      okText: "Hapus",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: () => router.delete(route("settings.access.permissions.destroy", permission.id)),
    });
  };

  const submitSyncUserPermissions = () => {
    router.patch(
      route("settings.access.users.sync-permissions", syncUserModal.user.id),
      { permissions: selectedUserPermissions },
      {
        onSuccess: () => {
          setSyncUserModal({ open: false, user: null });
          message.success("Permission user diperbarui.");
        },
      }
    );
  };
  // --- tabs ---
  const tabs = useMemo(() => {
    return [
      // 1) Profil Organisasi
      {
        key: "profile",
        label: (
          <Space>
            <ApartmentOutlined />
            Profil Organisasi
          </Space>
        ),
        children: (
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
              <Card style={{ borderRadius: 12 }} title={<Text strong>Profil Organisasi</Text>}>
                <Form
                  form={orgForm}
                  layout="vertical"
                  requiredMark={false}
                  initialValues={{
                    org_name: "IDI Cabang Purwakarta",
                    address: "Alamat sekretariat...",
                    phone: "08xx-xxxx-xxxx",
                    email: "idi.purwakarta@org.id",
                    currency: "IDR",
                    timezone: "Asia/Jakarta",
                    brand_color: "#1677ff",
                  }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Nama Organisasi"
                        name="org_name"
                        rules={[{ required: true, message: "Nama organisasi wajib" }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Telepon" name="phone">
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Email" name="email">
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item label="Alamat" name="address">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Mata Uang" name="currency">
                        <Select
                          options={[
                            { value: "IDR", label: "IDR" },
                            { value: "USD", label: "USD" },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Timezone" name="timezone">
                        <Select
                          options={[
                            { value: "Asia/Jakarta", label: "Asia/Jakarta" },
                            { value: "Asia/Makassar", label: "Asia/Makassar" },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Brand Color" name="brand_color">
                        <Input placeholder="#1677ff" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Mode Gelap">
                        <Switch onChange={() => message.info("TODO: dark mode")} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button type="primary" icon={<SaveOutlined />} onClick={saveOrg}>
                        Simpan
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card style={{ borderRadius: 12, background: "#f5f7fb" }} title={<Text strong>Catatan</Text>}>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#595959" }}>
                  <li>Profil organisasi disimpan ke <code>app_settings</code>.</li>
                  <li>Logo & brand color dipakai untuk header/sidebar.</li>
                  <li>Timezone dipakai untuk tanggal transaksi/surat.</li>
                </ul>
              </Card>
            </Col>
          </Row>
        ),
      },

      // 2) Master Data
      {
        key: "master",
        label: (
          <Space>
            <DatabaseOutlined />
            Master Data
          </Space>
        ),
        children: (
          <Card style={{ borderRadius: 12 }}>
            <Tabs
              tabBarStyle={{ marginBottom: 12 }}
              items={[
                {
                  key: "divisions",
                  label: "Divisi",
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={divisions}
                      rowKey="key"
                      title={() => (
                        <Space>
                          <Text strong>Divisi</Text>
                          <Button size="small" icon={<PlusOutlined />} onClick={() => addRow(setDivisions, { name: "Divisi Baru" })}>
                            Tambah
                          </Button>
                        </Space>
                      )}
                      columns={[
                        { title: "Nama Divisi", dataIndex: "name", key: "name" },
                        {
                          title: "Aksi",
                          key: "aksi",
                          width: 80,
                          align: "right",
                          render: (_, r) => (
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(setDivisions, r.key)} />
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "positions",
                  label: "Jabatan",
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={positions}
                      rowKey="key"
                      title={() => (
                        <Space>
                          <Text strong>Jabatan</Text>
                          <Button size="small" icon={<PlusOutlined />} onClick={() => addRow(setPositions, { name: "Jabatan Baru" })}>
                            Tambah
                          </Button>
                        </Space>
                      )}
                      columns={[
                        { title: "Nama Jabatan", dataIndex: "name", key: "name" },
                        {
                          title: "Aksi",
                          key: "aksi",
                          width: 80,
                          align: "right",
                          render: (_, r) => (
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(setPositions, r.key)} />
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "cash_categories",
                  label: "Kategori Cashflow",
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={cashCategories}
                      rowKey="key"
                      title={() => (
                        <Space>
                          <Text strong>Kategori Cashflow</Text>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => addRow(setCashCategories, { type: "out", name: "Kategori Baru" })}
                          >
                            Tambah
                          </Button>
                        </Space>
                      )}
                      columns={[
                        {
                          title: "Tipe",
                          dataIndex: "type",
                          key: "type",
                          width: 110,
                          render: (v) => (v === "in" ? <Tag color="green">MASUK</Tag> : <Tag color="red">KELUAR</Tag>),
                        },
                        { title: "Nama Kategori", dataIndex: "name", key: "name" },
                        {
                          title: "Aksi",
                          key: "aksi",
                          width: 80,
                          align: "right",
                          render: (_, r) => (
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(setCashCategories, r.key)} />
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "payment_statuses",
                  label: "Status Bayar",
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={paymentStatuses}
                      rowKey="key"
                      title={() => (
                        <Space>
                          <Text strong>Status Bayar</Text>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() =>
                              addRow(setPaymentStatuses, { code: "NEW", name: "Status Baru", color: "blue" })
                            }
                          >
                            Tambah
                          </Button>
                        </Space>
                      )}
                      columns={[
                        { title: "Code", dataIndex: "code", key: "code", width: 120 },
                        { title: "Nama", dataIndex: "name", key: "name" },
                        {
                          title: "Label",
                          dataIndex: "color",
                          key: "color",
                          width: 140,
                          render: (v, r) => <Tag color={v || "blue"}>{r.name}</Tag>,
                        },
                        {
                          title: "Aksi",
                          key: "aksi",
                          width: 80,
                          align: "right",
                          render: (_, r) => (
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(setPaymentStatuses, r.key)} />
                          ),
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "dues_settings",
                  label: "Pengaturan Iuran",
                  children: (
                    <Card style={{ borderRadius: 12 }}>
                      <Form
                        form={duesForm}
                        layout="vertical"
                        requiredMark={false}
                        initialValues={{
                          dues_amount: 100000,
                          due_day: 10,
                          grace_days: 7,
                          auto_mark_arrears: true,
                          allow_partial: false,
                        }}
                      >
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Nominal Iuran (default)"
                              name="dues_amount"
                              rules={[{ required: true, message: "Nominal wajib" }]}
                            >
                              <InputNumber style={{ width: "100%" }} min={0} step={1000} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Jatuh Tempo (tanggal setiap bulan)"
                              name="due_day"
                              rules={[{ required: true, message: "Wajib" }]}
                            >
                              <InputNumber style={{ width: "100%" }} min={1} max={28} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item label="Masa Tenggang (hari)" name="grace_days">
                              <InputNumber style={{ width: "100%" }} min={0} max={60} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item label="Auto tandai menunggak" name="auto_mark_arrears" valuePropName="checked">
                              <Switch />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item label="Boleh bayar parsial" name="allow_partial" valuePropName="checked">
                              <Switch />
                            </Form.Item>
                          </Col>

                          <Col xs={24} style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button type="primary" icon={<SaveOutlined />} onClick={saveDues}>
                              Simpan
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  ),
                },
              ]}
            />
          </Card>
        ),
      },

      // 3) User & Permission
      {
        key: "access",
        label: (
          <Space>
            <SafetyCertificateOutlined />
            User & Permission
          </Space>
        ),
        children: (
          <Card style={{ borderRadius: 12 }}>
            <Tabs
              tabBarStyle={{ marginBottom: 12 }}
              items={[
                {
                  key: "users",
                  label: "Users",
                  children: (
                    <Row gutter={[12, 12]}>
                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Tambah User</Text>}>
                          <Form form={userForm} layout="vertical" requiredMark={false}>
                            <Row gutter={[12, 12]}>
                              <Col xs={24} md={12}>
                                <Form.Item name="name" label="Nama" rules={[{ required: true, message: "Nama wajib" }]}>
                                  <Input placeholder="Nama user..." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email wajib" }]}>
                                  <Input placeholder="email@org.id" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item name="role" label="Role" rules={[{ required: true, message: "Role wajib" }]}>
                                  <Select
                                    placeholder="Pilih role"
                                    options={roles.map((role) => ({ value: role.name, label: role.name }))}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  name="password"
                                  label="Password"
                                  rules={[{ required: true, message: "Password wajib" }, { min: 8, message: "Minimal 8 karakter" }]}
                                >
                                  <Input.Password placeholder="Password sementara..." />
                                </Form.Item>
                              </Col>

                              <Col xs={24} style={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button type="primary" icon={<PlusOutlined />} onClick={addUser}>
                                  Tambah
                                </Button>
                              </Col>
                            </Row>
                          </Form>
                        </Card>
                      </Col>

                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Daftar User</Text>}>
                          <Table
                            size="small"
                            dataSource={users}
                            rowKey="id"
                            pagination={false}
                            columns={[
                              { title: "Nama", dataIndex: "name", key: "name" },
                              { title: "Email", dataIndex: "email", key: "email" },
                              {
                                title: "Role",
                                dataIndex: "roles",
                                key: "role",
                                width: 180,
                                render: (roles) =>
                                  roles?.length ? (
                                    <Space wrap>
                                      {roles.map((role) => (
                                        <Tag key={role} color="blue">
                                          {role}
                                        </Tag>
                                      ))}
                                    </Space>
                                  ) : (
                                    <Tag color="default">Tanpa Role</Tag>
                                  ),
                              },
                              {
                                title: "Status",
                                dataIndex: "is_active",
                                key: "status",
                                width: 100,
                                render: (v) => <Tag color={v ? "green" : "red"}>{v ? "AKTIF" : "NONAKTIF"}</Tag>,
                              },
                              {
                                title: "Aksi",
                                key: "aksi",
                                width: 260,
                                align: "right",
                                render: (_, r) => (
                                  <Space>
                                    <Button size="small" onClick={() => openEditUser(r)}>
                                      Edit
                                    </Button>
                                    <Button size="small" onClick={() => openAssignRole(r)}>
                                      Assign Role
                                    </Button>
                                    <Button size="small" onClick={() => openSyncUserPermissions(r)}>
                                      Sync Permission
                                    </Button>
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDisableUser(r)} />
                                  </Space>
                                ),
                              },
                            ]}
                          />
                          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                            *Data diambil dari Spatie Permission (roles/permissions).
                          </Text>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: "roles",
                  label: "Roles",
                  children: (
                    <Row gutter={[12, 12]}>
                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Tambah Role</Text>}>
                          <Form form={roleForm} layout="vertical" requiredMark={false}>
                            <Form.Item name="name" label="Nama Role" rules={[{ required: true, message: "Nama role wajib" }]}>
                              <Input placeholder="Contoh: Admin" />
                            </Form.Item>
                            <Button type="primary" icon={<PlusOutlined />} onClick={addRole}>
                              Tambah Role
                            </Button>
                          </Form>
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Daftar Role</Text>}>
                          <Table
                            size="small"
                            dataSource={roles}
                            rowKey="id"
                            pagination={false}
                            columns={[
                              { title: "Nama", dataIndex: "name", key: "name" },
                              {
                                title: "Permissions",
                                dataIndex: "permissions",
                                key: "permissions",
                                render: (value) => (
                                  <Space wrap>
                                    {(value || []).map((permission) => (
                                      <Tag key={permission}>{permission}</Tag>
                                    ))}
                                  </Space>
                                ),
                              },
                              {
                                title: "Aksi",
                                key: "aksi",
                                width: 220,
                                align: "right",
                                render: (_, role) => (
                                  <Space>
                                    <Button size="small" onClick={() => openEditRole(role)}>
                                      Edit
                                    </Button>
                                    <Button size="small" onClick={() => openSyncRolePermissions(role)}>
                                      Sync Permission
                                    </Button>
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDeleteRole(role)} />
                                  </Space>
                                ),
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: "permissions",
                  label: "Permissions",
                  children: (
                    <Row gutter={[12, 12]}>
                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Tambah Permission</Text>}>
                          <Form form={permissionForm} layout="vertical" requiredMark={false}>
                            <Form.Item
                              name="name"
                              label="Nama Permission"
                              rules={[{ required: true, message: "Nama permission wajib" }]}
                            >
                              <Input placeholder="Contoh: users.view" />
                            </Form.Item>
                            <Button type="primary" icon={<PlusOutlined />} onClick={addPermission}>
                              Tambah Permission
                            </Button>
                          </Form>
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card style={{ borderRadius: 12 }} title={<Text strong>Daftar Permission</Text>}>
                          <Table
                            size="small"
                            dataSource={permissions}
                            rowKey="id"
                            pagination={false}
                            columns={[
                              { title: "Nama", dataIndex: "name", key: "name" },
                              {
                                title: "Aksi",
                                key: "aksi",
                                width: 140,
                                align: "right",
                                render: (_, permission) => (
                                  <Space>
                                    <Button size="small" onClick={() => openEditPermission(permission)}>
                                      Edit
                                    </Button>
                                    <Button
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => confirmDeletePermission(permission)}
                                    />
                                  </Space>
                                ),
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </Card>
        ),
      },

      // 4) Backup Database
      {
        key: "backup",
        label: (
          <Space>
            <CloudDownloadOutlined />
            Backup Database
          </Space>
        ),
        children: (
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
              <Card style={{ borderRadius: 12 }} title={<Text strong>Backup Data</Text>}>
                <Text type="secondary">Backup data untuk kebutuhan arsip (dummy).</Text>

                <div style={{ marginTop: 12 }}>
                  <Space wrap>
                    <Button onClick={() => message.info("TODO: backup members")} icon={<CloudDownloadOutlined />}>
                      Backup Members
                    </Button>
                    <Button onClick={() => message.info("TODO: backup finance")} icon={<CloudDownloadOutlined />}>
                      Backup Keuangan
                    </Button>
                    <Button type="primary" onClick={() => message.info("TODO: backup all")} icon={<CloudDownloadOutlined />}>
                      Backup Semua
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card style={{ borderRadius: 12, background: "#f5f7fb" }} title={<Text strong>Catatan</Text>}>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#595959" }}>
                  <li>Backup idealnya hanya untuk role Admin.</li>
                  <li>Nanti simpan log backup ke tabel <code>backups</code>.</li>
                </ul>
              </Card>
            </Col>
          </Row>
        ),
      },
    ];
  }, [cashCategories, divisions, positions, paymentStatuses, users, roles, permissions]);

  return (
    <AppLayout title="Pengaturan">
      <PageShell>
        <PageHeader title="Pengaturan" />
        <Tabs items={tabs} defaultActiveKey="profile" tabBarStyle={{ marginBottom: 12 }} />
        <Modal
          title={`Assign Role: ${assignRoleModal.user?.name || ""}`}
          open={assignRoleModal.open}
          onCancel={() => setAssignRoleModal({ open: false, user: null })}
          onOk={submitAssignRole}
          okText="Simpan"
        >
          <Form form={assignRoleForm} layout="vertical">
            <Form.Item name="role" label="Role" rules={[{ required: true, message: "Role wajib" }]}>
              <Select placeholder="Pilih role" options={roles.map((role) => ({ value: role.name, label: role.name }))} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`Edit User: ${editUserModal.user?.name || ""}`}
          open={editUserModal.open}
          onCancel={() => setEditUserModal({ open: false, user: null })}
          onOk={submitEditUser}
          okText="Simpan"
        >
          <Form form={editUserForm} layout="vertical">
            <Form.Item name="name" label="Nama" rules={[{ required: true, message: "Nama wajib" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email wajib" }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`Sync Permission Role: ${syncRoleModal.role?.name || ""}`}
          open={syncRoleModal.open}
          onCancel={() => setSyncRoleModal({ open: false, role: null })}
          onOk={submitSyncRolePermissions}
          okText="Simpan"
          width={640}
        >
          <Text type="secondary">Pilih permission yang diberikan ke role.</Text>
          <Divider />
          <Checkbox.Group
            style={{ width: "100%" }}
            value={selectedRolePermissions}
            onChange={(value) => setSelectedRolePermissions(value)}
          >
            <Row gutter={[8, 8]}>
              {permissions.map((permission) => (
                <Col key={permission.id} span={12}>
                  <Checkbox value={permission.name}>{permission.name}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Modal>

        <Modal
          title={`Edit Role: ${editRoleModal.role?.name || ""}`}
          open={editRoleModal.open}
          onCancel={() => setEditRoleModal({ open: false, role: null })}
          onOk={submitEditRole}
          okText="Simpan"
        >
          <Form form={editRoleForm} layout="vertical">
            <Form.Item name="name" label="Nama Role" rules={[{ required: true, message: "Nama role wajib" }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={`Sync Permission User: ${syncUserModal.user?.name || ""}`}
          open={syncUserModal.open}
          onCancel={() => setSyncUserModal({ open: false, user: null })}
          onOk={submitSyncUserPermissions}
          okText="Simpan"
          width={640}
        >
          <Text type="secondary">Permission tambahan khusus user (override per user).</Text>
          <Divider />
          <Checkbox.Group
            style={{ width: "100%" }}
            value={selectedUserPermissions}
            onChange={(value) => setSelectedUserPermissions(value)}
          >
            <Row gutter={[8, 8]}>
              {permissions.map((permission) => (
                <Col key={permission.id} span={12}>
                  <Checkbox value={permission.name}>{permission.name}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Modal>

        <Modal
          title={`Edit Permission: ${editPermissionModal.permission?.name || ""}`}
          open={editPermissionModal.open}
          onCancel={() => setEditPermissionModal({ open: false, permission: null })}
          onOk={submitEditPermission}
          okText="Simpan"
        >
          <Form form={editPermissionForm} layout="vertical">
            <Form.Item name="name" label="Nama Permission" rules={[{ required: true, message: "Nama permission wajib" }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </PageShell>
    </AppLayout>
  );
}
