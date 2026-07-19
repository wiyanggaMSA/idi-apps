export const ORGANIZATION_DATA_CHANGED = "organization:data-changed";

export function notifyOrganizationDataChanged(periodId) {
    window.dispatchEvent(new CustomEvent(ORGANIZATION_DATA_CHANGED, {
        detail: { periodId: Number(periodId) },
    }));
}
