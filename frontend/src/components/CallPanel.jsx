import { useEffect, useRef } from "react";

function VideoTile({ stream, label, muted = false }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream || null;
        }
    }, [stream]);

    return (
        <div className="call-video-tile">
            <video ref={videoRef} autoPlay playsInline muted={muted} />
            <span>{label}</span>
        </div>
    );
}

function CallPanel({
    call,
    participantNames,
}) {
    const {
        status,
        incomingCall,
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        isScreenSharing,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        callType,
    } = call;

    const active = status !== "idle" || incomingCall;
    if (!active) {
        return (
            <div className="call-start-actions">
                <button type="button" onClick={() => startCall("audio")}>📞 Audio call</button>
                <button type="button" onClick={() => startCall("video")}>▣ Video call</button>
            </div>
        );
    }

    return (
        <section className="call-panel" aria-label="Call controls">
            {incomingCall && (
                <div className="call-incoming">
                    <strong>{incomingCall.callerName} is calling ({incomingCall.callType || "video"})</strong>
                    <div>
                        <button type="button" onClick={acceptCall}>Accept</button>
                        <button type="button" className="call-danger" onClick={rejectCall}>Reject</button>
                    </div>
                </div>
            )}
            {localStream && callType === "video" && (
                <div className="call-video-grid">
                    <VideoTile stream={localStream} label="You" muted />
                    {Object.entries(remoteStreams).map(([id, stream]) => (
                        <VideoTile key={id} stream={stream} label={participantNames.get(id)?.name || "Participant"} />
                    ))}
                </div>
            )}
            <div className="call-toolbar">
                <span className="call-status">{status === "calling" ? "Calling..." : callType === "audio" ? "Audio call" : "Connected"}</span>
                <button type="button" onClick={toggleMute}>{isMuted ? "Unmute mic" : "Mute mic"}</button>
                {callType === "video" && (
                    <button type="button" onClick={toggleCamera}>{isCameraOff ? "Camera on" : "Camera off"}</button>
                )}
                {callType === "video" && (
                    <button type="button" onClick={toggleScreenShare}>{isScreenSharing ? "Stop sharing" : "Share screen"}</button>
                )}
                <button type="button" className="call-danger" onClick={endCall}>End</button>
            </div>
        </section>
    );
}

export default CallPanel;
