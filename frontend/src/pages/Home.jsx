import "./../styles/home.css";
import "./../styles/switchButton.css";

import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { socket } from "../scripts/lib/socket.js";
import { getDisplayName, getUser } from "./../storage.js";
import { setStatus, statuses } from "./../scripts/setStatus.js";
import StatusDot from "./../components/StatusDot.jsx";
import SwitchButton from "../components/SwitchButton.jsx";
import TextInput from "../components/TextInput.jsx";
import { useNotification } from "../components/NotificationContext.js";

function Home() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const displayName = getDisplayName();
    const currentUser = getUser();

    // GENERAL
    const [activePage, setActivePage] = useState("chats");
    // SEARCH
    const [userSearch, setUserSearch] = useState("");
    const [contacts, setContacts] = useState([]);
    // OTHERS STATUS
    const [userStatuses, setUserStatuses] = useState({});
    // --- PROFILE ---
    const [profileOpen, setProfileOpen] = useState(false);

    const [activityStatus, setActivityStatus] = useState(
        localStorage.getItem("activityStatus") || "Online"
    );

    const [presenceStatus, setPresenceStatus] = useState(
        localStorage.getItem("activityStatus") || "Online"
    );
    // --- CHATS ---
    const [chatSearch, setChatSearch] = useState("");
    const [chats, setChats] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    // --- SETTINGS ---
    const [isOn, setIsOn] = useState(false);
    


    // --- SEARCH ---
    const loadContacts = useCallback(async () => {
        try {
            const response =
                await axiosInstance.get(
                    "/messages/contacts"
                );

            setContacts(
                response.data
            );
        } catch (error) {
            console.error(
                "Could not load contacts:",
                error
            );
            showNotification(
                error.response?.data?.message ||
                    "Could not load contacts",
                "error"
            );
        }
    }, [showNotification]);

    const searchValue = userSearch
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    const foundUsers = searchValue? contacts.filter(contact =>
        contact.username?.toLowerCase().startsWith(searchValue)
    ) : [];


    // --- CHATS ---
    // LOAD
    const loadChats = useCallback(async () => {
        try {
            const response =
                await axiosInstance.get(
                    "/messages/chats"
                );

            setChats(response.data);

            const counts = {};

            response.data.forEach((user) => {
                counts[user._id] =
                    user.unreadCount || 0;
            });

            setUnreadCounts(counts);
        } catch (error) {
            console.error(
                "Could not load chats:",
                error
            );
            showNotification(
                error.response?.data?.message ||
                    "Could not load chats",
                "error"
            );
        }
    }, [showNotification]);

    // --- GENERAL ---
    useEffect(() => {
        const loadActivePage = async () => {
            if (activePage === "search") {
                console.log("Loading contacts...");
                await loadContacts();
            } else if (activePage === "chats") {
                console.log("Loading chats...");
                await loadChats();
            }
        };

        loadActivePage();
    }, [activePage, loadContacts, loadChats]);

    // OTHERS STATUS
    useEffect(() => {
        chats.forEach((user) => {
            socket.emit(
                "get-user-status",
                user._id,
                (response) => {
                    setUserStatuses((previous) => ({
                        ...previous,
                        [user._id]:
                        response?.status ||
                        "Offline",
                    }));
                }
            );
        });
        
        function handleStatusChanged({
            userId,
            status,
        }) {
            setUserStatuses((previous) => ({
                ...previous,
                [userId]: status,
            }));
        }
        
        socket.on(
            "user-status-changed",
            handleStatusChanged
        );
        
        return () => {
            socket.off(
                "user-status-changed",
                handleStatusChanged
            );
        };
    }, [chats, loadChats]);
    
    const chatSearchValue = chatSearch
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    const foundChats = chatSearchValue ? chats.filter(chat =>
            chat.username?.toLowerCase().startsWith(chatSearchValue) ||
            chat.displayName?.toLowerCase().includes(chatSearchValue)
    ) : chats;

    function handleClickToChat(user) {
        navigate(`/chat/${user._id}`, {
            state: { user }
        });
    }

    // UNREAD MESSAGES
    const totalUnreadMessages =
    Object.values(unreadCounts).reduce(
        (total, count) => total + count,
        0
    );

    function formatUnreadCount(count) {
        return count >= 99 ? "+99" : count;
    }

    // NEW MESSAGE
    useEffect(() => {
        function handleNewMessage(message) {
            const senderId =
                message.senderId?.toString();

            if (!senderId) {
                return;
            }

            const existingChat = chats.some(
                (chat) =>
                    chat._id.toString() ===
                    senderId
            );

            if (existingChat) {
                setUnreadCounts((previous) => ({
                    ...previous,
                    [senderId]:
                        (previous[senderId] || 0) + 1,
                }));

                return;
            }

            loadChats();
        }

        socket.on(
            "new-message",
            handleNewMessage
        );

        return () => {
            socket.off(
                "new-message",
                handleNewMessage
            );
        };
    }, [chats, loadChats]);
    

    
    // --- PROFILE ---
    // MY STATUS
    useEffect(() => {
        function applyStatus(status) {
            if (!statuses.includes(status)) {
                return;
            }

            setActivityStatus(status);
            setPresenceStatus(status);
            setStatus(status);
        }

        function requestCurrentStatus() {
            socket.emit(
                "get-my-status",
                (response) => {
                    applyStatus(response?.status);
                }
            );
        }

        function handleStatusChanged({
            userId,
            status,
        }) {
            if (
                userId?.toString() !==
                currentUser?._id?.toString()
            ) {
                return;
            }

            applyStatus(status);
        }

        socket.on(
            "connect",
            requestCurrentStatus
        );

        socket.on(
            "user-status-changed",
            handleStatusChanged
        );

        if (socket.connected) {
            requestCurrentStatus();
        }

        return () => {
            socket.off(
                "connect",
                requestCurrentStatus
            );

            socket.off(
                "user-status-changed",
                handleStatusChanged
            );
        };
    }, [currentUser?._id]);

    useEffect(() => {
        if (activityStatus !== "Online") {
            return;
        }

        const CHECK_INTERVAL_MS = 60 * 1000;
        const AWAY_AFTER_MS = 5 * 60 * 1000;

        let lastActivity = Date.now();
        let currentPresenceStatus = "Online";

        const changePresenceStatus = (status) => {
            if (currentPresenceStatus === status) {
                return;
            }

            currentPresenceStatus = status;

            setPresenceStatus(status);

            socket.emit(
                "set-status",
                status
            );
        };

        const handleActivity = () => {
            lastActivity = Date.now();

            if (
                currentPresenceStatus === "Away"
            ) {
                changePresenceStatus("Online");
            }
        };

        const checkActivity = () => {
            const inactiveFor =
                Date.now() - lastActivity;

            if (
                inactiveFor >= AWAY_AFTER_MS
            ) {
                changePresenceStatus("Away");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                return;
            }

            lastActivity = Date.now();

            if (
                currentPresenceStatus === "Away"
            ) {
                changePresenceStatus("Online");
            }
        };

        const activityEvents = [
            "mousedown",
            "keydown",
            "touchstart",
            "scroll",
        ];

        activityEvents.forEach((event) => {
            window.addEventListener(
                event,
                handleActivity
            );
        });

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        const activityCheckInterval =
            setInterval(
                checkActivity,
                CHECK_INTERVAL_MS
            );

        return () => {
            clearInterval(
                activityCheckInterval
            );

            activityEvents.forEach((event) => {
                window.removeEventListener(
                    event,
                    handleActivity
                );
            });

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [activityStatus]);

    const handleStatusChange = (status) => {
        console.log(
            "Manual status change:",
            status,
            typeof status
        );

        socket.emit(
            "set-status",
            status,
            (response) => {
                if (!response?.success) {
                    console.error(
                        "Could not change status:",
                        response?.message
                    );
                    showNotification(
                        response?.message ||
                            "Could not change status",
                        "error"
                    );

                    return;
                }

                setActivityStatus(status);
                setPresenceStatus(status);
                setStatus(status);

                console.log(
                    `Status changed to ${response.status}`
                );
                showNotification(
                    `Status changed to ${response.status}`,
                    "success",
                    {
                        dismiss: "automatic",
                    }
                );
            }
        );
    };


    // LOG OUT
    async function logOut (event) {
        event.preventDefault();
        
        try {
            const response = await axiosInstance.post("/auth/logout");
            
            console.log(response.data);
            
            if (response.status === 200) {
                socket.disconnect();
                showNotification(
                    "Logged out successfully",
                    "success",
                    {
                        dismiss: "automatic",
                    }
                );
                navigate("/login");
            }
        } catch (error) {
            console.error("Logout failed:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not log out",
                "error"
            );
        }
    }



    // --- SETTINGS ---
    const handlePrivateAccount = () => {
        const newValue = !isOn;

        setIsOn(newValue);
    };

    return (
        <div className="home-page">

            {/* LEFT SIDEBAR */}
            <aside className="left-sidebar">
                {/* BRAND */}
                <div className="brand">
                    <div className="brand-mark">CiRM</div>
                    <h1>CiRMessage</h1>
                </div>

                {/* NAVBAR */}
                <nav className="nav" aria-label="Navigation">
                    <button className={activePage === "chats" ? "active" : ""}
                            onClick={() => setActivePage("chats")}>
                        <span className="nav-icon">
                            ▣
                        </span>
                        <span className="nav-label">
                            Chats
                        </span>

                        {activePage !== "chats" &&
                            totalUnreadMessages > 0 && (
                                <span className="unread-badge">
                                    {formatUnreadCount(
                                        totalUnreadMessages
                                    )}
                                </span>
                            )}
                    </button>

                    <button className={activePage === "search" ? "active" : ""}
                            onClick={() => setActivePage("search")}>
                        <span className="nav-icon">
                        ⌕
                        </span>
                        <span className="nav-label">
                        Search
                        </span>
                    </button>
                        
                    <button
                        className={activePage === "settings" ? "active" : ""}
                        onClick={() => setActivePage("settings")}
                    >
                        <span className="nav-icon">
                        ⚙
                        </span>
                        <span className="nav-label">
                        Settings
                        </span>
                    </button>
                </nav>

                {/* PROFILE */}
                <div className="profile-wrapper">
                    <button
                        className="profile-card"
                        onClick={() =>
                            setProfileOpen((open) => !open)
                        }
                    >
                        <div className="avatar">
                            {displayName.charAt(0)}
                        </div>

                        <span>
                            <strong>{displayName}</strong>

                            <small className="activity-status">
                                Status:

                                <StatusDot
                                    status={presenceStatus}
                                />

                                {presenceStatus}
                            </small>
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="profile-menu">
                            <div className="status-submenu">
                                <button className="menu-item btn-status-trigger">
                                    <span>Status</span>
                                    <span className="status-arrow"></span>
                                </button>

                                <div className="status-options">
                                    {statuses.map((status) => (
                                        <button
                                            className="menu-item btn-status-option"
                                            key={status}
                                            onClick={() =>
                                                handleStatusChange(status)
                                            }
                                        >
                                            <StatusDot
                                                status={status}
                                            />

                                            <span>{status}</span>

                                            {activityStatus === status && (
                                                <span
                                                    className="status-check"
                                                    aria-label="Selected"
                                                >
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="menu-item btn-log-out"
                                onClick={logOut}
                            >
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* CHATS */}
            {activePage === "chats" && (
                <section className="chats-page">
                    <h1>Chats</h1>

                    <TextInput
                        type="text"
                        placeholder="Search chat"
                        value={chatSearch}
                        onChange={(event) => setChatSearch(event.target.value)}
                    />

                    <div className="chats-results">
                        {foundChats.map(user => (
                            <div
                                className="chats-user-card"
                                key={user._id}
                                onClick={() =>
                                    handleClickToChat(user)
                                }
                            >
                                <div className="chats-user-avatar-wrapper">
                                    {user.profilePicture ? (
                                        <img
                                            className="chats-user-avatar"
                                            src={user.profilePicture}
                                            alt={`${user.displayName} profile`}
                                        />
                                    ) : (
                                        <div className="chats-user-avatar chats-user-avatar-fallback">
                                            {user.displayName
                                                ?.charAt(0)
                                                .toUpperCase() || "?"}
                                        </div>
                                    )}

                                    <StatusDot
                                        status={
                                            userStatuses[user._id] ||
                                            "Offline"
                                        }
                                        className="chats-user-list-status-dot"
                                    />
                                </div>

                                <div className="chats-user-info">
                                    <span className="chats-user-display-name">
                                        {user.displayName}
                                    </span>

                                    <span className="chats-user-username">
                                        @{user.username}
                                    </span>
                                </div>

                                {(unreadCounts[user._id] || 0) > 0 && (
                                    <span className="unread-badge">
                                        {formatUnreadCount(
                                            unreadCounts[user._id]
                                        )}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEARCH */}
            {activePage === "search" && (
                <section className="search-page">
                    <h1>Search</h1>

                    <TextInput
                        type="text"
                        placeholder="Search for @username"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                    />

                    <div className="search-results">
                        {foundUsers.map(user => (
                            <div
                                className="search-user-card"
                                key={user._id}
                                onClick={() => handleClickToChat(user)}
                            >
                                {user.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={`${user.displayName} profile`}
                                        className="search-user-avatar"
                                    />
                                ) : (
                                    <div className="search-user-avatar search-user-avatar-fallback">
                                        {user.displayName?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                )}

                                <div className="search-user-info">
                                    <span className="search-user-display-name">
                                        {user.displayName}
                                    </span>

                                    <span className="search-user-username">
                                        @{user.username}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SETTINGS */}
            {activePage === "settings" && (
                <section className="settings-page">
                    <h1>Settings</h1>

                    <div className="settings-card account">
                        <h2>Nothing</h2>
                        <p>Nothing here yet.</p>
                        
                        <div className="settings-card privacy">
                            <span>Set Nothing</span>
                            <div className="switch-container">
                                <SwitchButton
                                    checked={isOn}
                                    onChange={handlePrivateAccount}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>


    );
}

export default Home;
