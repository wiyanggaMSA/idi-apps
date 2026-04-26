import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useI18n } from '@/Contexts/I18nContext';

export default function Login({ status, canResetPassword }) {
    const { t } = useI18n();
    const { orgProfile } = usePage().props;
    const orgName = orgProfile?.org_name || t('welcome.subtitle');
    const orgUnit = orgProfile?.org_unit || t('welcome.internalPortal');
    const logoUrl = orgProfile?.logo_url || null;
    const initials = orgName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title={t('auth.pageTitle', {}, t('welcome.internalPortal'))} />

            <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(220,38,38,0.42),transparent_45%),radial-gradient(circle_at_90%_100%,rgba(153,27,27,0.24),transparent_40%),linear-gradient(145deg,#08080a_0%,#111114_50%,#1a0d0f_100%)] px-6 py-10 text-zinc-100">
                <div className="mx-auto flex min-h-[86vh] w-full max-w-6xl items-center justify-center">
                    <section className="w-full max-w-md rounded-3xl border border-white/15 bg-black/38 p-8 text-zinc-100 shadow-[0_35px_120px_-55px_rgba(0,0,0,0.92)] backdrop-blur-md">
                        <div className="text-center">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={orgName}
                                    className="mx-auto h-16 w-16 rounded-2xl bg-white/95 object-contain p-1.5 shadow-[0_8px_30px_-16px_rgba(0,0,0,0.85)]"
                                />
                            ) : (
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-semibold text-white">
                                    {initials || 'IDI'}
                                </div>
                            )}
                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                                {orgUnit}
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">
                                {orgName}
                            </h2>
                            <p className="mt-3 text-sm text-zinc-300">
                                {t('auth.heroDescription', {}, 'Akses khusus untuk staf berwenang dalam pengelolaan keuangan dan administrasi organisasi.')}
                            </p>
                        </div>

                        {status && (
                            <div className="mt-5 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div>
                                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-200">
                                    {t('auth.emailLabel', {}, 'Email')}
                                </label>
                                <TextInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="block w-full rounded-xl border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-400"
                                    autoComplete="username"
                                    isFocused={true}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-zinc-200">
                                    {t('auth.passwordLabel', {}, 'Password')}
                                </label>
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="block w-full rounded-xl border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-zinc-400"
                                    autoComplete="current-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                        className="h-4 w-4 rounded border-white/25 bg-white/10 text-red-700 focus:ring-red-700"
                                    />
                                    {t('auth.rememberMe', {}, 'Remember me')}
                                </label>

                                {canResetPassword ? (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm font-medium text-zinc-300 underline underline-offset-4 transition hover:text-red-300 focus:outline-none"
                                    >
                                        {t('auth.forgotPassword', {}, 'Forgot your password?')}
                                    </Link>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-gradient-to-r from-red-700 via-red-700 to-red-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:from-red-800 hover:to-red-950 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {t('auth.login', {}, 'Log in')}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        </>
    );
}
