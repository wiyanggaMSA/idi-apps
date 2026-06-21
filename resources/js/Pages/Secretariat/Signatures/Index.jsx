import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Alert, Button, Card, Empty, Space, Table, Tabs, Tag, Typography } from "antd";
import { CheckCircleOutlined, FileDoneOutlined, FileSearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import { formatDate } from "@/lib/format";

const verificationTag = {
  SIGNED_COMPLETE: { color: "green", label: "Lengkap" },
  PENDING_SIGNATURES: { color: "gold", label: "Menunggu" },
  NO_SIGNATURE_REQUESTS: { color: "default", label: "Tanpa request" },
};

function SignatureTable({ data, emptyText }) {
  const sign = (record) => {
    router.post(record.sign_url, {}, { preserveScroll: true });
  };

  return (
    <Table
      rowKey="id"
      dataSource={data}
      pagination={false}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      columns={[
        {
          title: "Surat",
          dataIndex: ["letter", "subject"],
          render: (value, record) => (
            <div>
              {record.letter?.show_url ? (
                <Link className="font-medium text-zinc-950" href={record.letter.show_url}>
                  {value || "Tanpa perihal"}
                </Link>
              ) : (
                <span className="font-medium text-zinc-950">{value || "Tanpa perihal"}</span>
              )}
              <div className="mt-1 text-xs text-zinc-500">
                {record.letter?.number || "Nomor belum tersedia"} · {formatDate(record.letter?.date)}
              </div>
            </div>
          ),
        },
        {
          title: "Atas Nama",
          render: (_, record) => (
            <div>
              <div>{record.signer_name || "-"}</div>
              <div className="text-xs text-zinc-500">{record.signer_role || "-"}</div>
            </div>
          ),
        },
        {
          title: "Status Barcode",
          dataIndex: ["letter", "signature_summary", "status"],
          render: (value, record) => {
            const state = verificationTag[value] ?? verificationTag.PENDING_SIGNATURES;
            const summary = record.letter?.signature_summary ?? {};

            return (
              <div>
                <Tag color={state.color}>{state.label}</Tag>
                <div className="mt-1 text-xs text-zinc-500">
                  {summary.signed_count ?? 0}/{summary.required_count ?? 0} tanda tangan
                </div>
              </div>
            );
          },
        },
        {
          title: "Ditandatangani",
          dataIndex: "signed_at",
          render: (value) => value || <span className="text-zinc-400">Belum</span>,
        },
        {
          title: "Aksi",
          align: "right",
          render: (_, record) => (
            <Space>
              {record.letter?.pdf_url ? (
                <Button href={record.letter.pdf_url} target="_blank" icon={<FileSearchOutlined />}>
                  PDF
                </Button>
              ) : null}
              {record.letter?.verify_url ? (
                <Button href={record.letter.verify_url} target="_blank" icon={<FileDoneOutlined />}>
                  Verifikasi
                </Button>
              ) : null}
              {!record.signed_at ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => sign(record)}>
                  Tanda Tangani
                </Button>
              ) : null}
            </Space>
          ),
        },
      ]}
    />
  );
}

export default function SignatureRequestsIndex() {
  const { linkedMember, signatures = [] } = usePage().props;
  const pending = useMemo(() => signatures.filter((item) => !item.signed_at), [signatures]);
  const signed = useMemo(() => signatures.filter((item) => item.signed_at), [signatures]);

  return (
    <AppLayout title="Sekretariat - Tanda Tangan">
      <PageShell>
        <PageHeader
          eyebrow="Sekretariat"
          title="Tanda Tangan"
          description="Daftar surat final yang membutuhkan tanda tangan dari akun pengguna yang sedang aktif."
        />

        {!linkedMember ? (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message="Akun belum terhubung ke data anggota IDI."
            description="Hubungkan akun pengguna ini ke data anggota agar surat yang diarahkan ke nama atau jabatan anggota tersebut tampil di halaman tanda tangan."
          />
        ) : (
          <Card className="mb-4 border-white/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Akun tertaut
                </Typography.Text>
                <div className="mt-1 text-lg font-semibold text-zinc-950">{linkedMember.full_name}</div>
                <div className="text-sm text-zinc-500">{linkedMember.position_name || "Jabatan belum diisi"}</div>
              </div>
              <Space>
                <Tag color="gold">{pending.length} menunggu</Tag>
                <Tag color="green">{signed.length} selesai</Tag>
              </Space>
            </div>
          </Card>
        )}

        <Card className="border-white/80 shadow-sm">
          <Tabs
            items={[
              {
                key: "pending",
                label: `Perlu Ditandatangani (${pending.length})`,
                children: (
                  <SignatureTable
                    data={pending}
                    emptyText={linkedMember ? "Tidak ada surat yang perlu ditandatangani." : "Akun belum tertaut ke anggota."}
                  />
                ),
              },
              {
                key: "signed",
                label: `Sudah Ditandatangani (${signed.length})`,
                children: <SignatureTable data={signed} emptyText="Belum ada riwayat tanda tangan." />,
              },
            ]}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
