import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import idID from "antd/locale/id_ID";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/id";
import { messages } from "@/i18n/messages";

const STORAGE_KEY = "idi.locale";
const I18nContext = createContext(null);

function getInitialLanguage() {
    if (typeof window === "undefined") return "id";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "id";
}

function resolvePath(object, path) {
    return path.split(".").reduce((accumulator, part) => accumulator?.[part], object);
}

export function I18nProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.lang = language;
        dayjs.locale(language === "en" ? "en" : "id");
    }, [language]);

    const t = useCallback(
        (key, replacements = {}, fallback = key) => {
            const template =
                resolvePath(messages[language], key) ??
                resolvePath(messages.id, key) ??
                fallback;

            if (typeof template !== "string") return template ?? fallback;

            return Object.entries(replacements).reduce(
                (result, [replacementKey, value]) =>
                    result.replaceAll(`{${replacementKey}}`, String(value)),
                template,
            );
        },
        [language],
    );

    const toggleLanguage = useCallback(() => {
        setLanguage((current) => (current === "id" ? "en" : "id"));
    }, []);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            toggleLanguage,
            t,
        }),
        [language, setLanguage, toggleLanguage, t],
    );

    const theme = useMemo(
        () => ({
            token: {
                colorPrimary: "#b91c1c",
                colorInfo: "#b91c1c",
                colorLink: "#b91c1c",
                colorLinkHover: "#991b1b",
                colorLinkActive: "#7f1d1d",
                colorError: "#dc2626",
                colorWarning: "#d97706",
                borderRadius: 16,
                controlOutline: "rgba(185, 28, 28, 0.18)",
                controlOutlineWidth: 0,
            },
            components: {
                Input: {
                    activeBorderColor: "#b91c1c",
                    hoverBorderColor: "#a1a1aa",
                    activeShadow: "none",
                },
                InputNumber: {
                    activeBorderColor: "#b91c1c",
                    hoverBorderColor: "#a1a1aa",
                    activeShadow: "none",
                },
                Select: {
                    activeBorderColor: "#b91c1c",
                    hoverBorderColor: "#a1a1aa",
                    activeOutlineColor: "rgba(185, 28, 28, 0.14)",
                    optionSelectedBg: "#fef2f2",
                    optionActiveBg: "#fff1f2",
                },
                DatePicker: {
                    activeBorderColor: "#b91c1c",
                    hoverBorderColor: "#a1a1aa",
                    activeShadow: "none",
                    cellActiveWithRangeBg: "#b91c1c",
                    cellHoverWithRangeBg: "#fff1f2",
                },
                Button: {
                    primaryShadow: "none",
                    dangerShadow: "none",
                },
                Pagination: {
                    itemActiveBg: "#fff7f7",
                    colorPrimary: "#b91c1c",
                    colorPrimaryHover: "#991b1b",
                },
            },
        }),
        [],
    );

    return (
        <I18nContext.Provider value={value}>
            <ConfigProvider locale={language === "en" ? enUS : idID} theme={theme}>
                {children}
            </ConfigProvider>
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider.");
    }

    return context;
}
