const USER = "authUser";
const IS_CHECKING_AUTH = "isCheckingAuth";

export function saveUser(user) {
    localStorage.setItem(USER, JSON.stringify(user));
}

export function getUser() {
    const user = localStorage.getItem(USER);

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch (error) {
        console.error("Invalid authUser in localStorage:", error);
        removeUser();
        return null;
    }
}

export function getDisplayName() {
    return getUser()?.displayName ?? null;
}

export function getUsername() {
    return getUser()?.username ?? null;
}

export function getEmail() {
    return getUser()?.email ?? null;
}

export function getProfilePicture() {
    return getUser()?.profilePicture ?? null;
}

export function removeUser() {
    localStorage.removeItem(USER);
}

export function getIsCheckingAuth() {
    const isCheckingAuth = localStorage.getItem(IS_CHECKING_AUTH);

    return isCheckingAuth ? JSON.parse(isCheckingAuth) : true;
}

export function setIsCheckingAuth(value) {
    localStorage.setItem(IS_CHECKING_AUTH, JSON.stringify(value));
}
