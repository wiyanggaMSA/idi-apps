import React from "react";
import { Card, Button } from "antd";
import AppLayout from "@/Layouts/AppLayout";

export default function ReportsExport() {
  return (
    <AppLayout title="Laporan — Export PDF">
      <Card>
        <Button type="primary">Export PDF</Button>
        <div style={{ marginTop: 12 }}>
          <em>Nanti tombol ini akan panggil endpoint generate PDF.</em>
        </div>
      </Card>
    </AppLayout>
  );
}
