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
import useBilingual from "@/Hooks/useBilingual";

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
    const { tx } = useBilingual();
    return (
        <Alert
            className="mb-4"
            type="info"
            showIcon
            title={tx("Program kerja sudah dikunci", "The work program is locked")}
            description={tx(
                `${section} tidak dapat diubah setelah program selesai. Jika perlu revisi, minta ketua/reviewer membuka revisi program terlebih dahulu.`,
                `${section} cannot be changed after the program is completed. If a revision is needed, ask the chair or reviewer to open a program revision first.`,
            )}
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
    const { tx } = useBilingual();
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
            message.success(tx("Anggaran berhasil diperbarui.", "Budget updated successfully."));
            onChanged?.();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Anggaran belum dapat disimpan.", "The budget could not be saved."));
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
            message.success(editingItem ? tx("Rincian anggaran berhasil diperbarui.", "Budget item updated successfully.") : tx("Rincian anggaran berhasil ditambahkan.", "Budget item added successfully."));
            setItemModalOpen(false);
            setEditingItem(null);
            itemForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Rincian anggaran belum dapat disimpan.", "The budget item could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (item) => {
        setSaving(true);
        try {
            const response = await axios.delete(route("work-programs.budget-items.destroy", [program.id, item.id]));
            syncBudgetResponse(response);
            message.success(tx("Rincian anggaran berhasil dihapus.", "Budget item removed successfully."));
        } catch (error) {
            message.error(error.response?.data?.message || tx("Rincian anggaran belum dapat dihapus.", "The budget item could not be removed."));
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
            title: tx("Komponen", "Item"),
            dataIndex: "description",
            render: (value, row) => (
                <div>
                    <div className="font-semibold text-zinc-950">{value}</div>
                    <div className="text-xs text-zinc-500">
                        {[row.category, row.budget_source].filter(Boolean).join(" · ") || tx("Tanpa kategori", "Uncategorized")}
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
            title: tx("Harga Satuan", "Unit Price"),
            width: 160,
            render: (_, row) => formatIDR(row.unit_cost || 0),
        },
        {
            title: tx("Estimasi", "Estimate"),
            width: 160,
            render: (_, row) => formatIDR(row.estimated_amount || 0),
        },
        {
            title: tx("Realisasi", "Actual"),
            width: 160,
            render: (_, row) => formatIDR(row.realized_amount || 0),
        },
        {
            title: "",
            width: 160,
            render: (_, row) =>
                canManageBudget ? (
                    <Space>
                        <Button size="small" onClick={() => openItemModal(row)}>{tx("Edit", "Edit")}</Button>
                        <Popconfirm
                            title={tx("Hapus rincian anggaran?", "Remove budget item?")}
                            okText={tx("Hapus", "Remove")}
                            cancelText={tx("Batal", "Cancel")}
                            onConfirm={() => deleteItem(row)}
                        >
                            <Button size="small" danger>{tx("Hapus", "Remove")}</Button>
                        </Popconfirm>
                    </Space>
                ) : null,
        },
    ];

    return (
        <Space orientation="vertical" size="middle" className="w-full">
            <div className="grid gap-4 md:grid-cols-3">
                <Card><Statistic title={tx("Estimasi", "Estimate")} value={displayEstimated} formatter={(value) => formatIDR(value)} /></Card>
                <Card><Statistic title={tx("Realisasi", "Actual")} value={displayRealized} formatter={(value) => formatIDR(value)} /></Card>
                <Card><Statistic title={tx("Sisa", "Remaining")} value={remaining} formatter={(value) => formatIDR(value)} /></Card>
            </div>
            <Card
                title={tx("Rincian Anggaran", "Budget Items")}
                extra={canManageBudget ? <Button type="primary" icon={<PlusOutlined />} onClick={() => openItemModal()}>{tx("Tambah Rincian", "Add Item")}</Button> : null}
            >
                {locked ? <LockedProgramAlert section={tx("Anggaran", "Budget")} /> : null}
                <Table
                    columns={budgetColumns}
                    dataSource={items}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: tx("Belum ada rincian anggaran.", "No budget items yet.") }}
                    scroll={{ x: 820 }}
                />
            </Card>
            <Card
                title={tx("Catatan Anggaran", "Budget Notes")}
                extra={canManageBudget ? <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={save}>{tx("Simpan", "Save")}</Button> : null}
            >
                {locked ? <LockedProgramAlert section={tx("Catatan anggaran", "Budget notes")} /> : null}
                <Form layout="vertical" form={form} disabled={!canManageBudget || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label={tx("Estimasi Anggaran", "Estimated Budget")} name="estimated_budget" rules={[{ required: true, message: tx("Estimasi wajib diisi.", "Estimate is required.") }]}>
                            <InputNumber min={0} className="w-full" disabled={items.length > 0} formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label={tx("Realisasi Anggaran", "Actual Budget")} name="realized_budget" rules={[{ required: true, message: tx("Realisasi wajib diisi.", "Actual amount is required.") }]}>
                            <InputNumber min={0} className="w-full" disabled={items.length > 0} formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label={tx("Sumber Anggaran", "Budget Source")} name="budget_source">
                            <Input />
                        </Form.Item>
                        <Form.Item label={tx("Catatan Perubahan", "Change Notes")} name="internal_notes">
                            <TextArea rows={3} />
                        </Form.Item>
                    </div>
                    {items.length > 0 ? (
                        <div className="text-xs text-zinc-500">
                            {tx("Estimasi dan realisasi dihitung otomatis dari rincian anggaran.", "Estimated and actual amounts are calculated automatically from budget items.")}
                        </div>
                    ) : null}
                </Form>
            </Card>
            <Modal
                title={editingItem ? tx("Edit Rincian Anggaran", "Edit Budget Item") : tx("Tambah Rincian Anggaran", "Add Budget Item")}
                open={itemModalOpen}
                onCancel={() => {
                    if (saving) return;
                    setItemModalOpen(false);
                    setEditingItem(null);
                    itemForm.resetFields();
                }}
                onOk={saveItem}
                confirmLoading={saving}
                okText={editingItem ? tx("Simpan", "Save") : tx("Tambah", "Add")}
                cancelText={tx("Batal", "Cancel")}
                destroyOnHidden
            >
                <Form form={itemForm} layout="vertical">
                    <Form.Item label={tx("Kategori", "Category")} name="category">
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
                    <Form.Item label={tx("Komponen", "Item")} name="description" rules={[{ required: true, message: tx("Komponen wajib diisi.", "Item is required.") }]}>
                        <Input maxLength={255} />
                    </Form.Item>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Form.Item label="Qty" name="quantity">
                            <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item label={tx("Satuan", "Unit")} name="unit">
                            <Input maxLength={50} placeholder={tx("orang/hari/paket", "person/day/package")} />
                        </Form.Item>
                        <Form.Item label={tx("Harga Satuan", "Unit Price")} name="unit_cost">
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Form.Item label={tx("Estimasi", "Estimate")} name="estimated_amount" help={tx("Jika dikosongkan di backend, dihitung dari qty x harga satuan.", "If left empty, it is calculated from quantity × unit price.")}>
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                        <Form.Item label={tx("Realisasi", "Actual")} name="realized_amount">
                            <InputNumber min={0} className="w-full" formatter={(value) => formatIDR(value)} parser={(value) => value?.replace(/[^\d]/g, "")} />
                        </Form.Item>
                    </div>
                    <Form.Item label={tx("Sumber Anggaran", "Budget Source")} name="budget_source">
                        <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item label={tx("Catatan", "Notes")} name="notes">
                        <TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}

function DocumentsPanel({ program, permissions, onDocumentsLoaded }) {
    const { tx } = useBilingual();
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
            message.error(error.response?.data?.message || tx("Dokumen belum dapat dimuat.", "Documents could not be loaded."));
        } finally {
            setLoading(false);
        }
    }, [onDocumentsLoaded, program.id, tx]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const upload = async () => {
        const values = await form.validateFields();
        if (!fileList[0]?.originFileObj) {
            message.error(tx("Pilih file dokumen terlebih dahulu.", "Select a document file first."));
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
            message.success(tx("Dokumen berhasil diunggah.", "Document uploaded successfully."));
            form.resetFields();
            setFileList([]);
            fetchDocuments();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Dokumen belum dapat diunggah.", "The document could not be uploaded."));
        } finally {
            setUploading(false);
        }
    };

    const remove = async () => {
        if (!deleting) return;
        try {
            await axios.delete(route("work-programs.documents.destroy", [program.id, deleting.id]));
            message.success(tx("Dokumen berhasil dilepas.", "Document detached successfully."));
            setDeleting(null);
            fetchDocuments();
        } catch (error) {
            message.error(error.response?.data?.message || tx("Dokumen belum dapat dihapus.", "The document could not be removed."));
        }
    };

    const columns = [
        { title: tx("Judul", "Title"), dataIndex: "title", render: (value, row) => <div><div className="font-semibold text-zinc-950">{value}</div><div className="text-xs text-zinc-500">{row.original_name}</div></div> },
        { title: tx("Kategori", "Category"), dataIndex: "category", width: 150 },
        { title: tx("Nomor", "Number"), dataIndex: "document_number", width: 150, render: (value) => value || "-" },
        { title: tx("Tanggal", "Date"), dataIndex: "document_date", width: 130, render: formatDate },
        { title: tx("Diunggah", "Uploaded"), dataIndex: "created_at", width: 160, render: formatDateTime },
        {
            title: tx("Aksi", "Actions"),
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
                <Card title={tx("Upload Dokumen", "Upload Document")}>
                    <Form layout="vertical" form={form}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Form.Item label={tx("Judul", "Title")} name="title" rules={[{ required: true, message: tx("Judul wajib diisi.", "Title is required.") }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label={tx("Kategori", "Category")} name="category" rules={[{ required: true, message: tx("Kategori wajib dipilih.", "Category is required.") }]}>
                                <Select options={DOCUMENT_CATEGORIES.map(([value, label]) => ({ value, label }))} />
                            </Form.Item>
                            <Form.Item label={tx("Nomor Dokumen", "Document Number")} name="document_number">
                                <Input />
                            </Form.Item>
                            <Form.Item label={tx("Tanggal Dokumen", "Document Date")} name="document_date">
                                <DatePicker className="w-full" />
                            </Form.Item>
                            <Form.Item label={tx("Deskripsi", "Description")} name="description" className="md:col-span-2">
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
                                    <Button icon={<UploadOutlined />}>{tx("Pilih File", "Choose File")}</Button>
                                </Upload>
                            </Form.Item>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} loading={uploading} onClick={upload}>
                            Upload
                        </Button>
                    </Form>
                </Card>
            ) : null}
            <Card title={tx("Dokumen Program", "Program Documents")}>
                {locked ? <LockedProgramAlert section={tx("Dokumen program", "Program documents")} /> : null}
                <Table
                    columns={columns}
                    dataSource={documents}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 920 }}
                    locale={{ emptyText: <Empty description={tx("Belum ada dokumen program.", "No program documents yet.")} /> }}
                />
            </Card>
            <Modal
                title={tx("Lepas dokumen?", "Detach document?")}
                open={Boolean(deleting)}
                onCancel={() => setDeleting(null)}
                onOk={remove}
                okText={tx("Lepas", "Detach")}
                okButtonProps={{ danger: true }}
            >
                {tx("Dokumen", "Document")} <strong>{deleting?.title}</strong> {tx("akan dilepas dari program kerja.", "will be detached from the work program.")}
            </Modal>
        </Space>
    );
}

function EvaluationPanel({ program, permissions, documents }) {
    const { tx } = useBilingual();
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
            message.success(markEvaluated ? tx("Program berhasil ditandai evaluated.", "Program marked as evaluated.") : tx("Evaluasi berhasil disimpan.", "Evaluation saved successfully."));
        } catch (error) {
            message.error(error.response?.data?.message || tx("Evaluasi belum dapat disimpan.", "The evaluation could not be saved."));
        } finally {
            setSaving(false);
        }
    };

    const documentOptions = documents
        .filter((document) => ["laporan", "evaluasi"].includes(document.category))
        .map((document) => ({ value: document.id, label: document.title }));

    return (
        <Card
            title={tx("Evaluasi Program", "Program Evaluation")}
            extra={
                canEvaluate ? (
                    <Space>
                        <Button icon={<SaveOutlined />} loading={saving} onClick={() => save(false)}>{tx("Simpan", "Save")}</Button>
                        <Button type="primary" loading={saving} onClick={() => save(true)}>{tx("Tandai Evaluated", "Mark as Evaluated")}</Button>
                    </Space>
                ) : null
            }
        >
            {!canEvaluate && !evaluation.id ? (
                <Empty description={tx("Evaluasi belum tersedia.", "Evaluation is not available yet.")} />
            ) : (
                <Form layout="vertical" form={form} disabled={!canEvaluate || saving}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Form.Item label={tx("Capaian Tujuan", "Objective Achievement")} name="objective_achievement" rules={[{ required: true, message: tx("Capaian tujuan wajib diisi.", "Objective achievement is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Capaian Indikator", "Indicator Achievement")} name="indicator_result" rules={[{ required: true, message: tx("Capaian indikator wajib diisi.", "Indicator achievement is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Target vs Realisasi", "Target vs Actual")} name="target_vs_realization" rules={[{ required: true, message: tx("Target vs realisasi wajib diisi.", "Target vs actual is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Evaluasi Waktu", "Time Evaluation")} name="time_evaluation" rules={[{ required: true, message: tx("Evaluasi waktu wajib diisi.", "Time evaluation is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Evaluasi Anggaran", "Budget Evaluation")} name="budget_result" rules={[{ required: true, message: tx("Evaluasi anggaran wajib diisi.", "Budget evaluation is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Ringkasan Hasil", "Results Summary")} name="result_summary" rules={[{ required: true, message: tx("Ringkasan hasil wajib diisi.", "Results summary is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Kendala", "Constraints")} name="constraints">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Faktor Pendukung", "Supporting Factors")} name="supporting_factors">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Faktor Penghambat", "Inhibiting Factors")} name="inhibiting_factors">
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label="Lessons Learned" name="lessons_learned" rules={[{ required: true, message: tx("Lesson learned wajib diisi.", "Lessons learned are required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Rekomendasi", "Recommendations")} name="recommendations" rules={[{ required: true, message: tx("Rekomendasi wajib diisi.", "Recommendations are required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Tindak Lanjut", "Follow-up")} name="follow_up" rules={[{ required: true, message: tx("Tindak lanjut wajib diisi.", "Follow-up is required.") }]}>
                            <TextArea rows={3} />
                        </Form.Item>
                        <Form.Item label={tx("Dokumen Laporan", "Report Document")} name="report_document_id">
                            <Select allowClear options={documentOptions} />
                        </Form.Item>
                        <Form.Item label={tx("Tanggal Evaluasi", "Evaluation Date")} name="evaluated_at" rules={[{ required: true, message: tx("Tanggal evaluasi wajib diisi.", "Evaluation date is required.") }]}>
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                    </div>
                    {evaluation.evaluator ? (
                        <Descriptions className="mt-4" column={1} size="small" bordered>
                            <Descriptions.Item label="Evaluator">{evaluation.evaluator.name}</Descriptions.Item>
                            <Descriptions.Item label={tx("Laporan", "Report")}>{evaluation.report_document?.title || "-"}</Descriptions.Item>
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
