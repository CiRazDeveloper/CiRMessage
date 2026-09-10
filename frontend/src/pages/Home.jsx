import "./../styles/home.css";

import { useState } from "react";
import { getDisplayName, getUsername } from "./../storage.js";
import { setStatus, statusIcons } from "./../scripts/setStatus.js";

function Home() {
    const displayName = getDisplayName();
    const username = getUsername();

    // General
    const [activePage, setActivePage] = useState("chats");
    const [profileOpen, setProfileOpen] = useState(false);

    // Searches
    const [globalSearch, setGlobalSearch] = useState("");
    const [chatSearch, setChatSearch] = useState("");
    
    // Chats
    const [message, sendMessage] = useState("");

    // Profile
    const [activityStatus, setActivityStatus] = useState(
        localStorage.getItem("activityStatus") || "Automatic"
    );

    const handleStatusChange = (status) => {
        setActivityStatus(status);
        setStatus(status);
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
                        <span>⌕</span> Search Users
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
                        <div className="avatar">{displayName.charAt(0)}</div>
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

                            <button className="menu-item btn-log-out">Log Out</button>
                        </div>
                    )}
                </div>
            </aside>

            {activePage === "chats" && (
                <>
                    <section className="chat-list-panel">
                        <header className="panel-header">
                            <div>
                                <h1>Chats</h1>
                            </div>
                        </header>

                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder="Search active chats"
                                value={chatSearch}
                                onChange={(event) => setChatSearch(event.target.value)}
                            />
                        </div>

                        <div className="chat-list">
                            
                        </div>
                    </section>

                    <section className="conversation-panel">
                        <h1>Conversation</h1>
                    </section>
                </>
            )}

            {activePage === "search" && (
                <section className="search-page">
                    <h1>Search</h1>

                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder="Search for @Username"
                            value={globalSearch}
                            onChange={(event) => setGlobalSearch(event.target.value)}
                        />
                    </div>
                </section>

            )}

            {activePage === "settings" && (
                <section className="settings-page">
                    <h1>Settings</h1>

                    <div className="settings-card">
                        <h2>Settings</h2>
                        <p>Additional account settings will appear here.</p>
                    </div>
                </section>
            )}
        </div>


    );
}

export default Home;
