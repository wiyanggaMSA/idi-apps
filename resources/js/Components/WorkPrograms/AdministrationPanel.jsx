import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
    Alert,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Space,
    Statistic,
    Table,
    Upload,
    message,
} from "antd";
import {
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    PlusOutlined,
    SaveOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { formatDate, formatDateTime, formatIDR } from "@/lib/format";

const { TextArea } = Input;

const DOCUMENT_CATEGORIES = [
    ["proposal", "Proposal"],
    ["tor_kak", "TOR/KAK"],
    ["rab", "RAB"],
    ["surat_tugas", "Surat Tugas"],
    ["undangan", "Undangan"],
    ["notulen", "Notulen"],
    ["daftar_hadir", "Daftar Hadir"],
    ["foto", "Foto"],
    ["laporan", "Laporan"],
    ["bukti_transaksi", "Bukti Transaksi"],
    ["evaluasi", "Evaluasi"],
    ["lainnya", "Lainnya"],
];

const LOCKED_PROGRAM_STATUSES = ["completed", "evaluated", "archived", "cancelled", "rejected"];

function isProgramLocked(program) {
    return LOCKED_PROGRAM_STATUSES.includes(program?.status);
}

function LockedProgramAlert({ section = "Bagian ini" }) {
    return (
        <Alert
            className="mb-4"
            type="info"
            showIcon
            title="Program kerja sudah dikunci"
            description={`${section} tidak dapat diubah setelah program selesai. Jika perlu revisi, minta ketua/reviewer membuka revisi program terlebih dahulu.`}
        />
    );
}

function cleanPayload(payload) {
    const cleaned = { ...payload };
    Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === "") {
            delete cleaned[key];
        }
    });
    return cleaned;
}

function BudgetPanel({ program, permissions, onChanged }) {
    const [form] = Form.useForm();
    const [itemForm] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState(program.budget_items || []);
    const [editingItem, setEditingItem] = useState(null);
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const locked = isProgramLocked(program);
    const canManageBudget = permissions.includes("work_program.manage_budget") && !locked;

    useEffect(() => {
        form.setFieldsValue({
            estimated_budget: program.estimated_budget || 0,
            realized_budget: program.realized_budget || 0,
            budget_source: program.budget_source,
            internal_notes: program.internal_notes,
        });
        setItems(program.budget_items || []);
    }, [form, program]);

    const save = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await axios.patch(route("work-programs.budget.update", program.id), cleanPayload(values));
            message.success("Anggaran berhasil diperbarui.");
            onChanged?.();
        } catch (error) {
            message.error(error.response?.data?.message || "Anggaran belum dapat disimpan.");
        } finally {
            setSaving(false);
        }
    };

    const syncBudgetResponse = (response) => {
        const payload = response.data?.data || {};
        setItems(payload.items || []);
        form.setFieldsValue({
            estimated_budget: payload.estimated_budget || 0,
            realized_budget: payload.realized_budget || 0,
            budget_source: payload.budget_source,
            internal_notes: payload.internal_notes,
        });
        onChanged?.();
    };

    const openItemModal = (item = null) => {
        setEditingItem(item);
        itemForm.setFieldsValue(
            item
                ? {
                      ...item,
                      quantity: Number(item.quantity || 1),
                      unit_cost: Number(item.unit_cost || 0),
                      estimated_amount: Number(item.estimated_amount || 0),
                      realized_amount: Number(item.realized_amount || 0),
                  }
                : {
                      category: undefined,
                      description: "",
                      quantity: 1,
                      unit: "",
                      unit_cost: 0,
                      estimated_amount: 0,
                      realized_amount: 0,
                      budget_source: program.budget_source,
                      notes: "",
                  },
        );
        setItemModalOpen(true);
    };

    const saveItem = async () => {
        const values = await itemForm.validateFields();
        setSaving(true);
        try {
            const payload = cleanPayload(values);
            const response = editingItem
                ? await axios.patch(route("work-programs.budget-items.update", [program.id, editingItem.id]), payload)
                : await axios.post(route("work-programs.budget-items.store", program.id), payload);

            syncBudgetResponse(response);
            message.success(editingItem ? "Rincian anggaran berhasil diperbarui." : "Rincian anggaran berhasil ditambahkan.");
            setItemModalOpen(false);
            setEditingItem(null);
            itemForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || "Rincian anggaran belum dapat disimpan.");
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (item) => {
        setSaving(true);
        try {
            const response = await axios.delete(route("work-programs.budget-items.destroy", [program.id, item.id]));
            syncBudgetResponse(response);
            message.success("Rincian anggaran berhasil dihapus.");
        } catch (error) {
            message.error(error.response?.data?.message || "Rincian anggaran belum dapat dihapus.");
        } finally {
            setSaving(false);
        }
    };

    const estimatedTotal = items.reduce((sum, item) => sum + Number(item.estimated_amount || 0), 0);
    const realizedTotal = items.reduce((sum, item) => sum + Number(item.realized_amount || 0), 0);
    const displayEstimated = items.length ? estimatedTotal : Number(program.estimated_budget || 0);
    const displayRealized = items.length ? realizedTotal : Number(program.realized_budget || 0);
    const remaining = displayEstimated - displayRealized;

    const budgetColumns = [
        {
            title: "Komponen",
            dataIndex: "description",
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">
                        {[row.category, row.budget_source].filter(Boolean).join(" · ") || "Tanpa kategori"}
                    </div>
                    {row.notes ? <div className="mt-1 text-xs text-zinc-500">{row.notes}</div> : null}
                </div>
            ),
        },
        {
            title: "Qty",
            width: 100,
            render: (_, row) => `${row.quantity || 1} ${row.unit || ""}`,
        },
        {
            title: "Harga Satuan",
            width: 160,
            render: (_, row) => formatIDR(row.unit_cost || 0),
        },
        {
            title: "Estimasi",
            width: 160,
            render: (_, row) => formatIDR(row.estimated_amount || 0),
        },
        {
            title: "Realisasi",
            width: 160,
            render: (_, row) => formatIDR(row.realized_amount || 0),
        },
        {
            title: "",
            width: 160,
            render: (_, row) =>
                canManageBudget ? (
                    <Space>
                        <Button size="small" onClick={() => openItemModal(row)}>Edit</Button>
                        <Popconfirm
                            title="Hapus rincian anggaran?"
                            okText="Hapus"
                            cancelText="Batal"
                            onConfirm={() => deleteItem(row)}
                        >
                            <Button size="small" danger>Hapus</Button>
                        </Popconfirm>
                    </Space>
                ) : null,
        },
    ];

    return (
        <Space orientation="vertical" size="middle" className="w-full">
            <div className="grid gap-4 md:grid-cols-3">
                <Card><Statistic title="Estimasi" value={displayEstimated} formatter={(value) => formatIDR(value)} /></Card>
                <Card><Statistic title="Realisasi" value={displayRealized} formatter={(value) => formatIDR(value)} /></Card>
                <Card><Statistic title="Sisa" value={remaining} formatter={(value) => formatIDR(value)} /></Card>
            </div>
            <Card
                title="Rincian Anggaran"
                extra={canManageBudget ? <Button type="primary" icon={<PlusOutlined />} onClick={() => openItemModal()}>Tambah Rincian</Button> : null}
            >
                {locked ? <LockedProgramAlert section="Anggaran" /> : null}
                <Table
                    columns={budgetColumns}
                    dataSource={items}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: "Belum ada rincian anggaran." }}
                    scroll={{ x: 820 }}
                />
            </Card>
            <Card
                title="Catatan Anggaran"
                extra={canManageBudget ? <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={save}>Simpan</Button> : null}
            >
                {locked ? <LockedProgramAlert section="Catatan anggaran" /> : null}
                <Form layout="vertical" form={form} disabled={!canManageBudget || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label="Estimasi Anggaran" name="estimated_budget" rules={[{ required: true, message: "Estimasi wajib diisi." }]}>
                            <InputNumber min={0} className="w-full" disabled={items.length > 0} formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label="Realisasi Anggaran" name="realized_budget" rules={[{ required: true, message: "Realisasi wajib diisi." }]}>
                            <InputNumber min={0} className="w-full" disabled={items.length > 0} formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label="Sumber Anggaran" name="budget_source">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Catatan Perubahan" name="internal_notes">
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                    {items.length > 0 ? (
                        <div className="text-xs text-zinc-500">
                            Estimasi dan realisasi dihitung otomatis dari rincian anggaran.
                        </div>
                    ) : null}
                </Form>
            </Card>
            <Modal
                title={editingItem ? "Edit Rincian Anggaran" : "Tambah Rincian Anggaran"}
                open={itemModalOpen}
                onCancel={() => {
                    if (saving) return;
                    setItemModalOpen(false);
                    setEditingItem(null);
                    itemForm.resetFields();
                }}
                onOk={saveItem}
                confirmLoading={saving}
                okText={editingItem ? "Simpan" : "Tambah"}
                cancelText="Batal"
                destroyOnHidden
            >
                <Form form={itemForm} layout="vertical">
                    <Form.Item label="Kategori" name="category">
                        <Select
                            allowClear
                            options={[
                                "Honorarium",
                                "Konsumsi",
                                "Tempat",
                                "Transportasi",
                                "Akomodasi",
                                "ATK",
                                "Dokumentasi",
                                "Publikasi",
                                "Lainnya",
                            ].map((value) => ({ value, label: value }))}
                        />
                    </Form.Item>
                    <Form.Item label="Komponen" name="description" rules={[{ required: true, message: "Komponen wajib diisi." }]}>
                        <Input maxLength={255} />
                    </Form.Item>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Form.Item label="Qty" name="quantity">
                            <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item label="Satuan" name="unit">
                            <Input maxLength={50} placeholder="orang/hari/paket" />
                        </Form.Item>
                        <Form.Item label="Harga Satuan" name="unit_cost">
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Form.Item label="Estimasi" name="estimated_amount" help="Jika dikosongkan di backend, dihitung dari qty x harga satuan.">
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label="Realisasi" name="realized_amount">
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                    </div>
                    <Form.Item label="Sumber Anggaran" name="budget_source">
                        <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item label="Catatan" name="notes">
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}

function DocumentsPanel({ program, permissions, onDocumentsLoaded }) {
    const [form] = Form.useForm();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [deleting, setDeleting] = useState(null);
    const locked = isProgramLocked(program);
    const canUpload = permissions.includes("work_program.upload_document") && !locked;

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(route("work-programs.documents.index", program.id));
            setDocuments(response.data.data || []);
            onDocumentsLoaded?.(response.data.data || []);
        } catch (error) {
            message.error(error.response?.data?.message || "Dokumen belum dapat dimuat.");
        } finally {
            setLoading(false);
        }
    }, [onDocumentsLoaded, program.id]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const upload = async () => {
        const values = await form.validateFields();
        if (!fileList[0]?.originFileObj) {
            message.error("Pilih file dokumen terlebih dahulu.");
            return;
        }
        const payload = new FormData();
        payload.append("title", values.title);
        payload.append("category", values.category);
        if (values.document_number) payload.append("document_number", values.document_number);
        if (values.document_date) payload.append("document_date", values.document_date.format("YYYY-MM-DD"));
        if (values.description) payload.append("description", values.description);
        payload.append("attachment", fileList[0].originFileObj);

        setUploading(true);
        try {
            await axios.post(route("work-programs.documents.store", program.id), payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            message.success("Dokumen berhasil diunggah.");
            form.resetFields();
            setFileList([]);
            fetchDocuments();
        } catch (error) {
            message.error(error.response?.data?.message || "Dokumen belum dapat diunggah.");
        } finally {
            setUploading(false);
        }
    };

    const remove = async () => {
        if (!deleting) return;
        try {
            await axios.delete(route("work-programs.documents.destroy", [program.id, deleting.id]));
            message.success("Dokumen berhasil dilepas.");
            setDeleting(null);
            fetchDocuments();
        } catch (error) {
            message.error(error.response?.data?.message || "Dokumen belum dapat dihapus.");
        }
    };

    const columns = [
        { title: "Judul", dataIndex: "title", render: (value, row) => <div><div className="font-semibold text-zinc-950">{value}</div><div className="text-xs text-zinc-500">{row.original_name}</div></div> },
        { title: "Kategori", dataIndex: "category", width: 150 },
        { title: "Nomor", dataIndex: "document_number", width: 150, render: (value) => value || "-" },
        { title: "Tanggal", dataIndex: "document_date", width: 130, render: formatDate },
        { title: "Diunggah", dataIndex: "created_at", width: 160, render: formatDateTime },
        {
            title: "Aksi",
            width: 140,
            align: "right",
            render: (_, row) => (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} href={row.preview_url} target="_blank" />
                    <Button size="small" icon={<DownloadOutlined />} href={row.download_url} />
                    {canUpload ? <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleting(row)} /> : null}
                </Space>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" className="w-full">
            {canUpload ? (
                <Card title="Upload Dokumen">
                    <Form layout="vertical" form={form}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Form.Item label="Judul" name="title" rules={[{ required: true, message: "Judul wajib diisi." }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Kategori" name="category" rules={[{ required: true, message: "Kategori wajib dipilih." }]}>
                                <Select options={DOCUMENT_CATEGORIES.map(([value, label]) => ({ value, label }))} />
                            </Form.Item>
                            <Form.Item label="Nomor Dokumen" name="document_number">
                                <Input />
                            </Form.Item>
                            <Form.Item label="Tanggal Dokumen" name="document_date">
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label="Deskripsi" name="description" className="md:col-span-2">
                                <TextArea rows={2} />
                            </Form.Item>
                            <Form.Item label="File" className="md:col-span-2">
                                <Upload
                                    fileList={fileList}
                                    maxCount={1}
                                    beforeUpload={() => false}
                                    onChange={({ fileList: next }) => setFileList(next)}
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                >
                                    <Button icon={<UploadOutlined />}>Pilih File</Button>
                                </Upload>
                            </Form.Item>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} loading={uploading} onClick={upload}>
                            Upload
                        </Button>
                    </Form>
                </Card>
            ) : null}
            <Card title="Dokumen Program">
                {locked ? <LockedProgramAlert section="Dokumen program" /> : null}
                <Table
                    columns={columns}
                    dataSource={documents}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 920 }}
                    locale={{ emptyText: <Empty description="Belum ada dokumen program." /> }}
                />
            </Card>
            <Modal
                title="Lepas dokumen?"
                open={Boolean(deleting)}
                onCancel={() => setDeleting(null)}
                onOk={remove}
                okText="Lepas"
                okButtonProps={{ danger: true }}
            >
                Dokumen <strong>{deleting?.title}</strong> akan dilepas dari program kerja.
            </Modal>
        </Space>
    );
}

function EvaluationPanel({ program, permissions, documents }) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const canEvaluate = permissions.includes("work_program.evaluate") && program.status === "completed";
    const evaluation = program.evaluation || {};

    useEffect(() => {
        form.setFieldsValue({
            ...evaluation,
            evaluated_at: evaluation.evaluated_at ? dayjs(evaluation.evaluated_at) : dayjs(),
        });
    }, [evaluation, form]);

    const save = async (markEvaluated = false) => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            await axios.post(route("work-programs.evaluation.upsert", program.id), cleanPayload({
                ...values,
                evaluated_at: values.evaluated_at?.format("YYYY-MM-DD HH:mm:ss"),
                mark_evaluated: markEvaluated,
            }));
            message.success(markEvaluated ? "Program berhasil ditandai evaluated." : "Evaluasi berhasil disimpan.");
        } catch (error) {
            message.error(error.response?.data?.message || "Evaluasi belum dapat disimpan.");
        } finally {
            setSaving(false);
        }
    };

    const documentOptions = documents
        .filter((document) => ["laporan", "evaluasi"].includes(document.category))
        .map((document) => ({ value: document.id, label: document.title }));

    return (
        <Card
            title="Evaluasi Program"
            extra={
                canEvaluate ? (
                    <Space>
                        <Button icon={<SaveOutlined />} loading={saving} onClick={() => save(false)}>Simpan</Button>
                        <Button type="primary" loading={saving} onClick={() => save(true)}>Tandai Evaluated</Button>
                    </Space>
                ) : null
            }
        >
            {!canEvaluate && !evaluation.id ? (
                <Empty description="Evaluasi belum tersedia." />
            ) : (
                <Form layout="vertical" form={form} disabled={!canEvaluate || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label="Capaian Tujuan" name="objective_achievement" rules={[{ required: true, message: "Capaian tujuan wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Capaian Indikator" name="indicator_result" rules={[{ required: true, message: "Capaian indikator wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Target vs Realisasi" name="target_vs_realization" rules={[{ required: true, message: "Target vs realisasi wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Evaluasi Waktu" name="time_evaluation" rules={[{ required: true, message: "Evaluasi waktu wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Evaluasi Anggaran" name="budget_result" rules={[{ required: true, message: "Evaluasi anggaran wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Ringkasan Hasil" name="result_summary" rules={[{ required: true, message: "Ringkasan hasil wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Kendala" name="constraints">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Faktor Pendukung" name="supporting_factors">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Faktor Penghambat" name="inhibiting_factors">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Lesson Learned" name="lessons_learned" rules={[{ required: true, message: "Lesson learned wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Rekomendasi" name="recommendations" rules={[{ required: true, message: "Rekomendasi wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Tindak Lanjut" name="follow_up" rules={[{ required: true, message: "Tindak lanjut wajib diisi." }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Dokumen Laporan" name="report_document_id">
                            <Select allowClear options={documentOptions} />
                        </Form.Item>
                        <Form.Item label="Tanggal Evaluasi" name="evaluated_at" rules={[{ required: true, message: "Tanggal evaluasi wajib diisi." }]}>
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                    </div>
                    {evaluation.evaluator ? (
                        <Descriptions className="mt-4" column={1} size="small" bordered>
                            <Descriptions.Item label="Evaluator">{evaluation.evaluator.name}</Descriptions.Item>
                            <Descriptions.Item label="Laporan">{evaluation.report_document?.title || "-"}</Descriptions.Item>
                        </Descriptions>
                    ) : null}
                </Form>
            )}
        </Card>
    );
}

export default function AdministrationPanel({ section, program, permissions = [], options = {}, onChanged }) {
    const [documents, setDocuments] = useState([...(program.documents || []), ...(program.task_documents || [])]);
    if (section === "budget") {
        return <BudgetPanel program={program} permissions={permissions} onChanged={onChanged} />;
    }
    if (section === "documents") {
        return <DocumentsPanel program={program} permissions={permissions} onDocumentsLoaded={setDocuments} />;
    }
    return <EvaluationPanel program={program} permissions={permissions} documents={documents} options={options} />;
}
