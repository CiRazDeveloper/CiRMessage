import { useCallback, useEffect, useRef, useState } from "react";

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
        callType,
        isMuted,
        isCameraOff,
        isScreenSharing,
        screenStream,
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
                <button type="button" onClick={() => startCall("audio")}>
                    📞 Audio call
                </button>
                <button type="button" onClick={() => startCall("video")}>
                    ▣ Video call
                </button>
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
                    <div>
                        <button type="button" onClick={acceptCall}>
                            Accept
                        </button>
                        <button
                            type="button"
                            className="call-danger"
                            onClick={rejectCall}
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {isScreenSharing && screenStream && (
                <div className="call-screen-preview">
                    <MediaElement stream={screenStream} video muted />
                    <span>You are sharing your screen</span>
                </div>
            )}

            {callType === "video" && localStream && (
                <div className="call-video-grid">
                    <div className="call-video-tile">
                        <MediaElement stream={localStream} video muted />
                        <span>You</span>
                    </div>

                    {Object.entries(remoteStreams).map(([id, stream]) => (
                        <div className="call-video-tile" key={id}>
                            <MediaElement stream={stream} video />
                            <span>
                                {participantNames.get(id)?.name || "Participant"}
                            </span>
                        </div>
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

                <button type="button" onClick={toggleMute}>
                    {isMuted ? "Unmute mic" : "Mute mic"}
                </button>

                {callType === "video" && (
                    <button type="button" onClick={toggleCamera}>
                        {isCameraOff ? "Camera on" : "Camera off"}
                    </button>
                )}

                {(status === "connecting" || status === "connected") && (
                    <button
                        type="button"
                        className={isScreenSharing ? "call-screen-active" : ""}
                        onClick={toggleScreenShare}
                    >
                        {isScreenSharing ? "Stop sharing" : "Share screen"}
                    </button>
                )}

                <button type="button" className="call-danger" onClick={endCall}>
                    End
                </button>
            </div>
        </section>
    );
}
