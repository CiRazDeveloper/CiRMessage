const ACTIVITY_STATUS = "activityStatus";

export const statuses = [
    "Online",
    "Away",
    "Offline",
];

export function setStatus(status) {
    localStorage.setItem(ACTIVITY_STATUS, status);
}