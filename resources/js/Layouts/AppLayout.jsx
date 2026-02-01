import React, { useMemo, useState } from "react";
import { Layout } from "antd";
import { usePage } from "@inertiajs/react";
import AppSidebar from "@/Components/App/AppSidebar";
import AppHeader from "@/Components/App/AppHeader";

const { Content } = Layout;

export default function AppLayout({ title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { props } = usePage();
  const auth = props?.auth || {};
  const user = auth?.user || null;
  const orgProfile = props?.orgProfile || {};

  return (
    <Layout style={{ minHeight: "100vh", height: "100vh", overflow: "hidden" }}>
      <AppSidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        orgName={orgProfile?.org_name}
      />

      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <AppHeader
          title={title || "Aplikasi Keuangan Organisasi"}
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          orgName={orgProfile?.org_name}
          brandColor={orgProfile?.brand_color}
        />

        <Content
          style={{
            padding: 16,
            overflowY: "auto",
            height: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
