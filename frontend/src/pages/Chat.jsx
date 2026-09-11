import "./../styles/chat.css";

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { axiosInstance } from "../scripts/lib/axios.js";

function Chat() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const user = location.state?.user;

    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        async function loadMessages() {
            try {
                const response = await axiosInstance.get(`/messages/${id}`);
                setMessages(response.data);
            } catch (error) {
                console.error("Could not load messages:", error);
            }
        }

        loadMessages();
    }, [id]);

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

            setMessages(previousMessages => [
                ...previousMessages,
                response.data
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
                    {user?.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt={`${user.displayName} profile`}
                            className="chat-header-avatar"
                        />
                    ) : (
                        <div className="chat-header-avatar chat-header-avatar-fallback">
                            {user?.displayName?.charAt(0).toUpperCase() || "?"}
                        </div>
                    )}

                    <div className="chat-header-info">
                        <strong>
                            {user?.displayName || "Chat"}
                        </strong>

                        {user?.username && (
                            <span>
                                @{user.username}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="chat-messages">
                {messages.map(message => (
                    <div
                        className="message"
                        key={message._id}
                    >
                        {message.text && (
                            <p>{message.text}</p>
                        )}

                        {message.image && (
                            <img
                                src={message.image}
                                alt=""
                                className="message-image"
                            />
                        )}
                    </div>
                ))}
            </main>

            <form
                className="chat-input-area"
                onSubmit={handleSendMessage}
            >
                <label className="chat-image-button">
                    +
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                            setSelectedImage(event.target.files[0])
                        }
                        hidden
                    />
                </label>

                <input
                    type="text"
                    placeholder={
                        user
                            ? `Message ${user.displayName}`
                            : "Write a message"
                    }
                    value={messageText}
                    onChange={(event) =>
                        setMessageText(event.target.value)
                    }
                />

                <button type="submit">
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;