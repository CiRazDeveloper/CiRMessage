
import "./../styles/home.css";

import { useMemo, useState } from "react";
import { getDisplayName, getUsername } from "../storage.js";
import { useStatus } from "../hooks/useStatus.js";
import {
    initialChats,
    searchableUsers,
    statusLabels,
} from "../data/homeData.js";

function Home() {
    const displayName = getDisplayName();
    const username = getUsername();

    const {
        statusMode,
        setStatusMode,
        currentStatus,
    } = useStatus();

    const [activePage, setActivePage] = useState("chats");
    const [profileOpen, setProfileOpen] = useState(false);

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
                            <small>
                                <i className={`status-dot ${currentStatus}`} />
                                {statusLabels[currentStatus]}
                            </small>
                        </span>
                    </button>

                    {profileOpen && (
                        <div className="profile-menu">
                            <button className="menu-item">Profile</button>

                            <div className="status-submenu">
                                <button className="menu-item status-trigger">
                                    <span>Status</span>
                                    <span className="status-arrow"></span>
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

                            <button className="menu-item log-out">Log Out</button>
                        </div>
                    )}


                </div>
            </aside>


        </div>


    );
}

export default Home;
