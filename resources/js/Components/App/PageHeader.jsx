import React from "react";
import { Space, Typography } from "antd";

export default function PageHeader({ title, extra }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      <Space>{extra}</Space>
    </div>
  );
}
