import React from "react";
import { Card, Button } from "antd";
import AppLayout from "@/Layouts/AppLayout";

export default function CashExport() {
  return (
    <AppLayout title="Kas / Transaksi — Resume & Export PDF">
      <Card>
        <Button type="primary">Generate Resume</Button>
        <Button style={{ marginLeft: 8 }}>Export PDF</Button>
        <div style={{ marginTop: 12 }}>
          <em>Resume laporan keuangan akan tampil di sini (preview)</em>
        </div>
      </Card>
    </AppLayout>
  );
}
