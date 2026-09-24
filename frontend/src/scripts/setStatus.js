const ACTIVITY_STATUS = "activityStatus";

export const statuses = [
    "Online",
    "Away",
    "Offline",
];

export function setStatus(status) {
    localStorage.setItem(ACTIVITY_STATUS, status);

    window.dispatchEvent(
        new CustomEvent("activity-status-changed", {
            detail: { status },
        })
    );
}