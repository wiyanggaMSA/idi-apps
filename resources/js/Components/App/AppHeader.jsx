import React from "react";
import { Layout, Button, Space, Typography, Dropdown } from "antd";
import { MenuUnfoldOutlined, MenuFoldOutlined, UserOutlined } from "@ant-design/icons";
import { router } from "@inertiajs/react";

const { Header } = Layout;

export default function AppHeader({ title, user, collapsed, onToggle }) {
  const items = [
    { key: "profile", label: "Profil" },
    {
      key: "logout",
      label: "Logout",
      onClick: () => router.post(route("logout")),
    },
  ];

  return (
    <Header
      style={{
        background: "#1677ff",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Space>
        <Button
          type="text"
          onClick={onToggle}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        />
        <Typography.Text style={{ color: "#fff", fontWeight: 600 }}>
          {title}
        </Typography.Text>
      </Space>

      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button icon={<UserOutlined />}>
          {user?.name || "User"}
        </Button>
      </Dropdown>
    </Header>
  );
}
