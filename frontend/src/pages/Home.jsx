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
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [creatingGroup, setCreatingGroup] = useState(false);
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

    const directChatUserIds = new Set(
        chats
            .filter((chat) => chat.type !== "group")
            .map((chat) => (chat.user?._id || chat._id).toString())
    );

    const groupContacts = contacts.filter((contact) =>
        directChatUserIds.has(contact._id.toString())
    );


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

            response.data.forEach((chat) => {
                counts[chat._id] =
                    chat.unreadCount || 0;
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
        chats.filter((chat) => chat.type !== "group").forEach((chat) => {
            socket.emit(
                "get-user-status",
                chat.user?._id || chat._id,
                (response) => {
                    setUserStatuses((previous) => ({
                        ...previous,
                        [chat.user?._id || chat._id]:
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
            (chat.type === "group"
                ? chat.name?.toLowerCase().includes(chatSearchValue)
                : chat.user?.username?.toLowerCase().startsWith(chatSearchValue) ||
                    chat.user?.displayName?.toLowerCase().includes(chatSearchValue) ||
                    chat.username?.toLowerCase().startsWith(chatSearchValue) ||
                    chat.displayName?.toLowerCase().includes(chatSearchValue))
    ) : chats;

    function handleClickToChat(chat) {
        const user = chat.type === "group" ? null : (chat.user || chat);

        navigate(`${chat.type === "group" ? "/group" : "/chat"}/${chat._id}`, {
            state: { user, group: chat.type === "group" ? chat : null }
        });
    }

    async function openGroupModal() {
        setGroupModalOpen(true);
        setGroupName("");
        setSelectedMemberIds([]);
        await Promise.all([
            loadChats(),
            loadContacts(),
        ]);
    }

    function toggleGroupMember(userId) {
        setSelectedMemberIds((previous) =>
            previous.includes(userId)
                ? previous.filter((id) => id !== userId)
                : [...previous, userId]
        );
    }

    async function createGroup(event) {
        event.preventDefault();

        if (!groupName.trim() || selectedMemberIds.length === 0) {
            showNotification(
                "Enter a group name and select at least one member",
                "info"
            );
            return;
        }

        setCreatingGroup(true);

        try {
            const response = await axiosInstance.post(
                "/groups",
                {
                    name: groupName.trim(),
                    memberIds: selectedMemberIds,
                }
            );

            setGroupModalOpen(false);
            await loadChats();
            handleClickToChat({
                ...response.data,
                type: "group",
            });
        } catch (error) {
            console.error("Could not create group:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not create group",
                "error"
            );
        } finally {
            setCreatingGroup(false);
        }
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

            const existingChat = message.groupId
                ? chats.find(
                    (chat) =>
                        chat.type === "group" &&
                        chat._id.toString() ===
                            message.groupId.toString()
                )
                : chats.find((chat) =>
                    chat.type === "group"
                        ? chat.members?.some(
                            (member) =>
                                member._id?.toString() === senderId ||
                                member.toString?.() === senderId
                        )
                        : (chat.user?._id || chat._id).toString() === senderId
                );

            if (existingChat) {
                setUnreadCounts((previous) => ({
                    ...previous,
                    [existingChat._id]:
                        (previous[existingChat._id] || 0) + 1,
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
        const applyStatus = (status) => {
            if (!statuses.includes(status)) {
                return;
            }

            setPresenceStatus(status);
        };

        const handleStatusChanged = ({ userId, status }) => {
            if (
                userId?.toString() ===
                currentUser?._id?.toString()
            ) {
                applyStatus(status);
            }
        };

        const handleManualStatusChanged = (event) => {
            const status = event.detail?.status;
            if (!statuses.includes(status)) {
                return;
            }

            setActivityStatus(status);
            setPresenceStatus(status);
        };

        socket.on(
            "user-status-changed",
            handleStatusChanged
        );
        window.addEventListener(
            "activity-status-changed",
            handleManualStatusChanged
        );

        return () => {
            socket.off(
                "user-status-changed",
                handleStatusChanged
            );
            window.removeEventListener(
                "activity-status-changed",
                handleManualStatusChanged
            );
        };
    }, [currentUser?._id]);

    const handleStatusChange = (status) => {
        if (!statuses.includes(status)) {
            return;
        }

        setActivityStatus(status);
        setPresenceStatus(status);
        setStatus(status);

        showNotification(
            `Status changed to ${status}`,
            "success",
            {
                dismiss: "automatic",
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
                    <div className="page-heading">
                        <h1>Chats</h1>
                        <button
                            type="button"
                            className="create-group-button"
                            onClick={openGroupModal}
                        >
                            New Group
                        </button>
                    </div>

                    <TextInput
                        type="text"
                        placeholder="Search chat"
                        value={chatSearch}
                        onChange={(event) => setChatSearch(event.target.value)}
                    />

                    <div className="chats-results">
                        {foundChats.map(chat => {
                            const isGroup = chat.type === "group";
                            const user = chat.user || chat;

                            return (
                            <div
                                className="chats-user-card"
                                key={chat._id}
                                onClick={() =>
                                    handleClickToChat(chat)
                                }
                            >
                                <div className="chats-user-avatar-wrapper">
                                    {!isGroup && user.profilePicture ? (
                                        <img
                                            className="chats-user-avatar"
                                            src={user.profilePicture}
                                            alt={`${user.displayName} profile`}
                                        />
                                    ) : (
                                        <div className="chats-user-avatar chats-user-avatar-fallback">
                                            {(isGroup ? chat.name : user.displayName)
                                                ?.charAt(0)
                                                .toUpperCase() || "?"}
                                        </div>
                                    )}

                                    {!isGroup && (
                                        <StatusDot
                                            status={
                                                userStatuses[user._id] ||
                                                "Offline"
                                            }
                                            className="chats-user-list-status-dot"
                                        />
                                    )}
                                </div>

                                <div className="chats-user-info">
                                    <span className="chats-user-display-name">
                                        {isGroup ? chat.name : user.displayName}
                                    </span>

                                    <span className="chats-user-username">
                                        {isGroup
                                            ? `${chat.members?.length || 0} members`
                                            : `@${user.username}`}
                                    </span>
                                </div>

                                {(unreadCounts[chat._id] || 0) > 0 && (
                                    <span className="unread-badge">
                                        {formatUnreadCount(
                                            unreadCounts[chat._id]
                                        )}
                                    </span>
                                )}
                            </div>
                            );
                        })}
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

            {groupModalOpen && (
                <div className="group-modal-backdrop">
                    <form className="group-modal" onSubmit={createGroup}>
                        <h2>Create group</h2>

                        <TextInput
                            type="text"
                            placeholder="Group name"
                            value={groupName}
                            onChange={(event) =>
                                setGroupName(event.target.value)
                            }
                        />

                        <div className="group-member-list">
                            {groupContacts.map((contact) => (
                                <label
                                    className="group-member-option"
                                    key={contact._id}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedMemberIds.includes(
                                            contact._id
                                        )}
                                        onChange={() =>
                                            toggleGroupMember(contact._id)
                                        }
                                    />
                                    <span>
                                        {contact.displayName} @{contact.username}
                                    </span>
                                </label>
                            ))}

                            {groupContacts.length === 0 && (
                                <span>
                                    Only users from your existing chats can
                                    be added to a group.
                                </span>
                            )}
                        </div>

                        <div className="group-modal-actions">
                            <button
                                type="button"
                                onClick={() => setGroupModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button type="submit" disabled={creatingGroup}>
                                {creatingGroup ? "Creating..." : "Create group"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>


    );
}

export default Home;
