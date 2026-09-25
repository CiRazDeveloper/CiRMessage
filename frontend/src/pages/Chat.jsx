import "./../styles/chat.css";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { socket } from "../scripts/lib/socket.js";
import { getUser } from "../storage.js";
import StatusDot from "./../components/StatusDot.jsx";
import { useNotification } from "../components/NotificationContext.js";
import {
    getMaxMediaSize,
    prepareMediaForUpload,
} from "../scripts/media.js";
import { useWebRTCCall } from "../hooks/useWebRTCCall.js";
import CallPanel, {
    CallControlButton,
} from "../components/CallPanel.jsx";
import GifPicker from "../components/GifPicker.jsx";

function Chat() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const location = useLocation();
    const { id } = useParams();

    const routeUser =
        location.state?.user ||
        location.state?.incomingCall?.caller ||
        null;
    const currentUser = getUser();
    const [loadedUser, setLoadedUser] = useState(null);
    const user =
        routeUser && loadedUser
            ? { ...loadedUser, ...routeUser }
            : routeUser || loadedUser;
    const [loadedGroup, setLoadedGroup] = useState(
        location.state?.group || null
    );
    const group = loadedGroup;
    const isGroup = Boolean(location.state?.group) ||
        location.pathname.startsWith("/group/");
    
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [chatPartnerStatus, setChatPartnerStatus] = useState("Offline");
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedGif, setSelectedGif] = useState(null);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [gifPickerOpen, setGifPickerOpen] = useState(false);
    const [groupMembersOpen, setGroupMembersOpen] = useState(false);
    const [inviteCandidates, setInviteCandidates] = useState([]);
    const [groupActionBusy, setGroupActionBusy] = useState("");
    const messagesEndRef = useRef(null);
    const mediaInputRef = useRef(null);
    const gifInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const deliveredMessageIdsRef = useRef(new Set());
    const latestSeenAtRef = useRef(null);
    const callParticipants = isGroup
        ? (group?.members || [])
        : (user ? [user] : []);
    const call = useWebRTCCall({
        targetId: id,
        isGroup,
        participants: callParticipants,
        currentUser,
        enabled: Boolean(id),
        initialIncomingCall: location.state?.incomingCall || null,
    });

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, []);

    const refreshGroup = useCallback(async () => {
        if (!isGroup || !id) {
            return null;
        }

        const response = await axiosInstance.get(
            `/groups/${id}`
        );

        setLoadedGroup(response.data);
        return response.data;
    }, [id, isGroup]);

    useEffect(() => {
        if (!isGroup) {
            return;
        }

        refreshGroup().catch((error) => {
            console.error("Could not load group:", error);
            showNotification(
                error.response?.data?.message ||
                    "Could not load group",
                "error"
            );
        });
    }, [isGroup, refreshGroup, showNotification]);

    const currentUserId =
        currentUser?._id?.toString() || "";

    const creatorId =
        group?.createdBy?._id?.toString() ||
        group?.createdBy?.toString() ||
        "";

    const adminIds = new Set([
        creatorId,
        ...(group?.admins || [])
            .map(
                (admin) =>
                    admin?._id?.toString() ||
                    admin?.toString()
            )
            .filter(Boolean),
    ]);

    const currentUserIsGroupOwner =
        isGroup &&
        creatorId === currentUserId;

    const currentUserIsGroupAdmin =
        isGroup &&
        adminIds.has(currentUserId);

    const isAdminMember = (member) =>
        adminIds.has(
            member?._id?.toString() ||
                member?.toString()
        );

    async function loadInviteCandidates(
        currentGroup = group
    ) {
        try {
            const response = await axiosInstance.get(
                "/messages/chats"
            );

            const memberIds = new Set(
                (currentGroup?.members || []).map(
                    (member) =>
                        member?._id?.toString() ||
                        member?.toString()
                )
            );

            const candidates = response.data
                .filter(
                    (chat) =>
                        chat.type !== "group" &&
                        !memberIds.has(
                            (
                                chat.user?._id ||
                                chat._id
                            )?.toString()
                        )
                )
                .map((chat) => chat.user || chat);

            setInviteCandidates(candidates);
        } catch (error) {
            console.error(
                "Could not load invite candidates:",
                error
            );
            setInviteCandidates([]);
        }
    }

    async function openGroupMembers() {
        if (!isGroup) {
            return;
        }

        setGroupMembersOpen(true);

        try {
            const freshGroup = await refreshGroup();

            await loadInviteCandidates(
                freshGroup || group
            );
        } catch {
            // refreshGroup already surfaces load errors elsewhere.
        }
    }

    async function inviteGroupMember(memberId) {
        setGroupActionBusy(`invite:${memberId}`);

        try {
            const response = await axiosInstance.post(
                `/groups/${id}/members`,
                { memberId }
            );

            setLoadedGroup(response.data);
            setInviteCandidates((current) =>
                current.filter(
                    (user) =>
                        user._id?.toString() !==
                        memberId.toString()
                )
            );

            showNotification(
                "Member added to the group",
                "success",
                { dismiss: "automatic" }
            );
        } catch (error) {
            showNotification(
                error.response?.data?.message ||
                    "Could not add member",
                "error"
            );
        } finally {
            setGroupActionBusy("");
        }
    }

    async function promoteGroupMember(memberId) {
        setGroupActionBusy(`promote:${memberId}`);

        try {
            const response = await axiosInstance.post(
                `/groups/${id}/admins/${memberId}/promote`
            );

            setLoadedGroup(response.data);

            showNotification(
                "Member promoted to group admin",
                "success",
                { dismiss: "automatic" }
            );
        } catch (error) {
            showNotification(
                error.response?.data?.message ||
                    "Could not promote member",
                "error"
            );
        } finally {
            setGroupActionBusy("");
        }
    }

    async function removeGroupMember(member) {
        const memberId = member?._id?.toString();
        if (!memberId) {
            return;
        }

        const confirmed = window.confirm(
            `Remove ${member.displayName || member.username || "this member"} from the group?`
        );

        if (!confirmed) {
            return;
        }

        setGroupActionBusy(`remove:${memberId}`);

        try {
            const response = await axiosInstance.post(
                `/groups/${id}/members/${memberId}/remove`
            );

            setLoadedGroup(response.data);

            showNotification(
                "Member removed from the group",
                "success",
                { dismiss: "automatic" }
            );

            await loadInviteCandidates(response.data);
        } catch (error) {
            showNotification(
                error.response?.data?.message ||
                    "Could not remove member",
                "error"
            );
        } finally {
            setGroupActionBusy("");
        }
    }


    // --- DIRECT CHAT USER ---
    useEffect(() => {
        if (!id || isGroup) {
            setLoadedUser(null);
            return;
        }

        const routeUserId =
            routeUser?._id?.toString() ||
            routeUser?.id?.toString();

        if (
            routeUserId === id &&
            routeUser?.displayName &&
            routeUser?.username
        ) {
            setLoadedUser(null);
            return;
        }

        let cancelled = false;

        async function loadChatUser() {
            try {
                const response = await axiosInstance.get(
                    "/messages/contacts"
                );

                const foundUser = response.data.find(
                    (contact) =>
                        contact?._id?.toString() === id
                );

                if (!cancelled) {
                    setLoadedUser(foundUser || null);
                }
            } catch (error) {
                console.error(
                    "Could not load chat user:",
                    error
                );

                if (!cancelled) {
                    setLoadedUser(null);
                }
            }
        }

        loadChatUser();

        return () => {
            cancelled = true;
        };
    }, [
        id,
        isGroup,
        routeUser?._id,
        routeUser?.id,
        routeUser?.displayName,
        routeUser?.username,
    ]);

    // --- PROFILE PICTURE ---
    useEffect(() => {
        let profileUrl;

        async function loadProfilePicture() {
            if (isGroup) {
                setProfilePictureUrl(null);
                return;
            }

            try {
                const response = await axiosInstance.get(
                    `/profile/get/${id}`,
                    {
                        responseType: "blob",
                    }
                );

                if (
                    response.status === 204 ||
                    !response.data ||
                    response.data.size === 0
                ) {
                    setProfilePictureUrl(null);
                    return;
                }

                profileUrl = URL.createObjectURL(
                    response.data
                );

                setProfilePictureUrl(profileUrl);
            } catch (error) {
                console.error(
                    "Could not load profile picture:",
                    error
                );

                setProfilePictureUrl(null);
                showNotification(
                    error.response?.data?.message ||
                        "Could not load profile picture",
                    "error"
                );
            }
        }

        loadProfilePicture();

        return () => {
            if (profileUrl) {
                URL.revokeObjectURL(profileUrl);
            }
        };
    }, [id, isGroup, showNotification]);

    // --- STATUS ---
    useEffect(() => {
        if (!id || isGroup) {
            return undefined;
        }

        let cancelled = false;

        const requestStatus = () => {
            if (!socket.connected) {
                return;
            }

            socket.emit(
                "get-user-status",
                id,
                (response) => {
                    if (cancelled) {
                        return;
                    }

                    setChatPartnerStatus(
                        response?.status || "Offline"
                    );
                }
            );
        };

        function handleStatusChanged({
            userId,
            status,
        }) {
            if (
                userId?.toString() ===
                id?.toString()
            ) {
                setChatPartnerStatus(
                    status || "Offline"
                );
            }
        }

        socket.on("connect", requestStatus);
        socket.on(
            "user-status-changed",
            handleStatusChanged
        );

        requestStatus();

        return () => {
            cancelled = true;
            socket.off("connect", requestStatus);
            socket.off(
                "user-status-changed",
                handleStatusChanged
            );
        };
    }, [id, isGroup]);

    // --- MESSAGES AND IMAGES ---

    // AUTO RELOAD
    useEffect(() => {
        const mediaUrls = [];

        async function handleNewMessage(message) {
            const belongsToChat = isGroup
                ? message.groupId?.toString() === id
                : message.senderId?.toString() === id;

            const isSentByCurrentUser =
                message.senderId?.toString() ===
                currentUser?._id?.toString();

            if (
                !belongsToChat ||
                message.isMine ||
                (isGroup && isSentByCurrentUser)
            ) {
                return;
            }

            socket.emit(
                isGroup ? "group-message-read" : "message-read",
                isGroup ? id : message.senderId
            );

            let receivedMessage = {
                ...message,
                isMine: false,
                read: true,
            };

            if (message.media) {
                try {
                    const mediaResponse =
                        await axiosInstance.get(
                            `/media/message/${message._id}`,
                            {
                                responseType: "blob",
                            }
                        );

                    const mediaUrl =
                        URL.createObjectURL(
                            mediaResponse.data
                        );

                    mediaUrls.push(mediaUrl);

                    receivedMessage = {
                        ...receivedMessage,
                        mediaUrl,
                    };
                } catch (error) {
                    console.error(
                        "Could not load received message media:",
                        error
                    );
                }
            }

            setMessages((previousMessages) => {
                const alreadyExists =
                    previousMessages.some(
                        (existingMessage) =>
                            existingMessage._id ===
                            receivedMessage._id
                    );

                if (alreadyExists) {
                    return previousMessages;
                }

                return [
                    ...previousMessages,
                    receivedMessage,
                ].sort(
                    (left, right) =>
                        new Date(left.createdAt) -
                        new Date(right.createdAt)
                );
            });
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

            mediaUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [currentUser?._id, id, isGroup]);

    // LOAD
    useEffect(() => {
        let mediaUrls = [];

        async function loadMessages() {
            try {
                const response = await axiosInstance.get(
                    isGroup
                        ? `/groups/${id}/messages`
                        : `/messages/${id}`
                );

                const loadedMessages =
                    await Promise.all(
                        response.data.map(
                            async (message) => {
                                if (!message.media) {
                                    return message;
                                }

                                try {
                                    const mediaResponse =
                                        await axiosInstance.get(
                                            `/media/message/${message._id}`,
                                            {
                                                responseType:
                                                    "blob",
                                            }
                                        );

                                    const mediaUrl =
                                        URL.createObjectURL(
                                            mediaResponse.data
                                        );

                                    mediaUrls.push(
                                        mediaUrl
                                    );

                                    return {
                                        ...message,
                                        mediaUrl,
                                    };
                                } catch (error) {
                                    console.error(
                                        `Could not load message media ${message._id}:`,
                                        error
                                    );

                                    return message;
                                }
                            }
                        )
                    );

                setMessages(
                    loadedMessages.sort(
                        (left, right) =>
                            new Date(left.createdAt) -
                            new Date(right.createdAt)
                    )
                );

                socket.emit(
                    isGroup ? "group-message-read" : "message-read",
                    id
                );
            } catch (error) {
                console.error(
                    "Could not load messages:",
                    error
                );
                showNotification(
                    error.response?.data?.message ||
                        "Could not load messages",
                    "error"
                );
            }
        }

        loadMessages();

        return () => {
            mediaUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [id, isGroup, showNotification]);

    // SCROLL TO THE BOTTOM
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    function handleSelectedFile(file, inputElement = null) {
        if (!file) {
            setSelectedMedia(null);
            return;
        }

        if (file.size > getMaxMediaSize()) {
            setSelectedMedia(null);

            if (inputElement) {
                inputElement.value = "";
            }

            showNotification(
                `Media files must be ${getMaxMediaSize() / (1024 * 1024)} MB or smaller`,
                "error"
            );
            return;
        }

        setSelectedGif(null);
        setSelectedMedia(file);
        setAttachmentMenuOpen(false);
    }

    function handleGifSelected(gif) {
        if (!gif?.downloadUrl || !gif?.id) {
            showNotification(
                "Could not select that GIF. Please choose another one.",
                "error"
            );
            return;
        }

        setSelectedMedia(null);
        setSelectedGif({
            id: gif.id,
            title: gif.title || "GIF",
            url: gif.downloadUrl,
            previewUrl: gif.previewUrl || gif.downloadUrl,
        });
        setGifPickerOpen(false);
        setAttachmentMenuOpen(false);
    }

    // SEND MESSAGE
    async function handleSendMessage(event) {
        event.preventDefault();

        if (
            !messageText.trim() &&
            !selectedMedia &&
            !selectedGif
        ) {
            showNotification(
                "Enter a message or select media or a GIF",
                "info"
            );
            return;
        }

        try {
            const formData = new FormData();

            if (messageText.trim()) {
                formData.append(
                    "text",
                    messageText.trim()
                );
            }

            if (selectedMedia) {
                const mediaToUpload =
                    await prepareMediaForUpload(
                        selectedMedia
                    );

                formData.append(
                    "media",
                    mediaToUpload
                );
            }

            if (selectedGif) {
                formData.append(
                    "gifUrl",
                    selectedGif.url
                );
                formData.append(
                    "gifId",
                    selectedGif.id
                );
            }

            const response = await axiosInstance.post(
                isGroup
                    ? `/messages/groups/${id}`
                    : `/messages/send/${id}`,
                formData
            );

            const newMessage = response.data;

            if (
                deliveredMessageIdsRef.current.has(
                    newMessage._id
                )
            ) {
                newMessage.delivered = true;

                deliveredMessageIdsRef.current.delete(
                    newMessage._id
                );
            }

            if (newMessage.media) {
                try {
                    const mediaResponse =
                        await axiosInstance.get(
                            `/media/message/${newMessage._id}`,
                            {
                                responseType: "blob",
                            }
                        );

                    newMessage.mediaUrl =
                        URL.createObjectURL(
                            mediaResponse.data
                        );
                } catch (error) {
                    console.error(
                        "Could not load sent media:",
                        error
                    );
                }
            }

            newMessage.isMine = true;

            setMessages((previousMessages) => {
                const withoutDuplicate =
                    previousMessages.filter(
                        (message) =>
                            message._id !== newMessage._id
                    );

                return [
                    ...withoutDuplicate,
                    newMessage,
                ].sort(
                    (left, right) =>
                        new Date(left.createdAt) -
                        new Date(right.createdAt)
                );
            });

            setMessageText("");
            setSelectedMedia(null);
            setSelectedGif(null);

            if (messageInputRef.current) {
                messageInputRef.current.style.height =
                    "auto";

                messageInputRef.current.style.overflowY =
                    "hidden";
            }
        } catch (error) {
            console.error(
                "Could not send message:",
                error
            );
            showNotification(
                (error.response?.status === 413
                    ? `Media file is too large. Please choose a file smaller than ${getMaxMediaSize() / (1024 * 1024)} MB.`
                    : error.response?.data?.message) ||
                    "Could not send message",
                "error"
            );
        }
    }

    // CHECK FOR DELIVERED
    useEffect(() => {
        function handleMessageDelivered({
            messageId,
        }) {
            deliveredMessageIdsRef.current.add(
                messageId
            );

            setMessages((previous) =>
                previous.map((message) => {
                    if (
                        message._id !== messageId
                    ) {
                        return message;
                    }

                    return {
                        ...message,
                        delivered: true,
                    };
                })
            );
        }

        socket.on(
            "message-delivered",
            handleMessageDelivered
        );

        return () => {
            socket.off(
                "message-delivered",
                handleMessageDelivered
            );
        };
    }, []);

    // CHECK FOR SEEN
    useEffect(() => {
        function handleMessageSeen({
            seenBy,
            seenAt,
        }) {
            if (seenBy !== id) {
                return;
            }

            latestSeenAtRef.current =
                seenAt;

            setMessages((previous) =>
                previous.map((message) => {
                    if (!message.isMine) {
                        return message;
                    }

                    if (
                        new Date(message.createdAt) >
                        new Date(seenAt)
                    ) {
                        return message;
                    }

                    return {
                        ...message,
                        delivered: true,
                        read: true,
                    };
                })
            );
        }

        socket.on(
            "message-seen",
            handleMessageSeen
        );

        return () => {
            socket.off(
                "message-seen",
                handleMessageSeen
            );
        };
    }, [id]);

    const lastSentMessageIndex =
    messages.findLastIndex(
        (message) => message.isMine
    );

    // CHECK FOR FIRST CONVO
    const conversationRequestState = (() => {
        if (isGroup) {
            return null;
        }

        if (messages.length === 0) {
            return null;
        }

        const firstMessage = messages[0];

        if (firstMessage.isMine) {
            const otherUserHasReplied =
                messages.some(
                    (message) => !message.isMine
                );

            if (!otherUserHasReplied) {
                return "waiting-for-reply";
            }
        } else {
            const iHaveReplied =
                messages.some(
                    (message) => message.isMine
                );

            if (!iHaveReplied) {
                return "needs-reply";
            }
        }

        return null;
    })();

    // FORMAT TIME AND DATE
    function formatMessageTime(date) {
        return new Date(date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatMessageDate(date) {
        const messageDate = new Date(date);
        const today = new Date();

        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (
            messageDate.toDateString() ===
            today.toDateString()
        ) {
            return "Today";
        }

        if (
            messageDate.toDateString() ===
            yesterday.toDateString()
        ) {
            return "Yesterday";
        }

        return messageDate.toLocaleDateString([], {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }



    return (
        <div className="chat-page">
            <header className="chat-header">
                <button
                    className="chat-back-button"
                    onClick={() => navigate("/home")}
                >
                    ‹
                </button>

                <div className="chat-header-user">
                    <div className="chat-header-avatar-wrapper">
                        {profilePictureUrl ? (
                            <img
                                src={profilePictureUrl}
                                alt={`${user?.displayName || "User"} profile`}
                                className="chat-header-avatar"
                            />
                        ) : (
                            <div className="chat-header-avatar chat-header-avatar-fallback">
                                {(isGroup ? group?.name : user?.displayName)
                                    ?.charAt(0)
                                    .toUpperCase() || "?"}
                            </div>
                        )}

                        {!isGroup && (
                            <StatusDot
                                status={chatPartnerStatus}
                                className="chat-header-status-dot"
                            />
                        )}
                    </div>

                    {isGroup ? (
                        <button
                            type="button"
                            className="chat-header-info chat-group-info-button"
                            onClick={openGroupMembers}
                            aria-label={`View members of ${group?.name || "group"}`}
                        >
                            <strong>
                                {group?.name || "Group"}
                            </strong>
                            <span>
                                {group?.members?.length || 0} members
                            </span>
                        </button>
                    ) : (
                        <div className="chat-header-info">
                            <strong>
                                {user?.displayName || "Chat"}
                            </strong>
                            <span>
                                @{user?.username}
                            </span>
                        </div>
                    )}
                </div>

                {call.status === "idle" && !call.incomingCall && (
                    <div className="chat-header-call-actions">
                        <CallControlButton
                            label="Audio call"
                            icon="phone"
                            className="chat-header-call-button"
                            onClick={() => call.startCall("audio")}
                        />
                        <CallControlButton
                            label="Video call"
                            icon="video"
                            className="chat-header-call-button"
                            onClick={() => call.startCall("video")}
                        />
                    </div>
                )}
            </header>

            <CallPanel
                call={call}
                participantNames={call.participantNames}
            />

            {isGroup && groupMembersOpen && (
                <div
                    className="group-members-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setGroupMembersOpen(false);
                        }
                    }}
                >
                    <section
                        className="group-members-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Group members"
                    >
                        <div className="group-members-header">
                            <div>
                                <strong>{group?.name || "Group"}</strong>
                                <span>
                                    {group?.members?.length || 0} members
                                </span>
                            </div>

                            <button
                                type="button"
                                className="group-members-close"
                                onClick={() =>
                                    setGroupMembersOpen(false)
                                }
                                aria-label="Close group members"
                            >
                                ×
                            </button>
                        </div>

                        <div className="group-members-list">
                            {(group?.members || []).map((member) => {
                                const memberId =
                                    member?._id?.toString() ||
                                    member?.toString();
                                const isCreator =
                                    memberId === creatorId;
                                const isAdmin =
                                    isAdminMember(member);
                                const isMe =
                                    memberId === currentUserId;

                                return (
                                    <div
                                        className="group-member-row"
                                        key={memberId}
                                    >
                                        <div className="group-member-avatar">
                                            {(member.displayName ||
                                                member.username ||
                                                "?")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div className="group-member-details">
                                            <div>
                                                <strong>
                                                    {member.displayName ||
                                                        member.username ||
                                                        "Member"}
                                                    {isMe ? " (You)" : ""}
                                                </strong>

                                                {isCreator && (
                                                    <span className="group-role-badge group-role-owner">
                                                        Owner
                                                    </span>
                                                )}

                                                {!isCreator && isAdmin && (
                                                    <span className="group-role-badge group-role-admin">
                                                        Admin
                                                    </span>
                                                )}

                                                {!isCreator && !isAdmin && (
                                                    <span className="group-role-badge group-role-member">
                                                        Member
                                                    </span>
                                                )}
                                            </div>

                                            {member.username && (
                                                <small>
                                                    @{member.username}
                                                </small>
                                            )}
                                        </div>

                                        {currentUserIsGroupAdmin &&
                                            !isMe && (
                                                <div className="group-member-actions">
                                                    {!isCreator &&
                                                        !isAdmin && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    Boolean(
                                                                        groupActionBusy
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    promoteGroupMember(
                                                                        memberId
                                                                    )
                                                                }
                                                            >
                                                                {groupActionBusy ===
                                                                `promote:${memberId}`
                                                                    ? "Promoting..."
                                                                    : "Make admin"}
                                                            </button>
                                                        )}

                                                    {!isCreator &&
                                                        (!isAdmin ||
                                                            currentUserIsGroupOwner) && (
                                                            <button
                                                                type="button"
                                                                className="group-member-remove"
                                                                disabled={
                                                                    Boolean(
                                                                        groupActionBusy
                                                                    )
                                                                }
                                                                onClick={() =>
                                                                    removeGroupMember(
                                                                        member
                                                                    )
                                                                }
                                                            >
                                                                {groupActionBusy ===
                                                                `remove:${memberId}`
                                                                    ? "Removing..."
                                                                    : "Remove"}
                                                            </button>
                                                        )}
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>

                        {currentUserIsGroupAdmin && (
                            <div className="group-invite-section">
                                <div className="group-invite-heading">
                                    <strong>Invite members</strong>
                                    <span>
                                        Users from your existing chats
                                    </span>
                                </div>

                                {inviteCandidates.length === 0 ? (
                                    <div className="group-invite-empty">
                                        No available users to invite.
                                    </div>
                                ) : (
                                    <div className="group-invite-list">
                                        {inviteCandidates.map((candidate) => {
                                            const candidateId =
                                                candidate._id?.toString();

                                            return (
                                                <div
                                                    className="group-invite-row"
                                                    key={candidateId}
                                                >
                                                    <div>
                                                        <strong>
                                                            {candidate.displayName ||
                                                                candidate.username}
                                                        </strong>
                                                        <small>
                                                            @{candidate.username}
                                                        </small>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            Boolean(
                                                                groupActionBusy
                                                            )
                                                        }
                                                        onClick={() =>
                                                            inviteGroupMember(
                                                                candidateId
                                                            )
                                                        }
                                                    >
                                                        {groupActionBusy ===
                                                        `invite:${candidateId}`
                                                            ? "Inviting..."
                                                            : "Invite"}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}

            <div className="chat-messages">
                {messages.map((message, index) => {
                    const previousMessage =
                        index > 0
                            ? messages[index - 1]
                            : null;

                    const showDate =
                        !previousMessage ||
                        new Date(message.createdAt).toDateString() !==
                            new Date(previousMessage.createdAt).toDateString();

                    return (
                        <div
                            className="message-entry"
                            key={message._id}
                        >
                            {showDate && (
                                <div className="message-date-separator">
                                    <span>
                                        {formatMessageDate(
                                            message.createdAt
                                        )}
                                    </span>

                                    <div className="message-date-line" />
                                </div>
                            )}

                            <div
                                className={
                                    message.isMine
                                        ? "message-row message-row-sent"
                                        : "message-row message-row-received"
                                }
                            >
                                {!message.isMine && (
                                    <span className="message-time">
                                        {formatMessageTime(
                                            message.createdAt
                                        )}
                                    </span>
                                )}

                                <div
                                    className={
                                        message.isMine
                                            ? "message-content-wrapper message-content-wrapper-sent"
                                            : "message-content-wrapper"
                                    }
                                >
                                    <div
                                        className={
                                            message.isMine
                                                ? "message message-sent"
                                                : "message message-received"
                                        }
                                    >
                                        {isGroup && !message.isMine && (
                                            <span className="message-sender-name">
                                                {message.sender?.displayName ||
                                                    message.senderName ||
                                                    "Member"}
                                            </span>
                                        )}

                                        {message.text && (
                                            <p>{message.text}</p>
                                        )}

                                        {message.mediaUrl && message.mediaType === "image" && (
                                            <img
                                                src={message.mediaUrl}
                                                alt="Message attachment"
                                                className="message-image"
                                                onLoad={scrollToBottom}
                                            />
                                        )}

                                        {message.mediaUrl &&message.mediaType === "video" && (
                                            <video
                                                src={message.mediaUrl}
                                                className="message-video"
                                                controls
                                                playsInline
                                                preload="metadata"
                                                onLoadedMetadata={scrollToBottom}
                                            />
                                        )}

                                        {message.gifUrl && (
                                            <img
                                                src={message.gifUrl}
                                                alt="GIF"
                                                className="message-image message-gif"
                                                loading="lazy"
                                                onLoad={scrollToBottom}
                                            />
                                        )}
                                    </div>

                                    {message.isMine &&
                                        index === lastSentMessageIndex && (
                                            <span className="message-status">
                                                {message.read
                                                    ? "Seen"
                                                    : message.delivered
                                                        ? "Delivered"
                                                        : "Sent"}
                                            </span>
                                        )}
                                </div>

                                {message.isMine && (
                                    <span className="message-time">
                                        {formatMessageTime(
                                            message.createdAt
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>

            {selectedMedia && (
                <div className="selected-media-info">
                    <span>
                        {selectedMedia.type === "image/gif"
                            ? `GIF · ${selectedMedia.name}`
                            : selectedMedia.name}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedMedia(null)
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {selectedGif && (
                <div className="selected-media-info selected-gif-info">
                    <div>
                        <img
                            src={selectedGif.previewUrl}
                            alt={selectedGif.title}
                        />
                        <span>{selectedGif.title || "GIF"}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setSelectedGif(null)
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {conversationRequestState ===
                "waiting-for-reply" && (
                <div className="chat-message-request-info">
                    You can send only one message until this
                    user replies to you.
                </div>
            )}

            {conversationRequestState ===
                "needs-reply" && (
                <div className="chat-message-request-info">
                    Once you reply to this user, they’ll be
                    able to continue the conversation. Until
                    then, they can’t send you any more
                    messages.
                </div>
            )}

            <form className="chat-input-area" onSubmit={handleSendMessage}>
                <div className="chat-attachment-control">
                    <button
                        type="button"
                        className={`chat-media-button ${
                            conversationRequestState === "waiting-for-reply"
                                ? "disabled"
                                : ""
                        }`}
                        disabled={
                            conversationRequestState ===
                            "waiting-for-reply"
                        }
                        aria-label="Add attachment"
                        aria-expanded={attachmentMenuOpen}
                        onClick={() =>
                            setAttachmentMenuOpen((open) => !open)
                        }
                    >
                        +
                    </button>

                    {attachmentMenuOpen && (
                        <div
                            className="chat-attachment-menu"
                            role="menu"
                            aria-label="Attachment options"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setAttachmentMenuOpen(false);
                                    mediaInputRef.current?.click();
                                }}
                            >
                                <span className="chat-attachment-menu-icon">
                                    ▣
                                </span>
                                <span>
                                    <strong>Media</strong>
                                    <small>Photo or video</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setAttachmentMenuOpen(false);
                                    setGifPickerOpen(true);
                                }}
                            >
                                <span className="chat-attachment-menu-icon chat-attachment-gif-icon">
                                    GIF
                                </span>
                                <span>
                                    <strong>GIF</strong>
                                    <small>Search or choose one</small>
                                </span>
                            </button>
                        </div>
                    )}

                    <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        hidden
                        disabled={
                            conversationRequestState ===
                            "waiting-for-reply"
                        }
                        onChange={(event) => {
                            handleSelectedFile(
                                event.target.files?.[0] || null,
                                event.target
                            );
                        }}
                    />

                    <input
                        ref={gifInputRef}
                        type="file"
                        accept="image/gif,.gif"
                        hidden
                        disabled={
                            conversationRequestState ===
                            "waiting-for-reply"
                        }
                        onChange={(event) => {
                            const file =
                                event.target.files?.[0] || null;

                            if (file && file.type !== "image/gif") {
                                event.target.value = "";
                                showNotification(
                                    "Please choose a GIF file.",
                                    "error"
                                );
                                return;
                            }

                            handleSelectedFile(file, event.target);

                            if (file) {
                                setGifPickerOpen(false);
                            }
                        }}
                    />
                </div>

                <div className="chat-message-input-wrapper">
                    <textarea
                        ref={messageInputRef}
                        className="chat-message-input"
                        placeholder={
                            conversationRequestState === "waiting-for-reply"
                                ? "Waiting for this user to reply..."
                                : `Message ${user?.displayName || ""}`
                        }
                        value={messageText}
                        disabled={
                            conversationRequestState === "waiting-for-reply"
                        }
                        rows={1}
                        maxLength={2000}
                        onChange={(event) => {
                            setMessageText(event.target.value);

                            const textarea = event.target;

                            textarea.style.height = "auto";

                            const lineHeight = 22;
                            const maxRows = 5;
                            const verticalPadding = 20;

                            const maxHeight =
                                lineHeight * maxRows +
                                verticalPadding;

                            textarea.style.height =
                                `${Math.min(
                                    textarea.scrollHeight,
                                    maxHeight
                                )}px`;

                            textarea.style.overflowY =
                                textarea.scrollHeight > maxHeight
                                    ? "auto"
                                    : "hidden";
                        }}
                    />

                    <span
                        className={`chat-character-count ${
                            messageText.length >= 1900
                                ? "near-limit"
                                : ""
                        }`}
                    >
                        {messageText.length}/2000
                    </span>
                </div>

                <button
                    type="submit"
                    className="chat-send-button"
                    disabled={
                        conversationRequestState ===
                            "waiting-for-reply" ||
                        (!messageText.trim() &&
                            !selectedMedia &&
                            !selectedGif)
                    }
                    aria-label="Send message"
                >
                    <img
                        src={
                            messageText.trim() ||
                            selectedMedia ||
                            selectedGif
                                ? "/arrow_up.png"
                                : "/arrow_right.png"
                        }
                        alt=""
                        className="chat-send-icon"
                    />
                </button>
            </form>

            <GifPicker
                open={gifPickerOpen}
                onClose={() => setGifPickerOpen(false)}
                onChooseLocalGif={() => gifInputRef.current?.click()}
                onSelect={handleGifSelected}
            />

        </div>
    );
}

export default Chat;