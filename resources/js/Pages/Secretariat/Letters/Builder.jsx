import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Switch,
    Typography,
} from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";

const { Text } = Typography;

const gridSize = 8;
const a4Size = { width: 794, height: 1123 };

const blockTemplates = {
    HeaderBlock: {
        type: "HeaderBlock",
        content: "<strong>{{org.name}}</strong><br/>{{org.address}}",
        w: 420,
        h: 80,
    },
    MetaBlock: {
        type: "MetaBlock",
        content: "Nomor: {{letter.number}}<br/>Tanggal: {{letter.date}}",
        w: 360,
        h: 80,
    },
    RecipientBlock: {
        type: "RecipientBlock",
        content: "Kepada Yth: {{recipient.name}}",
        w: 400,
        h: 80,
    },
    BodyBlock: {
        type: "BodyBlock",
        content: "Isi surat...",
        w: 520,
        h: 300,
    },
    SignatureBlock: {
        type: "SignatureBlock",
        content:
            "Hormat kami,<br/><strong>{{letter.signer_name}}</strong><br/>{{letter.signer_title}}<br/><img src='{{qr}}' width='120' />",
        w: 300,
        h: 160,
    },
    FooterBlock: {
        type: "FooterBlock",
        content: "Tembusan: {{letter.cc}}",
        w: 520,
        h: 80,
    },
};

const nextId = () => `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function LetterBuilder() {
    const { letter, templates = [], numberingProfiles = [], placeholders = [] } = usePage().props;
    const [blocks, setBlocks] = useState(letter?.content_blocks_json || []);
    const [selectedId, setSelectedId] = useState(blocks[0]?.id || null);
    const dragState = useRef(null);

    const { data, setData, post, patch, processing } = useForm({
        template_id: letter?.template_id || null,
        classification: letter?.classification || "",
        number: letter?.number || "",
        date: letter?.date || "",
        subject: letter?.subject || "",
        recipient_text: letter?.recipient_text || "",
        attachments_meta_json: letter?.attachments_meta_json || [],
        cc_text: letter?.cc_text || "",
        signer_name: letter?.signer_name || "",
        signer_title: letter?.signer_title || "",
        stamp_enabled: letter?.stamp_enabled || false,
        stamp_image_path: letter?.stamp_image_path || "",
        content_blocks_json: blocks,
        numbering_profile_id: null,
    });

    useEffect(() => {
        setData("content_blocks_json", blocks);
    }, [blocks, setData]);

    const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedId), [blocks, selectedId]);

    const addBlock = (type) => {
        const template = blockTemplates[type];
        if (!template) return;
        const newBlock = {
            id: nextId(),
            type: template.type,
            content: template.content,
            page: 1,
            x: 24,
            y: 24,
            w: template.w,
            h: template.h,
        };
        setBlocks((prev) => [...prev, newBlock]);
        setSelectedId(newBlock.id);
    };

    const updateBlock = (id, updates) => {
        setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
    };

    const startDrag = (block, event) => {
        event.preventDefault();
        setSelectedId(block.id);
        dragState.current = {
            id: block.id,
            startX: event.clientX,
            startY: event.clientY,
            originX: block.x,
            originY: block.y,
        };
        window.addEventListener("mousemove", onDrag);
        window.addEventListener("mouseup", stopDrag);
    };

    const onDrag = (event) => {
        if (!dragState.current) return;
        const { id, startX, startY, originX, originY } = dragState.current;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const nextX = Math.max(0, Math.round((originX + dx) / gridSize) * gridSize);
        const nextY = Math.max(0, Math.round((originY + dy) / gridSize) * gridSize);
        updateBlock(id, { x: nextX, y: nextY });
    };

    const stopDrag = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onDrag);
        window.removeEventListener("mouseup", stopDrag);
    };

    const onSaveDraft = () => {
        if (letter?.id) {
            patch(route("secretariat.letters.update", letter.id));
        } else {
            post(route("secretariat.letters.store"));
        }
    };

    const onFinalize = () => {
        if (!letter?.id) return;
        router.post(route("secretariat.letters.finalize", letter.id), data);
    };

    const appendPlaceholder = (value) => {
        if (!selectedBlock) return;
        updateBlock(selectedBlock.id, { content: `${selectedBlock.content} {{${value}}}` });
    };

    return (
        <AppLayout title="Sekretariat - Builder Surat">
            <PageShell>
                <PageHeader
                    title="Builder Surat"
                    right={
                        <Space>
                            <Button onClick={onSaveDraft} loading={processing}>
                                Simpan Draft
                            </Button>
                            <Button type="primary" onClick={onFinalize} disabled={!letter?.id}>
                                Finalize / Arsipkan
                            </Button>
                        </Space>
                    }
                />

                <Row gutter={[16, 16]}>
                    <Col span={5}>
                        <Card title="Blocks" style={{ borderRadius: 12 }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {Object.keys(blockTemplates).map((type) => (
                                    <Button key={type} onClick={() => addBlock(type)}>
                                        Tambah {type}
                                    </Button>
                                ))}
                            </Space>
                        </Card>

                        <Card title="Fields" style={{ borderRadius: 12, marginTop: 16 }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {placeholders.map((field) => (
                                    <Button key={field} onClick={() => appendPlaceholder(field)}>
                                        {field}
                                    </Button>
                                ))}
                            </Space>
                        </Card>
                    </Col>

                    <Col span={13}>
                        <Card title="Canvas A4" style={{ borderRadius: 12 }}>
                            <div
                                style={{
                                    width: a4Size.width,
                                    height: a4Size.height,
                                    border: "1px solid #d9d9d9",
                                    margin: "0 auto",
                                    position: "relative",
                                    backgroundImage:
                                        "linear-gradient(0deg, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                                    backgroundSize: `${gridSize}px ${gridSize}px`,
                                }}
                            >
                                {blocks.map((block) => (
                                    <div
                                        key={block.id}
                                        role="button"
                                        tabIndex={0}
                                        onMouseDown={(event) => startDrag(block, event)}
                                        onClick={() => setSelectedId(block.id)}
                                        style={{
                                            position: "absolute",
                                            left: block.x,
                                            top: block.y,
                                            width: block.w,
                                            height: block.h,
                                            border: block.id === selectedId ? "2px solid #1677ff" : "1px dashed #d9d9d9",
                                            padding: 8,
                                            background: "#fff",
                                            overflow: "hidden",
                                            cursor: "move",
                                        }}
                                    >
                                        <div dangerouslySetInnerHTML={{ __html: block.content }} />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>

                    <Col span={6}>
                        <Card title="Metadata" style={{ borderRadius: 12 }}>
                            <Form layout="vertical">
                                <Form.Item label="Template">
                                    <Select
                                        value={data.template_id}
                                        onChange={(value) => setData("template_id", value)}
                                        options={templates.map((t) => ({ label: t.name, value: t.id }))}
                                        allowClear
                                    />
                                </Form.Item>
                                <Form.Item label="Klasifikasi">
                                    <Input
                                        value={data.classification}
                                        onChange={(event) => setData("classification", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Nomor Surat">
                                    <Input
                                        value={data.number}
                                        onChange={(event) => setData("number", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Profil Penomoran">
                                    <Select
                                        value={data.numbering_profile_id}
                                        onChange={(value) => setData("numbering_profile_id", value)}
                                        options={numberingProfiles.map((profile) => ({
                                            label: profile.name,
                                            value: profile.id,
                                        }))}
                                        allowClear
                                    />
                                </Form.Item>
                                <Form.Item label="Tanggal">
                                    <Input
                                        type="date"
                                        value={data.date}
                                        onChange={(event) => setData("date", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Perihal">
                                    <Input
                                        value={data.subject}
                                        onChange={(event) => setData("subject", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Kepada">
                                    <Input.TextArea
                                        value={data.recipient_text}
                                        onChange={(event) => setData("recipient_text", event.target.value)}
                                        rows={3}
                                    />
                                </Form.Item>
                                <Form.Item label="Tembusan">
                                    <Input.TextArea
                                        value={data.cc_text}
                                        onChange={(event) => setData("cc_text", event.target.value)}
                                        rows={2}
                                    />
                                </Form.Item>
                                <Form.Item label="Nama Penandatangan">
                                    <Input
                                        value={data.signer_name}
                                        onChange={(event) => setData("signer_name", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Jabatan Penandatangan">
                                    <Input
                                        value={data.signer_title}
                                        onChange={(event) => setData("signer_title", event.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Stamp">
                                    <Space>
                                        <Switch
                                            checked={data.stamp_enabled}
                                            onChange={(value) => setData("stamp_enabled", value)}
                                        />
                                        <Input
                                            placeholder="Path stamp image"
                                            value={data.stamp_image_path}
                                            onChange={(event) => setData("stamp_image_path", event.target.value)}
                                        />
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Card>

                        <Card title="Block Properties" style={{ borderRadius: 12, marginTop: 16 }}>
                            {selectedBlock ? (
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    <Text type="secondary">{selectedBlock.type}</Text>
                                    <Input.TextArea
                                        rows={4}
                                        value={selectedBlock.content}
                                        onChange={(event) =>
                                            updateBlock(selectedBlock.id, { content: event.target.value })
                                        }
                                    />
                                    <Row gutter={8}>
                                        <Col span={12}>
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                value={selectedBlock.w}
                                                onChange={(value) => updateBlock(selectedBlock.id, { w: value })}
                                                placeholder="Width"
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                value={selectedBlock.h}
                                                onChange={(value) => updateBlock(selectedBlock.id, { h: value })}
                                                placeholder="Height"
                                            />
                                        </Col>
                                    </Row>
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        value={selectedBlock.page || 1}
                                        onChange={(value) => updateBlock(selectedBlock.id, { page: value || 1 })}
                                        placeholder="Halaman"
                                    />
                                    <Row gutter={8}>
                                        <Col span={12}>
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                value={selectedBlock.x}
                                                onChange={(value) => updateBlock(selectedBlock.id, { x: value })}
                                                placeholder="X"
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <InputNumber
                                                style={{ width: "100%" }}
                                                value={selectedBlock.y}
                                                onChange={(value) => updateBlock(selectedBlock.id, { y: value })}
                                                placeholder="Y"
                                            />
                                        </Col>
                                    </Row>
                                </Space>
                            ) : (
                                <Text type="secondary">Pilih blok untuk mengubah properti.</Text>
                            )}
                        </Card>
                    </Col>
                </Row>
            </PageShell>
        </AppLayout>
    );
}