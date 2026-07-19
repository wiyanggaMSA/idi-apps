import React, { useMemo } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { Alert, Button, Card, Empty, Space, Table, Tabs, Tag, Typography } from "antd";
import { CheckCircleOutlined, FileDoneOutlined, FileSearchOutlined } from "@ant-design/icons";
import AppLayout from "@/Layouts/AppLayout";
import PageHeader from "@/Components/App/PageHeader";
import PageShell from "@/Components/App/PageShell";
import { formatDate } from "@/lib/format";
import useBilingual from "@/Hooks/useBilingual";

function SignatureTable({ data, emptyText }) {
  const { tx } = useBilingual();
  const verificationTag = {
    SIGNED_COMPLETE: { color: "green", label: tx("Lengkap", "Complete") },
    PENDING_SIGNATURES: { color: "gold", label: tx("Menunggu", "Pending") },
    NO_SIGNATURE_REQUESTS: { color: "default", label: tx("Tanpa permintaan", "No requests") },
  };
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
          title: tx("Surat", "Letter"),
          dataIndex: ["letter", "subject"],
          render: (value, record) => (
            <div>
              {record.letter?.show_url ? (
                <Link className="font-medium text-zinc-950" href={record.letter.show_url}>
                  {value || tx("Tanpa perihal", "No subject")}
                </Link>
              ) : (
                <span className="font-medium text-zinc-950">{value || tx("Tanpa perihal", "No subject")}</span>
              )}
              <div className="mt-1 text-xs text-zinc-500">
                {record.letter?.number || tx("Nomor belum tersedia", "Number not available")} · {formatDate(record.letter?.date)}
              </div>
            </div>
          ),
        },
        {
          title: tx("Atas Nama", "Signed On Behalf Of"),
          render: (_, record) => (
            <div>
              <div>{record.signer_name || "-"}</div>
              <div className="text-xs text-zinc-500">{record.signer_role || "-"}</div>
            </div>
          ),
        },
        {
          title: tx("Status Barcode", "Barcode Status"),
          dataIndex: ["letter", "signature_summary", "status"],
          render: (value, record) => {
            const state = verificationTag[value] ?? verificationTag.PENDING_SIGNATURES;
            const summary = record.letter?.signature_summary ?? {};

            return (
              <div>
                <Tag color={state.color}>{state.label}</Tag>
                <div className="mt-1 text-xs text-zinc-500">
                  {summary.signed_count ?? 0}/{summary.required_count ?? 0} {tx("tanda tangan", "signatures")}
                </div>
              </div>
            );
          },
        },
        {
          title: tx("Ditandatangani", "Signed At"),
          dataIndex: "signed_at",
          render: (value) => value || <span className="text-zinc-400">{tx("Belum", "Not yet")}</span>,
        },
        {
          title: tx("Aksi", "Actions"),
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
                  {tx("Verifikasi", "Verify")}
                </Button>
              ) : null}
              {!record.signed_at ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => sign(record)}>
                  {tx("Tanda Tangani", "Sign")}
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
  const { tx } = useBilingual();
  const pending = useMemo(() => signatures.filter((item) => !item.signed_at), [signatures]);
  const signed = useMemo(() => signatures.filter((item) => item.signed_at), [signatures]);

  return (
    <AppLayout title={tx("Sekretariat - Tanda Tangan", "Secretariat - Signatures")}>
      <PageShell>
        <PageHeader
          eyebrow={tx("Sekretariat", "Secretariat")}
          title={tx("Tanda Tangan", "Signatures")}
          description={tx("Daftar surat final yang membutuhkan tanda tangan dari akun pengguna yang sedang aktif.", "Final letters requiring a signature from the currently active user account.")}
        />

        {!linkedMember ? (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message={tx("Akun belum terhubung ke data anggota IDI.", "The account is not linked to an IDI member record.")}
            description={tx("Hubungkan akun pengguna ini ke data anggota agar surat yang diarahkan ke nama atau jabatan anggota tersebut tampil di halaman tanda tangan.", "Link this user account to a member record so letters assigned to that member's name or position appear on the signature page.")}
          />
        ) : (
          <Card className="mb-4 border-white/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Typography.Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  {tx("Akun tertaut", "Linked account")}
                </Typography.Text>
                <div className="mt-1 text-lg font-semibold text-zinc-950">{linkedMember.full_name}</div>
                <div className="text-sm text-zinc-500">{linkedMember.position_name || tx("Jabatan belum diisi", "Position not provided")}</div>
              </div>
              <Space>
                <Tag color="gold">{pending.length} {tx("menunggu", "pending")}</Tag>
                <Tag color="green">{signed.length} {tx("selesai", "completed")}</Tag>
              </Space>
            </div>
          </Card>
        )}

        <Card className="border-white/80 shadow-sm">
          <Tabs
            items={[
              {
                key: "pending",
                label: `${tx("Perlu Ditandatangani", "Needs Signature")} (${pending.length})`,
                children: (
                  <SignatureTable
                    data={pending}
                    emptyText={linkedMember ? tx("Tidak ada surat yang perlu ditandatangani.", "No letters require a signature.") : tx("Akun belum tertaut ke anggota.", "The account is not linked to a member.")}
                  />
                ),
              },
              {
                key: "signed",
                label: `${tx("Sudah Ditandatangani", "Signed")} (${signed.length})`,
                children: <SignatureTable data={signed} emptyText={tx("Belum ada riwayat tanda tangan.", "No signature history yet.")} />,
              },
            ]}
          />
        </Card>
      </PageShell>
    </AppLayout>
  );
}
