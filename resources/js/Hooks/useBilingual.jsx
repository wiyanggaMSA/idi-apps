import { useCallback } from "react";
import { useI18n } from "@/Contexts/I18nContext";

/**
 * Lightweight bilingual copy helper for feature-level UI text.
 *
 * Keep backend values (routes, enum values, identifiers) outside this helper;
 * only pass text that is rendered for the user.
 */
export default function useBilingual() {
    const { language } = useI18n();
    const isEnglish = language === "en";
    const tx = useCallback((indonesian, english) => (isEnglish ? english : indonesian), [isEnglish]);

    return { language, isEnglish, tx };
}
