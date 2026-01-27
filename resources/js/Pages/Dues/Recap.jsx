import React from "react";
import { Card, Button } from "antd";
import AppLayout from "@/Layouts/AppLayout";

export default function DuesRecap() {
  return (
    <AppLayout title="Iuran — Rekap">
      <Card>
        <Button type="primary">Export Rekap (PDF)</Button>
        <div style={{ marginTop: 12 }}>
          <em>Rekap iuran per periode akan ditampilkan di sini</em>
        </div>
      </Card>
    </AppLayout>
  );
}
