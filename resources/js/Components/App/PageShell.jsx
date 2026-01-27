import React from "react";
import { Card } from "antd";

export default function PageShell({ children }) {
  return (
    <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
      {children}
    </Card>
  );
}
