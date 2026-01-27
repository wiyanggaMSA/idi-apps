import React from "react";
import { Card, Tabs } from "antd";
import AppLayout from "@/Layouts/AppLayout";

export default function CashReports() {
  return (
    <AppLayout title="Kas / Transaksi — Laporan Kas & Iuran">
      <Card>
        <Tabs
          items={[
            { key: "cash", label: "Laporan Kas", children: "Ringkasan kas per periode" },
            { key: "dues", label: "Laporan Iuran", children: "Ringkasan iuran per periode" },
          ]}
        />
      </Card>
    </AppLayout>
  );
}
