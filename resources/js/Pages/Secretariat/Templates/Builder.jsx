import React from "react";
import { usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import LetterGridBuilder from "@/Components/LetterGridBuilder";

export default function TemplateBuilder() {
    const { props } = usePage();
    const { template } = props;

    return (
        <AppLayout title="Sekretariat - Template Builder">
            <PageShell>
                <PageHeader title="Template Builder" />
                <LetterGridBuilder
                    entity={template}
                    saveRouteName="secretariat.templates.layout"
                    showPdf={false}
                />
            </PageShell>
        </AppLayout>
    );
}
