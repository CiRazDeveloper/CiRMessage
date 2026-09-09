import { useMemo, useState } from "react";
import { getDisplayName, getUsername } from "../storage.js";
import { useStatus } from "../hooks/useStatus.js";
import {
    initialChats,
    searchableUsers,
    statusLabels,
} from "../data/homeData.js";
import "./../styles/home.css";

function Home() {
    const displayName = getDisplayName() || "User";
    const username = getUsername() || "user";

    const {
        statusMode,
        setStatusMode,
        currentStatus,
    } = useStatus();

    const [activePage, setActivePage] = useState("chats");
    const [chats, setChats] = useState(initialChats);
    const [selectedChatId, setSelectedChatId] = useState(1);
    const [chatSearch, setChatSearch] = useState("");
    const [globalSearch, setGlobalSearch] = useState("");
    const [message, setMessage] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);

    const selectedChat = chats.find((chat) => chat.id === selectedChatId);

    const filteredChats = useMemo(() => {
        const query = chatSearch.toLowerCase().replace("@", "");

        return chats.filter(
            (chat) =>
                chat.name.toLowerCase().includes(query) ||
                chat.username.toLowerCase().includes(query)
        );
    }, [chats, chatSearch]);

    const sendMessage = (event) => {
        event.preventDefault();

        if (!message.trim() || !selectedChat) return;

        setChats((currentChats) =>
            currentChats.map((chat) =>
                chat.id === selectedChat.id
                    ? {
                          ...chat,
                          message,
                          time: "Now",
                          messages: [
                              ...chat.messages,
                              {
                                  sender: "me",
                                  text: message,
                                  time: "Now",
                              },
                          ],
                      }
                    : chat
            )
        );

        setMessage("");
    };

    const matchingUsers = searchableUsers.filter((user) => {
        const query = globalSearch.trim().toLowerCase().replace(/^@/, "");

        return (
            query &&
            user.username.toLowerCase().includes(query)
        );
    });

    return (
        <main className="home dark-theme">
            <aside className="main-sidebar">
                <div className="brand">
                    <div className="brand-mark">CiRM</div>
                    <strong>CiRMessage</strong>
                </div>

                <nav className="main-nav" aria-label="Main navigation">
                    <button
                        className={activePage === "chats" ? "active" : ""}
                        onClick={() => setActivePage("chats")}
                    >
                        <span>▣</span> Chats
                    </button>

                    <button
                        className={activePage === "search" ? "active" : ""}
                        onClick={() => setActivePage("search")}
                    >
                        <span>⌕</span> Search users
                    </button>

                    <button
                        className={activePage === "settings" ? "active" : ""}
                        onClick={() => setActivePage("settings")}
                    >
                        <span>⚙</span> Settings
                    </button>
                </nav>

                <div className="profile-wrapper">
                    {profileOpen && (
                        <div className="profile-menu">
                            <button className="menu-item">Profile</button>

                            <div className="status-submenu">
                                <button className="menu-item status-trigger">
                                    <span>Status</span>
                                    <span>›</span>
                                </button>

                                <div className="status-options">
                                    {Object.keys(statusLabels).map((option) => (
                                        <button
                                            className="menu-item status-option"
                                            key={option}
                                            onClick={() => {
                                                setStatusMode(option);
                                                setProfileOpen(false);
                                            }}
                                        >
                                            <span>
                                                <i className={`status-dot ${option}`} />
                                                {statusLabels[option]}
                                            </span>
                                            {statusMode === option && <b>✓</b>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="menu-item danger">Log out</button>
                        </div>
                    )}

                    <button
                        className="profile-card"
                        onClick={() => setProfileOpen((open) => !open)}
                    >
                        <div className="avatar">{displayName.charAt(0)}</div>
                        <span>
                            <strong>{displayName}</strong>
                            <small>
                                <i className={`status-dot ${currentStatus}`} />
                                {statusLabels[currentStatus]}
                            </small>
                        </span>
                    </button>
                </div>
            </aside>

            {activePage === "chats" && (
                <>
                    <section className="chat-list-panel">
                        <header className="panel-header">
                            <div>
                                <span className="eyebrow">Messages</span>
                                <h1>Chats</h1>
                            </div>
                            <button className="new-chat">+</button>
                        </header>

                        <input
                            className="search-input"
                            value={chatSearch}
                            onChange={(event) => setChatSearch(event.target.value)}
                            placeholder="Search active chats"
                        />

                        <div className="chat-list">
                            {filteredChats.map((chat) => (
                                <button
                                    className={`chat-item ${
                                        selectedChatId === chat.id ? "selected" : ""
                                    }`}
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                >
                                    <div className="avatar">{chat.name.charAt(0)}</div>
                                    <div className="chat-info">
                                        <div>
                                            <strong>{chat.name}</strong>
                                            <small>{chat.time}</small>
                                        </div>
                                        <p>{chat.message}</p>
                                    </div>
                                    {chat.unread > 0 && (
                                        <b className="unread">{chat.unread}</b>
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="conversation-panel">
                        {selectedChat && (
                            <>
                                <header className="conversation-header">
                                    <div className="avatar">{selectedChat.name.charAt(0)}</div>
                                    <div>
                                        <h2>{selectedChat.name}</h2>
                                        <small>
                                            @{selectedChat.username} ·{" "}
                                            {selectedChat.status}
                                        </small>
                                    </div>
                                    <button className="more-button">•••</button>
                                </header>

                                <div className="message-list">
                                    {selectedChat.messages.map((item, index) => (
                                        <div
                                            className={`message ${
                                                item.sender === "me" ? "sent" : "received"
                                            }`}
                                            key={index}
                                        >
                                            <p>{item.text}</p>
                                            <small>{item.time}</small>
                                        </div>
                                    ))}
                                </div>

                                <form className="message-form" onSubmit={sendMessage}>
                                    <input
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        placeholder="Write a message..."
                                    />
                                    <button type="submit">Send</button>
                                </form>
                            </>
                        )}
                    </section>
                </>
            )}

            {activePage === "search" && (
                <section className="page-panel">
                    <span className="eyebrow">Discover</span>
                    <h1>Search users</h1>
                    <input
                        className="search-input wide"
                        value={globalSearch}
                        onChange={(event) => setGlobalSearch(event.target.value)}
                        placeholder="Search by username"
                    />
                    {globalSearch.trim() && (
                        <>
                            {matchingUsers.map((user) => (
                                <div className="search-result" key={user.username}>
                                    <div className="avatar">{user.initial}</div>

                                    <div>
                                        <strong>{user.name}</strong>
                                        <small>@{user.username}</small>
                                    </div>

                                    <button>Message</button>
                                </div>
                            ))}

                            {matchingUsers.length === 0 && (
                                <p className="empty-search">No users found.</p>
                            )}
                        </>
                    )}
                </section>
            )}

            {activePage === "settings" && (
                <section className="page-panel settings-page">
                    <span className="eyebrow">Account</span>
                    <h1>Settings</h1>

                    <div className="settings-card">
                        <h2>Settings</h2>
                        <p>Additional account settings will appear here.</p>
                    </div>
                </section>
            )}
        </main>
    );
}

export default Home;
