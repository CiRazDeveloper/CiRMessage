const ACTIVITY_STATUS = "activityStatus";

export const statusIcons = {
    Automatic: "/gray_circle.png",
    Online: "/green_circle.png",
    Away: "/yellow_circle.png",
    Offline: "/red_circle.png",
};

export function setStatus(status) {
    localStorage.setItem(ACTIVITY_STATUS, status);
}