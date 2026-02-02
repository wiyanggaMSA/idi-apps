import React from "react";
import { usePage } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";
import PageShell from "@/Components/App/PageShell";
import PageHeader from "@/Components/App/PageHeader";
import LetterGridBuilder from "@/Components/LetterGridBuilder";

export default function GridBuilder() {
    const { props } = usePage();
    const { letter, signerMembers } = props;

    return (
        <AppLayout title="Sekretariat - Surat Grid Builder">
            <PageShell>
                <PageHeader title="Surat Grid Builder" />
                <LetterGridBuilder letter={letter} signerMembers={signerMembers} />
            </PageShell>
        </AppLayout>
    );
}
