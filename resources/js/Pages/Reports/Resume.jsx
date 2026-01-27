import React from "react";
import { Card, Button } from "antd";
import AppLayout from "@/Layouts/AppLayout";

export default function ReportsResume() {
  return (
    <AppLayout title="Laporan — Resume Keuangan">
      <Card>
        <Button type="primary">Generate Resume</Button>
        <div style={{ marginTop: 12 }}>
          <em>Preview resume keuangan akan tampil di sini.</em>
        </div>
      </Card>
    </AppLayout>
  );
}
