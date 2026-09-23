import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { socket } from "../scripts/lib/socket.js";

const turnUsername =
    import.meta.env.VITE_TURN_USERNAME;
const turnCredential =
    import.meta.env.VITE_TURN_CREDENTIAL;

const turnAuthentication =
    turnUsername && turnCredential
        ? {
            username: turnUsername,
            credential: turnCredential,
        }
        : {};

const iceTransportPolicy =
    import.meta.env.VITE_ICE_TRANSPORT_POLICY || "all";

const configuredIceServers = [
    {
        urls:
            import.meta.env.VITE_STUN_URL ||
            "stun:stun.l.google.com:19302",
    },
    {
        urls:
            import.meta.env.VITE_TURN_URL_UDP ||
            "turn:cirm.ciraz.online:3478?transport=udp",
        ...turnAuthentication,
    },
    {
        urls:
            import.meta.env.VITE_TURN_URL_TCP ||
            "turn:cirm.ciraz.online:3478?transport=tcp",
        ...turnAuthentication,
    },
];

const ICE_SERVERS =
    iceTransportPolicy === "relay"
        ? configuredIceServers.filter((server) =>
            Array.isArray(server.urls)
                ? server.urls.some((url) =>
                    url.startsWith("turn:") &&
                    url.includes("transport=udp")
                )
                : server.urls.startsWith("turn:") &&
                    server.urls.includes("transport=udp")
        )
        : configuredIceServers;

function getId(value) {
    return value?._id?.toString() || value?.id?.toString() || value?.toString();
}

function participantDetails(participant) {
    return {
        id: getId(participant),
        name: participant?.displayName || participant?.username || "Participant",
    };
}

function descriptionFromSdp(payload) {
    if (!payload?.sdp) {
        return null;
    }

    return {
        type: payload.type || (payload.answer ? "answer" : "offer"),
        sdp: payload.sdp,
    };
}

function waitForIceGatheringComplete(peer, timeout = 10000) {
    if (peer.iceGatheringState === "complete") {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }

            settled = true;
            window.clearTimeout(timeoutId);
            peer.removeEventListener(
                "icegatheringstatechange",
                handleStateChange
            );
            resolve();
        };
        const handleStateChange = () => {
            if (peer.iceGatheringState === "complete") {
                finish();
            }
        };
        const timeoutId = window.setTimeout(finish, timeout);

        peer.addEventListener(
            "icegatheringstatechange",
            handleStateChange
        );
    });
}

export function useWebRTCCall({
    targetId,
    isGroup = false,
    participants = [],
    currentUser,
    enabled = true,
}) {
    const [status, setStatus] = useState("idle");
    const [incomingCall, setIncomingCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callType, setCallType] = useState("video");
    const peersRef = useRef(new Map());
    const localStreamRef = useRef(null);
    const screenTrackRef = useRef(null);
    const callIdRef = useRef(null);
    const callTypeRef = useRef("video");
    const participantMap = useRef(new Map());
    const pendingIceCandidates = useRef(new Map());
    const remoteMediaStreams = useRef(new Map());
    const participantNames = useMemo(
        () =>
            new Map(
                participants
                    .map(participantDetails)
                    .filter((participant) => participant.id)
                    .map((participant) => [participant.id, participant])
            ),
        [participants]
    );

    useEffect(() => {
        participantMap.current = participantNames;
    }, [participantNames]);

    const emitCall = useCallback((event, payload = {}, targetUserId) => {
        socket.emit(event, {
            ...payload,
            callId: payload.callId || callIdRef.current,
            ...(targetUserId && { targetPeerId: targetUserId }),
            ...(isGroup
                ? { groupId: targetId }
                : { targetUserId: targetUserId || targetId }),
        });
    }, [isGroup, targetId]);

    const closePeer = useCallback((peerId) => {
        peersRef.current.get(peerId)?.close();
        peersRef.current.delete(peerId);
        remoteMediaStreams.current.delete(peerId);
        setRemoteStreams((streams) => {
            const next = { ...streams };
            delete next[peerId];
            return next;
        });
    }, []);

    const stopLocalMedia = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
    }, []);

    const endCall = useCallback((notify = true) => {
        if (notify && callIdRef.current) {
            emitCall("call-end");
        }
        peersRef.current.forEach((peer) => peer.close());
        peersRef.current.clear();
        remoteMediaStreams.current.clear();
        stopLocalMedia();
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        callIdRef.current = null;
        setRemoteStreams({});
        setIncomingCall(null);
        setStatus("idle");
        setIsScreenSharing(false);
        setIsMuted(false);
        setIsCameraOff(false);
    }, [emitCall, stopLocalMedia]);

    const ensureLocalStream = useCallback(async (requestedType = callTypeRef.current) => {
        if (localStreamRef.current) {
            return localStreamRef.current;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Calling is not supported by this browser");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: requestedType === "video",
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOff(requestedType !== "video");
        return stream;
    }, []);

    const createPeer = useCallback((peerId, shouldOffer, callId) => {
        if (!peerId || peerId === getId(currentUser)) {
            return null;
        }
        const existing = peersRef.current.get(peerId);
        if (existing) {
            return existing;
        }

        const peer = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            iceTransportPolicy,
        });
        peersRef.current.set(peerId, peer);
        localStreamRef.current?.getTracks().forEach((track) => {
            peer.addTrack(track, localStreamRef.current);
        });
        peer.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log(
                    `LOCAL ICE for ${peerId}:`,
                    candidate.candidate
                );
                emitCall("call-ice-candidate", {
                    callId,
                    candidate: candidate.toJSON ? candidate.toJSON() : candidate,
                }, peerId);
            } else {
                console.log(
                    `ICE gathering finished for ${peerId}`
                );
            }
        };
        peer.ontrack = ({ track, streams }) => {
            let remoteStream = remoteMediaStreams.current.get(peerId);

            if (!remoteStream) {
                remoteStream = streams[0] || new MediaStream();
                remoteMediaStreams.current.set(peerId, remoteStream);
            }

            if (!remoteStream.getTracks().some((item) => item.id === track.id)) {
                remoteStream.addTrack(track);
            }

            console.info(
                `Remote ${track.kind} track received from ${peerId}`,
                {
                    audioTracks: remoteStream.getAudioTracks().length,
                    videoTracks: remoteStream.getVideoTracks().length,
                }
            );
            setRemoteStreams((current) => ({
                ...current,
                [peerId]: remoteStream,
            }));
        };
        peer.onconnectionstatechange = () => {
            console.log(
                "Connection state:",
                peer.connectionState,
                `(${peerId})`
            );
            if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
                closePeer(peerId);
            }
        };
        peer.oniceconnectionstatechange = () => {
            console.log(
                "ICE connection state:",
                peer.iceConnectionState,
                `(${peerId})`
            );
        };
        peer.onicegatheringstatechange = () => {
            console.log(
                "ICE gathering state:",
                peer.iceGatheringState,
                `(${peerId})`
            );
        };
        peer.onicecandidateerror = (event) => {
            console.error("ICE candidate error:", {
                url: event.url,
                errorCode: event.errorCode,
                errorText: event.errorText,
                peerId,
            });
        };
        if (shouldOffer) {
            (async () => {
                try {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    await waitForIceGatheringComplete(peer);

                    emitCall("call-offer", {
                        callId,
                        sdp: peer.localDescription.sdp,
                        type: peer.localDescription.type,
                    }, peerId);
                } catch (error) {
                    console.error(
                        "Could not create call offer:",
                        error
                    );
                }
            })();
        }
        return peer;
    }, [closePeer, currentUser, emitCall]);

    const flushPendingIceCandidates = useCallback(
        async (peerId, peer) => {
            const pending =
                pendingIceCandidates.current.get(peerId) || [];

            console.log(
                `Flushing ${pending.length} ICE candidates for ${peerId}`
            );

            pendingIceCandidates.current.delete(peerId);

            for (const candidate of pending) {
                try {
                    await peer.addIceCandidate(candidate);

                    console.log(
                        "QUEUED REMOTE ICE ADDED:",
                        candidate.candidate
                    );
                } catch (error) {
                    console.error(
                        "QUEUED REMOTE ICE FAILED:",
                        error,
                        candidate
                    );
                }
            }
        },
        []
    );

    const startCall = useCallback(async (requestedType = "video") => {
        try {
            callTypeRef.current = requestedType;
            setCallType(requestedType);
            await ensureLocalStream(requestedType);
            callIdRef.current = `${getId(currentUser)}-${requestedType}-${Date.now()}`;
            setStatus("calling");
            emitCall("call-invite", {
                callId: callIdRef.current,
                callType: requestedType,
            });
        } catch (error) {
            console.error("Could not start call:", error);
            setStatus("idle");
            throw error;
        }
    }, [currentUser, emitCall, ensureLocalStream]);

    const acceptCall = useCallback(async () => {
        if (!incomingCall) {
            return;
        }
        try {
            const acceptedType = incomingCall.callType || "video";
            callTypeRef.current = acceptedType;
            setCallType(acceptedType);
            await ensureLocalStream(acceptedType);
            callIdRef.current = incomingCall.callId;
            setIncomingCall(null);
            setStatus("connected");
            emitCall(
                "call-accept",
                { targetPeerId: incomingCall.callerId },
                incomingCall.callerId
            );
        } catch (error) {
            console.error("Could not accept call:", error);
            emitCall(
                "call-reject",
                { targetPeerId: incomingCall.callerId },
                incomingCall.callerId
            );
            setIncomingCall(null);
        }
    }, [emitCall, ensureLocalStream, incomingCall]);

    const rejectCall = useCallback(() => {
        if (incomingCall) {
            emitCall(
                "call-reject",
                { targetPeerId: incomingCall.callerId },
                incomingCall.callerId
            );
        }
        setIncomingCall(null);
    }, [emitCall, incomingCall]);

    const toggleMute = useCallback(() => {
        const next = !isMuted;
        localStreamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = !next;
        });
        setIsMuted(next);
    }, [isMuted]);

    const toggleCamera = useCallback(() => {
        const next = !isCameraOff;
        localStreamRef.current?.getVideoTracks().forEach((track) => {
            track.enabled = !next;
        });
        setIsCameraOff(next);
    }, [isCameraOff]);

    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            if (screenTrackRef.current) {
                screenTrackRef.current.onended = null;
            }
            screenTrackRef.current?.stop();
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
            peersRef.current.forEach((peer) => {
                const sender = peer.getSenders().find((item) => item.track?.kind === "video");
                if (sender && cameraTrack) {
                    sender.replaceTrack(cameraTrack);
                }
            });
            emitCall("call-screen-share", { screenSharing: false });
            screenTrackRef.current = null;
            setIsScreenSharing(false);
            return;
        }
        if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error("Screen sharing is not supported by this browser");
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        peersRef.current.forEach((peer) => {
            const sender = peer.getSenders().find((item) => item.track?.kind === "video");
            if (sender) {
                sender.replaceTrack(screenTrack);
            }
        });
        screenTrack.onended = () => {
            const cameraTrack =
                localStreamRef.current?.getVideoTracks()[0];

            peersRef.current.forEach((peer) => {
                const sender = peer
                    .getSenders()
                    .find(
                        (item) =>
                            item.track?.kind === "video"
                    );

                if (sender && cameraTrack) {
                    sender.replaceTrack(cameraTrack);
                }
            });

            screenTrackRef.current = null;
            setIsScreenSharing(false);
            emitCall("call-screen-share", {
                screenSharing: false,
            });
        };
        setIsScreenSharing(true);
        emitCall("call-screen-share", { screenSharing: true });
    }, [emitCall, isScreenSharing]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }
        const userId = getId(currentUser);
        const matchesCall = (payload) =>
            payload?.callId === callIdRef.current ||
            payload?.groupId === targetId ||
            payload?.targetUserId === targetId ||
            payload?.callerId === targetId ||
            payload?.targetUserId === userId ||
            payload?.targetPeerId === userId;

        function handleInvite(payload) {
            if (!matchesCall(payload) || payload.callerId === userId) {
                return;
            }
            const caller = participantMap.current.get(payload.callerId);
            setIncomingCall({
                ...payload,
                callerId: payload.callerId,
                callType: payload.callType || payload.callId?.split("-").slice(-2, -1)[0] || "video",
                callerName: caller?.name || "Incoming call",
            });
        }

        function handleAccept(payload) {
            if (!matchesCall(payload) || payload.callerId === userId) {
                return;
            }
            setStatus("connected");
            createPeer(payload.callerId, true, payload.callId);
        }

        async function handleOffer(payload) {
            if (!matchesCall(payload) || payload.callerId === userId) {
                return;
            }
            const peerId = payload.callerId;
            const peer = createPeer(peerId, false, payload.callId);
            const description = descriptionFromSdp(payload);
            if (!peer || !description) {
                return;
            }
            await peer.setRemoteDescription(description);
            await flushPendingIceCandidates(peerId, peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await waitForIceGatheringComplete(peer);
            emitCall("call-answer", {
                callId: payload.callId,
                sdp: peer.localDescription.sdp,
                type: peer.localDescription.type,
            }, peerId);
            setStatus("connected");
        }

        async function handleAnswer(payload) {
            if (!matchesCall(payload) || payload.callerId === userId) {
                return;
            }
            const peer = peersRef.current.get(payload.callerId);
            const description = descriptionFromSdp(payload);
            if (peer && description) {
                await peer.setRemoteDescription(description);
                await flushPendingIceCandidates(payload.callerId, peer);
                setStatus("connected");
            }
        }

        function handleIce(payload) {
            if (!matchesCall(payload) || payload.callerId === userId) {
                return;
            }

            console.log(
                "REMOTE ICE RECEIVED:",
                {
                    from: payload.callerId,
                    candidate: payload.candidate?.candidate,
                    callId: payload.callId,
                    hasPeer: peersRef.current.has(payload.callerId),
                }
            );

            const peer = peersRef.current.get(payload.callerId);

            if (!payload.candidate) {
                console.warn("REMOTE ICE payload has no candidate", payload);
                return;
            }

            if (peer?.remoteDescription) {
                console.log(
                    "Adding REMOTE ICE immediately:",
                    payload.candidate.candidate
                );

                peer.addIceCandidate(payload.candidate)
                    .then(() => {
                        console.log(
                            "REMOTE ICE ADDED:",
                            payload.candidate.candidate
                        );
                    })
                    .catch((error) => {
                        console.error(
                            "REMOTE ICE ADD FAILED:",
                            error,
                            payload.candidate
                        );
                    });

                return;
            }

            console.log(
                "Queuing REMOTE ICE:",
                {
                    from: payload.callerId,
                    hasPeer: Boolean(peer),
                    remoteDescription: Boolean(peer?.remoteDescription),
                    candidate: payload.candidate.candidate,
                }
            );

            const pending =
                pendingIceCandidates.current.get(payload.callerId) || [];

            pending.push(payload.candidate);

            pendingIceCandidates.current.set(
                payload.callerId,
                pending
            );
        }

        function handleEnd(payload) {
            if (payload?.callId === callIdRef.current) {
                endCall(false);
            }
        }

        function handleReject(payload) {
            if (payload?.callId === callIdRef.current && !isGroup) {
                endCall(false);
            }
        }

        socket.on("call-invite", handleInvite);
        socket.on("call-accept", handleAccept);
        socket.on("call-offer", handleOffer);
        socket.on("call-answer", handleAnswer);
        socket.on("call-ice-candidate", handleIce);
        socket.on("call-reject", handleReject);
        socket.on("call-end", handleEnd);
        return () => {
            socket.off("call-invite", handleInvite);
            socket.off("call-accept", handleAccept);
            socket.off("call-offer", handleOffer);
            socket.off("call-answer", handleAnswer);
            socket.off("call-ice-candidate", handleIce);
            socket.off("call-reject", handleReject);
            socket.off("call-end", handleEnd);
        };
    }, [
        createPeer,
        currentUser,
        emitCall,
        enabled,
        endCall,
        flushPendingIceCandidates,
        isGroup,
        targetId,
    ]);

    useEffect(() => () => endCall(false), [endCall]);

    return {
        status,
        incomingCall,
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        isScreenSharing,
        callType,
        startCall,
        acceptCall,
        rejectCall,
        endCall: () => endCall(true),
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        participantNames,
    };
}
