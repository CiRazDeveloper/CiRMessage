import "./../styles/chat.css";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../scripts/lib/axios.js";
import { socket } from "../scripts/lib/socket.js";
import { statusIcons } from "./../scripts/setStatus.js";

function Chat() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const messagesEndRef = useRef(null);
    const user = location.state?.user;
    
    
    const [profilePictureUrl, setProfilePictureUrl] = useState(null);
    const [chatPartnerStatus, setChatPartnerStatus] = useState("Offline");
    const statusKey = chatPartnerStatus.charAt(0).toUpperCase() + chatPartnerStatus.slice(1);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);


    // PROFILE PICTURE
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
    

    // STATUS
    useEffect(() => {
        if (!id) {
            return;
        }

        socket.emit(
            "get-user-status",
            id,
            (response) => {
                setChatPartnerStatus(
                    response?.status || "offline"
                );
            }
        );

        function handleStatusChanged({
            userId,
            status,
        }) {
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


    // MESSAGES AND IMAGES
        useEffect(() => {
        let imageUrls = [];

        async function loadMessages() {
            try {
                const response = await axiosInstance.get(
                    `/messages/${id}`
                );

                const loadedMessages = await Promise.all(
                    response.data.map(async (message) => {
                        if (!message.image) {
                            return message;
                        }

                        try {
                            const imageResponse =
                                await axiosInstance.get(
                                    `/media/message/${message._id}`,
                                    {
                                        responseType: "blob",
                                    }
                                );

                            const imageUrl =
                                URL.createObjectURL(
                                    imageResponse.data
                                );

                            imageUrls.push(imageUrl);

                            return {
                                ...message,
                                imageUrl,
                            };
                        } catch (error) {
                            console.error(
                                `Could not load message image ${message._id}:`,
                                error
                            );

                            return message;
                        }
                    })
                );

                setMessages(loadedMessages);
            } catch (error) {
                console.error(
                    "Could not load messages:",
                    error
                );
            }
        }

        loadMessages();

        return () => {
            imageUrls.forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages]);

    async function handleSendMessage(event) {
        event.preventDefault();

        if (!messageText.trim() && !selectedImage) {
            return;
        }

        try {
            const formData = new FormData();

            if (messageText.trim()) {
                formData.append("text", messageText.trim());
            }

            if (selectedImage) {
                formData.append("image", selectedImage);
            }

            const response = await axiosInstance.post(
                `/messages/send/${id}`,
                formData
            );

            const newMessage = response.data;

            if (newMessage.image) {
                try {
                    const imageResponse = await axiosInstance.get(
                        `/media/message/${newMessage._id}`,
                        {
                            responseType: "blob",
                        }
                    );

                    newMessage.imageUrl = URL.createObjectURL(
                        imageResponse.data
                    );
                } catch (error) {
                    console.error("Could not load sent image:", error);
                }
            }

            newMessage.isMine = true;

            setMessages(previousMessages => [
                ...previousMessages,
                newMessage
            ]);

            setMessageText("");
            setSelectedImage(null);
        } catch (error) {
            console.error("Could not send message:", error);
        }
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
                                {user?.displayName?.charAt(0).toUpperCase() || "?"}
                            </div>
                        )}

                        {statusIcons[statusKey] && (
                            <img
                                src={statusIcons[statusKey]}
                                alt={chatPartnerStatus}
                                className="chat-header-status-icon"
                            />
                        )}
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

            <main className="chat-messages">
                {messages.map(message => (
                    <div
                        className={
                            message.isMine
                                ? "message message-sent"
                                : "message message-received"
                        }
                        key={message._id}
                    >
                        {message.text && (
                            <p>{message.text}</p>
                        )}

                        {message.imageUrl && (
                            <img
                                src={message.imageUrl}
                                alt="Message attachment"
                                className="message-image"
                            />
                        )}
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </main>

            {selectedImage && (
                <div className="selected-image-info">
                    <span>{selectedImage.name}</span>

                    <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            <form className="chat-input-area" onSubmit={handleSendMessage}>
                <label className="chat-image-button">
                    +
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                            setSelectedImage(
                                event.target.files?.[0] || null
                            );
                        }}
                    />
                </label>

                <input
                    type="text"
                    placeholder={`Message ${user?.displayName || ""}`}
                    value={messageText}
                    onChange={(event) =>
                        setMessageText(event.target.value)
                    }
                />

                <button
                    type="submit"
                    className="chat-send-button"
                    disabled={!messageText.trim() && !selectedImage}
                    aria-label="Send message"
                >
                    <img
                        src={
                            messageText.trim() || selectedImage
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