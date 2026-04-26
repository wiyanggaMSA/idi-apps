import React from "react";
import { Button, Card } from "antd";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import EmptyState from "@/Components/App/EmptyState";
import { useI18n } from "@/Contexts/I18nContext";

export default function ReportsExport() {
    const { t } = useI18n();
    return (
        <AppLayout title={t("reports.export.title")}>
            <PageShell>
                <PageHeader
                    eyebrow="Export Center"
                    title={t("reports.export.title")}
                    description={t("reports.export.description")}
                    extra={<Button type="primary">{t("common.exportPdf")}</Button>}
                />
                <Card>
                    <EmptyState
                        title={t("reports.export.emptyTitle")}
                        description={t("reports.export.emptyDesc")}
                    />
                </Card>
            </PageShell>
        </AppLayout>
    );
}
