import React, { useMemo, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import PageShell from "@/components/app/PageShell";
import PageHeader from "@/components/app/PageHeader";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
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
  const [orgForm] = Form.useForm();
  const [duesForm] = Form.useForm();
  const [userForm] = Form.useForm();

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
  const [users, setUsers] = useState(() => [
    { key: 1, name: "Budi Admin", email: "budi@org.id", role: "Admin", status: "AKTIF" },
    { key: 2, name: "Siti Staff", email: "siti@org.id", role: "Keuangan", status: "AKTIF" },
  ]);

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
      setUsers((p) => [
        { key: Date.now(), name: v.name, email: v.email, role: v.role, status: "AKTIF" },
        ...p,
      ]);
      userForm.resetFields();
      message.success("User ditambah (dummy).");
    } catch {}
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
                                    options={[
                                      { value: "Admin", label: "Admin" },
                                      { value: "Keuangan", label: "Keuangan" },
                                      { value: "Viewer", label: "Viewer" },
                                    ]}
                                  />
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
                            rowKey="key"
                            pagination={false}
                            columns={[
                              { title: "Nama", dataIndex: "name", key: "name" },
                              { title: "Email", dataIndex: "email", key: "email" },
                              {
                                title: "Role",
                                dataIndex: "role",
                                key: "role",
                                width: 120,
                                render: (v) => <Tag color="blue">{v}</Tag>,
                              },
                              {
                                title: "Status",
                                dataIndex: "status",
                                key: "status",
                                width: 100,
                                render: (v) => <Tag color="green">{v}</Tag>,
                              },
                              {
                                title: "Aksi",
                                key: "aksi",
                                width: 70,
                                align: "right",
                                render: (_, r) => (
                                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(setUsers, r.key)} />
                                ),
                              },
                            ]}
                          />
                          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                            *Nanti connect ke Spatie Permission (roles/permissions).
                          </Text>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                { key: "roles", label: "Roles", children: "TODO: UI roles (Spatie)" },
                { key: "permissions", label: "Permissions", children: "TODO: UI permissions (Spatie)" },
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
  }, [cashCategories, divisions, positions, paymentStatuses, users]);

  return (
    <AppLayout title="Pengaturan">
      <PageShell>
        <PageHeader title="Pengaturan" />
        <Tabs items={tabs} defaultActiveKey="profile" tabBarStyle={{ marginBottom: 12 }} />
      </PageShell>
    </AppLayout>
  );
}
