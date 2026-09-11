import "./../styles/home.css";
import "./../styles/switch_button.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { socket } from "../scripts/lib/socket.js";
import { getDisplayName } from "./../storage.js";
import { setStatus, statusIcons } from "./../scripts/setStatus.js";

import SwitchButton from "./../components/Switch_Button.jsx";

function Home() {
    const navigate = useNavigate();

    const displayName = getDisplayName();

    // General
    const [activePage, setActivePage] = useState("chats");

    useEffect(() => {        
        if (activePage === "search") {
            console.log("Loading contacts...");
    
            async function loadContacts() {
                try {
                    const response = await axiosInstance.get("/messages/contacts");
                    setContacts(response.data);
                } catch (error) {
                    console.error("Could not load contacts: ", error);
                }
            }
    
            loadContacts();
        } else if (activePage === "chats") {
            console.log("Loading chats...");

            async function loadChats() {
                try {
                    const response = await axiosInstance.get("/messages/chats");
                    setChats(response.data);
                } catch (error) {
                    console.error("Could not load chats: ", error);
                }
            }

            loadChats();
        }
    }, [activePage]);

    // Search
    const [userSearch, setUserSearch] = useState("");
    const [contacts, setContacts] = useState([]);

    const searchValue = userSearch
        .trim()
        .replace(/^@/, "")
        .toLowerCase();

    const foundUsers = searchValue? contacts.filter(contact =>
        contact.username?.toLowerCase().startsWith(searchValue)
    ) : [];

    // Chats
    const [chatSearch, setChatSearch] = useState("");
    const [chats, setChats] = useState([]);

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

    // Profile
    const [profileOpen, setProfileOpen] = useState(false);

    const [activityStatus, setActivityStatus] = useState(
        localStorage.getItem("activityStatus") || "Online"
    );

    const handleStatusChange = (status) => {
        socket.emit(
            "set-status",
            (response) => {
                if (!response?.success) {
                    console.error(
                        "Could not change status:",
                        response?.message
                    );

                    return;
                }

                setActivityStatus(status);
                setStatus(status);

                console.log(
                    `Status changed to ${response.status}`
                );
            }
        );
    };

    useEffect(() => {
        if (activityStatus !== "Online") {
            return;
        }

        const CHECK_INTERVAL_MS = 60 * 1000;
        const AWAY_AFTER_MS = 5 * 60 * 1000;

        let lastActivity = Date.now();
        let currentPresenceStatus = "online";

        const setPresenceStatus = (status) => {
            if (currentPresenceStatus === status) {
                return;
            }

            currentPresenceStatus = status;

            socket.emit("set-status", status);
        };

        const handleActivity = () => {
            lastActivity = Date.now();

            if (currentPresenceStatus === "away") {
                setPresenceStatus("online");
            }
        };

        const checkActivity = () => {
            const inactiveFor =
                Date.now() - lastActivity;

            if (inactiveFor >= AWAY_AFTER_MS) {
                setPresenceStatus("away");
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                return;
            }

            lastActivity = Date.now();

            if (currentPresenceStatus === "away") {
                setPresenceStatus("online");
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

        socket.emit("set-status", "online");

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

    // Log Out
    async function logOut (event) {
        event.preventDefault();

        try {
            const response = await axiosInstance.post("/auth/logout");

            console.log(response.data);

            if (response.status === 200) {
                socket.disconnect();
                navigate("/login");
            }
        } catch (error) {
            
        }
    }

    // Settings
    const [isOn, setIsOn] = useState(false);
    const handlePrivateAccount = () => {
        const newValue = !isOn;

        setIsOn(newValue);

        if (newValue) {
            console.log("Account is now private");
        } else {
            console.log("Account is now public");
        }
    };

    return (
        <div className="home-container">

            {/* LEFT SIDEBAR */}
            <aside className="left-sidebar">
                {/* BRAND */}
                <div className="brand">
                    <div className="brand-mark">CiRM</div>
                    <h1>CiRMessage</h1>
                </div>

                {/* NAVBAR */}
                <nav className="left-sidebar-nav" aria-label="Navigation">
                    <button className={activePage === "chats" ? "active" : ""}
                            onClick={() => setActivePage("chats")}>
                        <span>▣</span> Chats
                    </button>

                    <button className={activePage === "search" ? "active" : ""}
                            onClick={() => setActivePage("search")}>
                        <span>⌕</span> Search
                    </button>
                        
                    <button
                        className={activePage === "settings" ? "active" : ""}
                        onClick={() => setActivePage("settings")}
                    >
                        <span>⚙</span> Settings
                    </button>
                </nav>

                {/* PROFILE */}
                <div className="profile-wrapper">
                    <button
                        className="profile-card"
                        onClick={() => setProfileOpen((open) => !open)}
                    >
                        <div className="avatar">
                            {displayName.charAt(0)}

                            <img
                                src={statusIcons[activityStatus]}
                                alt=""
                                className="avatar-status-icon"
                            />
                        </div>
                        <span>
                            <strong>{displayName}</strong>
                            <small className="activity-status">
                                Status: 
                                <img
                                    src={statusIcons[activityStatus]}
                                    alt=""
                                    className="status-icon"
                                />
                                {activityStatus}
                            </small>
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="profile-menu">
                            <button className="menu-item btn-profile">Profile</button>

                            <div className="status-submenu">
                                <button className="menu-item btn-status-trigger">
                                    <span>Status</span>
                                    <span className="status-arrow"></span>
                                </button>

                                <div className="status-options">
                                    {Object.keys(statusIcons).map((status) => (
                                        <button
                                            className="menu-item btn-status-option"
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                        >
                                            <img
                                                src={statusIcons[status]}
                                                alt=""
                                                className="status-icon"
                                            />

                                            <span>{status}</span>

                                            {activityStatus === status && (
                                                <span className="status-check" aria-label="Selected">
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="menu-item btn-log-out" onClick={logOut}>Log Out</button>
                        </div>
                    )}
                </div>
            </aside>

            {/* CHATS */}
            {activePage === "chats" && (
                <section className="chats-page">
                    <h1>Chats</h1>

                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Search chat"
                            value={chatSearch}
                            onChange={(event) => setChatSearch(event.target.value)}
                        />
                    </div>

                    <div className="chats-results">
                        {foundChats.map(user => (
                            <div
                                className="chats-user-card"
                                key={user._id}
                                onClick={() => handleClickToChat(user)}
                            >
                                {user.profilePicture ? (
                                    <img
                                        className="chats-user-avatar"
                                        src={user.profilePicture}
                                        alt={`${user.displayName} profile`}
                                    />
                                ) : (
                                    <div className="chats-user-avatar chats-user-avatar-fallback">
                                        {user.displayName?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                )}

                                <div className="chats-user-info">
                                    <span className="chats-display-name">
                                        {user.displayName}
                                    </span>

                                    <span className="chats-user-username">
                                        @{user.username}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SEARCH */}
            {activePage === "search" && (
                <section className="search-page">
                    <h1>Search</h1>

                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Search for @username"
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                        />
                    </div>

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
                        <h2>Account</h2>
                        <p>Additional account settings will appear here.</p>
                        
                        <div className="settings-card privacy">
                            <span>Set Private</span>
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
