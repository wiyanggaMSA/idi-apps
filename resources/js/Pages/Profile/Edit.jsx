import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import PageShell from '@/Components/App/PageShell';
import PageHeader from '@/Components/App/PageHeader';
import FormSection from '@/Components/App/FormSection';
import { useI18n } from '@/Contexts/I18nContext';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    const { t } = useI18n();

    return (
        <AppLayout title={t('profile.pageTitle')}>
            <Head title={t('profile.pageTitle')} />
            <PageShell>
                <PageHeader
                    eyebrow={t('profile.eyebrow')}
                    title={t('profile.title')}
                    description={t('profile.description')}
                />

                <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <FormSection
                        title={t('profile.infoSectionTitle')}
                        description={t('profile.infoSectionDesc')}
                    >
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-none"
                        />
                    </FormSection>

                    <FormSection
                        title={t('profile.securitySectionTitle')}
                        description={t('profile.securitySectionDesc')}
                    >
                        <UpdatePasswordForm className="max-w-none" />
                    </FormSection>
                </div>

                <FormSection
                    title={t('profile.dangerZoneTitle')}
                    description={t('profile.dangerZoneDesc')}
                >
                    <DeleteUserForm className="max-w-none" />
                </FormSection>
            </PageShell>
        </AppLayout>
    );
}
