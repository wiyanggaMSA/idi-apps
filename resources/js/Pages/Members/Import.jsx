import React from "react";
import { Card, Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";

export default function MemberImport() {
  return (
    <AppLayout title="Anggota — Import / Export">
      <Card>
        <Upload>
          <Button icon={<UploadOutlined />}>Upload Excel Anggota</Button>
        </Upload>

        <div style={{ marginTop: 16 }}>
          <Button>Download Template</Button>
        </div>
      </Card>
    </AppLayout>
  );
}
