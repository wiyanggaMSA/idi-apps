import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@/Contexts/I18nContext';
import { App as AntdApp } from 'antd';

const appName = import.meta.env.VITE_APP_NAME || 'IDI Finance';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <I18nProvider>
                <AntdApp>
                    <App {...props} />
                </AntdApp>
            </I18nProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
