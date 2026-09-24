import { useCallback, useEffect, useRef, useState } from "react";

function CallIcon({ name }) {
    const common = {
        width: 20,
        height: 20,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
    };

    switch (name) {
        case "phone":
            return (
                <svg {...common}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.65 2.62a2 2 0 0 1-.45 2.11L8.03 9.73a16 16 0 0 0 6.24 6.24l1.28-1.28a2 2 0 0 1 2.11-.45c.84.31 1.72.53 2.62.65A2 2 0 0 1 22 16.92z" />
                </svg>
            );
        case "phoneEnd":
            return (
                <svg {...common}>
                    <path d="M4.51 15.51a16.2 16.2 0 0 1 14.98 0" />
                    <path d="M3 14.5l1.1 3.15a2 2 0 0 0 2.5 1.25l2.23-.74a2 2 0 0 0 1.37-1.9v-1.03" />
                    <path d="M21 14.5l-1.1 3.15a2 2 0 0 1-2.5 1.25l-2.23-.74a2 2 0 0 1-1.37-1.9v-1.03" />
                </svg>
            );
        case "video":
            return (
                <svg {...common}>
                    <rect x="3" y="6" width="13" height="12" rx="2" />
                    <path d="m16 10 5-3v10l-5-3z" />
                </svg>
            );
        case "videoOff":
            return (
                <svg {...common}>
                    <path d="m2 2 20 20" />
                    <path d="M10.5 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11V11.5" />
                    <path d="m16 10 5-3v10l-2.5-1.5" />
                </svg>
            );
        case "mic":
            return (
                <svg {...common}>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 17v5" />
                </svg>
            );
        case "micOff":
            return (
                <svg {...common}>
                    <path d="m2 2 20 20" />
                    <path d="M9 9v2a3 3 0 0 0 5.12 2.12" />
                    <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
                    <path d="M5 10a7 7 0 0 0 11.9 5" />
                    <path d="M19 10a7 7 0 0 1-.5 2.6" />
                    <path d="M12 17v5" />
                </svg>
            );
        case "screen":
            return (
                <svg {...common}>
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="m9 10 3-3 3 3" />
                    <path d="M12 7v6" />
                </svg>
            );
        case "screenOff":
            return (
                <svg {...common}>
                    <path d="m2 2 20 20" />
                    <path d="M6 3h14a2 2 0 0 1 2 2v10a2 2 0 0 1-.58 1.42" />
                    <path d="M18 17H4a2 2 0 0 1-2-2V5c0-.55.22-1.05.58-1.42" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                </svg>
            );
        case "maximize":
            return (
                <svg {...common}>
                    <path d="M8 3H3v5" />
                    <path d="M16 3h5v5" />
                    <path d="M8 21H3v-5" />
                    <path d="M16 21h5v-5" />
                </svg>
            );
        case "minimize":
            return (
                <svg {...common}>
                    <path d="M3 8h5V3" />
                    <path d="M21 8h-5V3" />
                    <path d="M3 16h5v5" />
                    <path d="M21 16h-5v5" />
                </svg>
            );
        case "close":
            return (
                <svg {...common}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );
        default:
            return null;
    }
}

function CallControlButton({
    label,
    icon,
    onClick,
    className = "",
    disabled = false,
}) {
    return (
        <button
            type="button"
            className={`call-control-button ${className}`.trim()}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
        >
            <CallIcon name={icon} />
            <span className="call-button-label">{label}</span>
        </button>
    );
}

function RemoteVideoTile({ stream, name }) {
    const [hidden, setHidden] = useState(false);
    const [hasLiveVideo, setHasLiveVideo] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        setHidden(false);

        const updateVideoState = () => {
            setHasLiveVideo(
                stream
                    ?.getVideoTracks()
                    .some((track) => track.readyState === "live") || false
            );
        };

        updateVideoState();
        const tracks = stream?.getVideoTracks() || [];
        tracks.forEach((track) => {
            track.addEventListener("ended", updateVideoState);
            track.addEventListener("mute", updateVideoState);
            track.addEventListener("unmute", updateVideoState);
        });

        return () => {
            tracks.forEach((track) => {
                track.removeEventListener("ended", updateVideoState);
                track.removeEventListener("mute", updateVideoState);
                track.removeEventListener("unmute", updateVideoState);
            });
        };
    }, [stream]);

    useEffect(() => {
        if (!isExpanded) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isExpanded]);

    if (hidden) return null;

    return (
        <div
            className={`call-video-tile call-remote-video ${hasLiveVideo ? "" : "call-video-ended"} ${isExpanded ? "call-video-expanded" : ""}`}
        >
            <MediaElement stream={stream} video />
            <span>{hasLiveVideo ? name : "Screen sharing ended"}</span>
            <div className="call-video-actions">
                {hasLiveVideo && (
                    <button
                        type="button"
                        className="call-video-action-button"
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                        aria-label={isExpanded ? "Exit full screen" : "Full screen"}
                        title={isExpanded ? "Exit full screen" : "Full screen"}
                    >
                        <CallIcon name={isExpanded ? "minimize" : "maximize"} />
                    </button>
                )}
                {!isExpanded && (
                    <button
                        type="button"
                        className="call-video-action-button"
                        aria-label="Close shared screen"
                        title="Close shared screen"
                        onClick={() => setHidden(true)}
                    >
                        <CallIcon name="close" />
                    </button>
                )}
            </div>
        </div>
    );
}

function MediaElement({ stream, video = false, muted = false }) {
    const ref = useRef(null);
    const [blocked, setBlocked] = useState(false);

    const play = useCallback(async () => {
        if (!ref.current) return;
        try {
            await ref.current.play();
            setBlocked(false);
        } catch {
            setBlocked(true);
        }
    }, []);

    useEffect(() => {
        if (!ref.current) return;
        ref.current.srcObject = stream || null;
        if (stream) {
            play();
        }
    }, [play, stream]);

    if (video) {
        return <video ref={ref} autoPlay playsInline muted={muted} />;
    }

    return (
        <>
            <audio ref={ref} autoPlay playsInline />
            {blocked && (
                <button type="button" onClick={play}>
                    Enable audio
                </button>
            )}
        </>
    );
}

export default function CallPanel({ call, participantNames = new Map() }) {
    const {
        status,
        incomingCall,
        localStream,
        remoteStreams,
        remoteScreenStreams,
        callType,
        isMuted,
        isCameraOff,
        isScreenSharing,
        screenStream,
        canShareScreen,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
    } = call;

    if (status === "idle" && !incomingCall) {
        return (
            <div className="call-start-actions">
                <CallControlButton
                    label="Audio call"
                    icon="phone"
                    className="call-start-button"
                    onClick={() => startCall("audio")}
                />
                <CallControlButton
                    label="Video call"
                    icon="video"
                    className="call-start-button"
                    onClick={() => startCall("video")}
                />
            </div>
        );
    }

    return (
        <section className="call-panel" aria-label="Call controls">
            {incomingCall && (
                <div className="call-incoming">
                    <strong>
                        {incomingCall.callerName} is calling ({callType})
                    </strong>
                    <div className="call-incoming-actions">
                        <CallControlButton
                            label="Accept call"
                            icon="phone"
                            className="call-accept-button"
                            onClick={acceptCall}
                        />
                        <CallControlButton
                            label="Reject call"
                            icon="phoneEnd"
                            className="call-reject-button"
                            onClick={rejectCall}
                        />
                    </div>
                </div>
            )}

            {isScreenSharing && screenStream && (
                <div className="call-screen-preview">
                    <MediaElement stream={screenStream} video muted />
                    <span>You are sharing your screen</span>
                </div>
            )}

            {(callType === "video" ||
                Object.values(remoteStreams).some(
                    (stream) => stream.getVideoTracks().length > 0
                ) ||
                Object.keys(remoteScreenStreams).length > 0) && (
                <div className="call-video-grid">
                    {callType === "video" && localStream && (
                        <div className="call-video-tile">
                            <MediaElement stream={localStream} video muted />
                            <span>You</span>
                        </div>
                    )}

                    {Object.entries(remoteStreams).map(([id, stream]) =>
                        stream.getVideoTracks().length > 0 ? (
                            <div className="call-video-tile" key={`camera-${id}`}>
                                <MediaElement stream={stream} video muted />
                                <span>
                                    {participantNames.get(id)?.name ||
                                        "Participant"}
                                </span>
                            </div>
                        ) : null
                    )}

                    {Object.entries(remoteScreenStreams).map(([id, stream]) => (
                        <RemoteVideoTile
                            key={`screen-${id}`}
                            stream={stream}
                            name={`${
                                participantNames.get(id)?.name || "Participant"
                            }'s screen`}
                        />
                    ))}
                </div>
            )}

            {Object.entries(remoteStreams).map(([id, stream]) => (
                <div className="call-audio-tile" key={`audio-${id}`}>
                    <MediaElement stream={stream} />
                    <span>
                        {participantNames.get(id)?.name || "Participant"}
                    </span>
                </div>
            ))}

            <div className="call-toolbar">
                <span className="call-status">
                    {status === "calling"
                        ? "Calling..."
                        : status === "ringing"
                            ? "Incoming call"
                            : status === "connecting"
                                ? "Connecting..."
                                : "Connected"}
                </span>

                <CallControlButton
                    label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    icon={isMuted ? "micOff" : "mic"}
                    className={isMuted ? "call-control-active" : ""}
                    onClick={toggleMute}
                />

                {callType === "video" && (
                    <CallControlButton
                        label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                        icon={isCameraOff ? "videoOff" : "video"}
                        className={isCameraOff ? "call-control-active" : ""}
                        onClick={toggleCamera}
                    />
                )}

                {(status === "connecting" || status === "connected") &&
                    (isScreenSharing || canShareScreen) && (
                        <CallControlButton
                            label={isScreenSharing ? "Stop sharing" : "Share screen"}
                            icon={isScreenSharing ? "screenOff" : "screen"}
                            className={
                                isScreenSharing
                                    ? "call-screen-active"
                                    : ""
                            }
                            onClick={toggleScreenShare}
                        />
                    )}

                <CallControlButton
                    label="End call"
                    icon="phoneEnd"
                    className="call-end-button"
                    onClick={endCall}
                />
            </div>
        </section>
    );
}
