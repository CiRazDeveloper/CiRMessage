import "./../styles/chat.css";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { socket } from "../scripts/lib/socket.js";
import StatusDot from "./../components/StatusDot.jsx";

function Chat() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const user = location.state?.user;
    
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [chatPartnerStatus, setChatPartnerStatus] = useState("Offline");
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [selectedMedia, setSelectedMedia] = useState(null);
    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const deliveredMessageIdsRef = useRef(new Set());
    const latestSeenAtRef = useRef(null);


    // --- PROFILE PICTURE ---
    useEffect(() => {
        let profileUrl;

        async function loadProfilePicture() {
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
            }
        }

        loadProfilePicture();

        return () => {
            if (profileUrl) {
                URL.revokeObjectURL(profileUrl);
            }
        };
    }, [id]);
    

    // --- STATUS ---
    useEffect(() => {
        if (!id) {
            return;
        }

        socket.emit(
            "get-user-status",
            id,
            (response) => {
                const status =
                    response?.status || "Offline";

                console.log(
                    "Initial chat partner status:",
                    status
                );

                setChatPartnerStatus(status);
            }
        );

        function handleStatusChanged({
            userId,
            status,
        }) {
            console.log(
                "Received user-status-changed:",
                {
                    userId,
                    status,
                    chatPartnerId: id,
                }
            );

            if (userId === id) {
                setChatPartnerStatus(status);
            }
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
    }, [id]);



    // --- MESSAGES AND IMAGES ---

    // AUTO RELOAD
    useEffect(() => {
        const mediaUrls = [];

        async function handleNewMessage(message) {
            if (
                message.senderId.toString() !== id
            ) {
                return;
            }

            socket.emit(
                "message-read",
                message.senderId
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
                ];
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
    }, [id]);

    // LOAD
    useEffect(() => {
        let mediaUrls = [];

        async function loadMessages() {
            try {
                const response =
                    await axiosInstance.get(
                        `/messages/${id}`
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

                setMessages(loadedMessages);

                socket.emit(
                    "message-read",
                    id
                );
            } catch (error) {
                console.error(
                    "Could not load messages:",
                    error
                );
            }
        }

        loadMessages();

        return () => {
            mediaUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [id]);

    // SCROLL TO THE BOTTOM
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages]);

    // SEND MESSAGE
    async function handleSendMessage(event) {
        event.preventDefault();

        if (
            !messageText.trim() &&
            !selectedMedia
        ) {
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
                formData.append(
                    "media",
                    selectedMedia
                );
            }

            const response =
                await axiosInstance.post(
                    `/messages/send/${id}`,
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

            setMessages(
                (previousMessages) => [
                    ...previousMessages,
                    newMessage,
                ]
            );

            setMessageText("");
            setSelectedMedia(null);

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
                                {user?.displayName
                                    ?.charAt(0)
                                    .toUpperCase() || "?"}
                            </div>
                        )}

                        <StatusDot
                            status={chatPartnerStatus}
                            className="chat-header-status-dot"
                        />
                    </div>

                    <div className="chat-header-info">
                        <strong>
                            {user?.displayName || "Chat"}
                        </strong>

                        <span>
                            @{user?.username}
                        </span>
                    </div>
                </div>
            </header>

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
                                        {message.text && (
                                            <p>{message.text}</p>
                                        )}

                                        {message.mediaUrl && message.mediaType === "image" && (
                                            <img
                                                src={message.mediaUrl}
                                                alt="Message attachment"
                                                className="message-image"
                                            />
                                        )}

                                        {message.mediaUrl &&message.mediaType === "video" && (
                                            <video
                                                src={message.mediaUrl}
                                                className="message-video"
                                                controls
                                                playsInline
                                                preload="metadata"
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
                    <span>{selectedMedia.name}</span>

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
                <label
                    className={`.chat-media-button ${
                        conversationRequestState === "waiting-for-reply"
                            ? "disabled"
                            : ""
                    }`}
                >
                    +
                    <input
                        type="file"
                        accept="image/*,video/*"
                        hidden
                        disabled={
                            conversationRequestState ===
                            "waiting-for-reply"
                        }
                        onChange={(event) => {
                            setSelectedMedia(
                                event.target.files?.[0] ||
                                    null
                            );
                        }}
                    />
                </label>

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
                            !selectedMedia)
                    }
                    aria-label="Send message"
                >
                    <img
                        src={
                            messageText.trim() ||
                            selectedMedia
                                ? "/arrow_up.png"
                                : "/arrow_right.png"
                        }
                        alt=""
                        className="chat-send-icon"
                    />
                </button>
            </form>
        </div>
    );
}

export default Chat;