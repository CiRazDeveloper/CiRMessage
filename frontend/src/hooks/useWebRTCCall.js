import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../scripts/lib/socket.js";

const getId = (value) =>
    value?._id?.toString() || value?.id?.toString() || value?.toString();

const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;
const ICE_TRANSPORT_POLICY = import.meta.env.VITE_ICE_TRANSPORT_POLICY || "all";

const turnAuth =
    TURN_USERNAME && TURN_CREDENTIAL
        ? { username: TURN_USERNAME, credential: TURN_CREDENTIAL }
        : {};

const ICE_SERVERS = [
    {
        urls:
            import.meta.env.VITE_STUN_URL ||
            "stun:stun.l.google.com:19302",
    },
    {
        urls:
            import.meta.env.VITE_TURN_URL_UDP ||
            "turn:cirm.ciraz.online:3478?transport=udp",
        ...turnAuth,
    },
    {
        urls:
            import.meta.env.VITE_TURN_URL_TCP ||
            "turn:cirm.ciraz.online:3478?transport=tcp",
        ...turnAuth,
    },
];

function makeCallId(userId, type) {
    return `${userId}-${type}-${Date.now()}`;
}

export function useWebRTCCall({
    targetId,
    isGroup = false,
    participants = [],
    currentUser,
    enabled = true,
    initialIncomingCall = null,
}) {
    const currentUserId = getId(currentUser);
    const canShareScreen = Boolean(navigator.mediaDevices?.getDisplayMedia);

    const [status, setStatus] = useState("idle");
    const [incomingCall, setIncomingCall] = useState(initialIncomingCall);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState({});
    const [callType, setCallType] = useState("video");
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenStream, setScreenStream] = useState(null);

    const callIdRef = useRef(null);
    const callTypeRef = useRef("video");
    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map());
    const pendingIceRef = useRef(new Map());
    const remoteScreenMidsRef = useRef(new Map());
    const remoteScreenTracksRef = useRef(new Map());
    const remoteScreenActiveRef = useRef(new Map());
    const screenTrackRef = useRef(null);
    const screenSendersRef = useRef(new Map());
    const initialIncomingCallRef = useRef(initialIncomingCall);

    useEffect(() => {
        const incoming = initialIncomingCallRef.current;
        if (!incoming?.callId || callIdRef.current) {
            return;
        }

        callIdRef.current = incoming.callId;
        callTypeRef.current = incoming.callType || "video";
        setCallType(callTypeRef.current);
        setIncomingCall(incoming);
        setStatus("ringing");
    }, []);

    const participantNames = useMemo(() => {
        const names = new Map();
        for (const participant of participants) {
            const id = getId(participant);
            if (id) {
                names.set(id, {
                    id,
                    name:
                        participant?.displayName ||
                        participant?.username ||
                        "Participant",
                });
            }
        }
        return names;
    }, [participants]);

    const emitSignal = useCallback(
        (event, payload = {}, peerId = null) => {
            if (!socket.connected) {
                console.warn(`Cannot emit ${event}: socket is disconnected`);
                return;
            }

            socket.emit(event, {
                ...payload,
                callId: payload.callId || callIdRef.current,
                ...(peerId ? { targetPeerId: peerId } : {}),
                ...(isGroup
                    ? { groupId: targetId }
                    : { targetUserId: peerId || targetId }),
            });
        },
        [isGroup, targetId]
    );

    const stopScreenShare = useCallback(async () => {
        const screenTrack = screenTrackRef.current;
        if (!screenTrack) {
            return;
        }

        screenTrack.onended = null;
        screenTrackRef.current = null;

        for (const [peerId, screenSender] of screenSendersRef.current.entries()) {
            try {
                await screenSender.sender.replaceTrack(null);

                emitSignal(
                    "call-screen-share",
                    {
                        callId: callIdRef.current,
                        screenSharing: false,
                        screenMid: screenSender.transceiver.mid,
                    },
                    peerId
                );
            } catch (error) {
                console.error("Could not stop screen sharing:", error);
            }
        }

        screenTrack.stop();
        setScreenStream(null);
        setIsScreenSharing(false);
    }, [emitSignal]);

    const resetCall = useCallback(() => {
        for (const peer of peersRef.current.values()) {
            peer.onicecandidate = null;
            peer.ontrack = null;
            peer.onconnectionstatechange = null;
            peer.close();
        }

        peersRef.current.clear();
        pendingIceRef.current.clear();
        remoteScreenMidsRef.current.clear();
        remoteScreenTracksRef.current.clear();
        remoteScreenActiveRef.current.clear();
        screenSendersRef.current.clear();

        if (screenTrackRef.current) {
            screenTrackRef.current.onended = null;
            screenTrackRef.current.stop();
            screenTrackRef.current = null;
        }

        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        callIdRef.current = null;

        setLocalStream(null);
        setRemoteStreams({});
        setRemoteScreenStreams({});
        setIncomingCall(null);
        setStatus("idle");
        setIsMuted(false);
        setIsCameraOff(false);
        setIsScreenSharing(false);
        setScreenStream(null);
    }, []);

    const endCall = useCallback(
        (notify = true) => {
            if (notify && callIdRef.current) {
                emitSignal("call-end");
            }
            resetCall();
        },
        [emitSignal, resetCall]
    );

    const getLocalMedia = useCallback(async (type) => {
        if (localStreamRef.current) {
            return localStreamRef.current;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Calling is not supported by this browser");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: type === "video",
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOff(type !== "video");
        return stream;
    }, []);

    const flushIce = useCallback(async (peerId, peer) => {
        const queued = pendingIceRef.current.get(peerId) || [];
        pendingIceRef.current.delete(peerId);

        for (const candidate of queued) {
            try {
                await peer.addIceCandidate(candidate);
            } catch (error) {
                console.error("Could not add queued ICE candidate:", error);
            }
        }
    }, []);

    const createPeer = useCallback(
        (peerId, callId) => {
            if (!peerId || peerId === currentUserId) {
                return null;
            }

            const existing = peersRef.current.get(peerId);
            if (existing && existing.connectionState !== "closed") {
                return existing;
            }

            const peer = new RTCPeerConnection({
                iceServers: ICE_SERVERS,
                iceTransportPolicy: ICE_TRANSPORT_POLICY,
            });

            peersRef.current.set(peerId, peer);

            for (const track of localStreamRef.current?.getTracks() || []) {
                peer.addTrack(track, localStreamRef.current);
            }

            peer.onicecandidate = ({ candidate }) => {
                if (!candidate) {
                    return;
                }

                emitSignal(
                    "call-ice-candidate",
                    {
                        callId,
                        candidate: candidate.toJSON(),
                    },
                    peerId
                );
            };

            peer.ontrack = ({ track, streams, transceiver }) => {
                const publishScreenTrack = () => {
                    if (!remoteScreenActiveRef.current.get(peerId)) {
                        return;
                    }

                    setRemoteScreenStreams((current) => ({
                        ...current,
                        [peerId]: new MediaStream([track]),
                    }));
                };

                const screenMid = remoteScreenMidsRef.current.get(peerId);
                if (screenMid && transceiver?.mid === screenMid) {
                    remoteScreenTracksRef.current.set(peerId, track);

                    track.onunmute = publishScreenTrack;
                    track.onended = () => {
                        if (
                            remoteScreenTracksRef.current.get(peerId)?.id ===
                            track.id
                        ) {
                            remoteScreenTracksRef.current.delete(peerId);
                        }

                        setRemoteScreenStreams((current) => {
                            const next = { ...current };
                            delete next[peerId];
                            return next;
                        });
                    };

                    publishScreenTrack();
                    return;
                }

                const incomingStream = streams[0] || new MediaStream([track]);

                setRemoteStreams((current) => {
                    const existingStream = current[peerId];
                    if (!existingStream) {
                        return {
                            ...current,
                            [peerId]: incomingStream,
                        };
                    }

                    if (
                        !existingStream
                            .getTracks()
                            .some((item) => item.id === track.id)
                    ) {
                        existingStream.addTrack(track);
                    }

                    return {
                        ...current,
                        [peerId]: existingStream,
                    };
                });
            };

            peer.onconnectionstatechange = () => {
                if (peer.connectionState === "connected") {
                    setStatus("connected");
                }

                if (peer.connectionState === "failed") {
                    console.error("WebRTC connection failed", { peerId });
                }

                if (peer.connectionState === "closed") {
                    setRemoteStreams((current) => {
                        const next = { ...current };
                        delete next[peerId];
                        return next;
                    });
                }
            };

            return peer;
        },
        [currentUserId, emitSignal]
    );

    const makeOffer = useCallback(
        async (peerId, callId) => {
            const peer = createPeer(peerId, callId);
            if (!peer) {
                return;
            }

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            emitSignal(
                "call-offer",
                {
                    callId,
                    type: peer.localDescription.type,
                    sdp: peer.localDescription.sdp,
                },
                peerId
            );
        },
        [createPeer, emitSignal]
    );

    const startCall = useCallback(
        async (type = "video") => {
            if (!currentUserId || !targetId || callIdRef.current) {
                return;
            }

            try {
                callTypeRef.current = type;
                setCallType(type);
                await getLocalMedia(type);

                const callId = makeCallId(currentUserId, type);
                callIdRef.current = callId;
                setStatus("calling");

                emitSignal("call-invite", {
                    callId,
                    callType: type,
                });
            } catch (error) {
                resetCall();
                throw error;
            }
        },
        [currentUserId, emitSignal, getLocalMedia, resetCall, targetId]
    );

    const acceptCall = useCallback(async () => {
        const incoming = incomingCall;
        if (!incoming) {
            return;
        }

        try {
            const type = incoming.callType || "video";
            callTypeRef.current = type;
            callIdRef.current = incoming.callId;
            setCallType(type);

            await getLocalMedia(type);

            setIncomingCall(null);
            setStatus("connecting");

            emitSignal(
                "call-accept",
                { callId: incoming.callId },
                incoming.callerId
            );
        } catch (error) {
            emitSignal(
                "call-reject",
                { callId: incoming.callId },
                incoming.callerId
            );
            resetCall();
            throw error;
        }
    }, [emitSignal, getLocalMedia, incomingCall, resetCall]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) {
            return;
        }

        emitSignal(
            "call-reject",
            { callId: incomingCall.callId },
            incomingCall.callerId
        );
        setIncomingCall(null);
    }, [emitSignal, incomingCall]);

    const toggleMute = useCallback(() => {
        setIsMuted((muted) => {
            const next = !muted;
            localStreamRef.current
                ?.getAudioTracks()
                .forEach((track) => {
                    track.enabled = !next;
                });
            return next;
        });
    }, []);

    const toggleCamera = useCallback(() => {
        setIsCameraOff((off) => {
            const next = !off;
            localStreamRef.current
                ?.getVideoTracks()
                .forEach((track) => {
                    track.enabled = !next;
                });
            return next;
        });
    }, []);

    const toggleScreenShare = useCallback(async () => {
        if (screenTrackRef.current) {
            await stopScreenShare();
            return;
        }

        if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error("Screen sharing is not supported by this browser");
        }

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        if (!screenTrack) {
            displayStream.getTracks().forEach((track) => track.stop());
            return;
        }

        try {
            for (const [peerId, peer] of peersRef.current.entries()) {
                const existing = screenSendersRef.current.get(peerId);

                if (existing) {
                    await existing.sender.replaceTrack(screenTrack);

                    emitSignal(
                        "call-screen-share",
                        {
                            callId: callIdRef.current,
                            screenSharing: true,
                            screenMid: existing.transceiver.mid,
                        },
                        peerId
                    );
                    continue;
                }

                if (peer.signalingState !== "stable") {
                    throw new Error(
                        `Cannot start screen sharing while peer ${peerId} is ${peer.signalingState}`
                    );
                }

                const sender = peer.addTrack(screenTrack, displayStream);
                const transceiver = peer
                    .getTransceivers()
                    .find((item) => item.sender === sender);

                if (!transceiver) {
                    throw new Error("Could not create screen-share transceiver");
                }

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                screenSendersRef.current.set(peerId, {
                    sender,
                    transceiver,
                });

                emitSignal(
                    "call-offer",
                    {
                        callId: callIdRef.current,
                        type: peer.localDescription.type,
                        sdp: peer.localDescription.sdp,
                        screenMid: transceiver.mid,
                    },
                    peerId
                );

                emitSignal(
                    "call-screen-share",
                    {
                        callId: callIdRef.current,
                        screenSharing: true,
                        screenMid: transceiver.mid,
                    },
                    peerId
                );
            }
        } catch (error) {
            screenTrack.stop();
            setScreenStream(null);
            throw error;
        }

        screenTrackRef.current = screenTrack;
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        screenTrack.onended = () => {
            stopScreenShare().catch(console.error);
        };
    }, [emitSignal, stopScreenShare]);

    useEffect(() => {
        if (!enabled || !currentUserId || !targetId) {
            return undefined;
        }

        const isOurCall = (payload) =>
            Boolean(
                payload?.callId &&
                callIdRef.current &&
                payload.callId === callIdRef.current
            );

        const isInviteForThisChat = (payload) => {
            if (!payload || payload.callerId === currentUserId) {
                return false;
            }

            if (isGroup) {
                return payload.groupId === targetId;
            }

            return (
                payload.callerId === targetId &&
                payload.targetUserId === currentUserId
            );
        };

        const onInvite = (payload) => {
            if (callIdRef.current || !isInviteForThisChat(payload)) {
                return;
            }

            callIdRef.current = payload.callId;
            callTypeRef.current = payload.callType || "video";
            setCallType(callTypeRef.current);
            setIncomingCall({
                ...payload,
                callerName:
                    participantNames.get(payload.callerId)?.name ||
                    "Incoming call",
            });
            setStatus("ringing");
        };

        const onAccept = async (payload) => {
            if (!isOurCall(payload) || payload.callerId === currentUserId) {
                return;
            }

            try {
                setStatus("connecting");
                await makeOffer(payload.callerId, payload.callId);
            } catch (error) {
                console.error("Could not create WebRTC offer:", error);
                endCall(true);
            }
        };

        const onOffer = async (payload) => {
            if (!isOurCall(payload) || payload.callerId === currentUserId) {
                return;
            }

            try {
                const peerId = payload.callerId;

                if (payload.screenMid) {
                    remoteScreenMidsRef.current.set(
                        peerId,
                        payload.screenMid
                    );
                    remoteScreenActiveRef.current.set(peerId, true);
                }

                const peer = createPeer(peerId, payload.callId);
                if (!peer) {
                    return;
                }

                await peer.setRemoteDescription({
                    type: "offer",
                    sdp: payload.sdp,
                });
                await flushIce(peerId, peer);

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);

                emitSignal(
                    "call-answer",
                    {
                        callId: payload.callId,
                        type: peer.localDescription.type,
                        sdp: peer.localDescription.sdp,
                    },
                    peerId
                );
            } catch (error) {
                console.error("Could not handle WebRTC offer:", error);
                endCall(true);
            }
        };

        const onAnswer = async (payload) => {
            if (!isOurCall(payload) || payload.callerId === currentUserId) {
                return;
            }

            const peer = peersRef.current.get(payload.callerId);
            if (!peer) {
                return;
            }

            try {
                await peer.setRemoteDescription({
                    type: "answer",
                    sdp: payload.sdp,
                });
                await flushIce(payload.callerId, peer);
            } catch (error) {
                console.error("Could not handle WebRTC answer:", error);
                endCall(true);
            }
        };

        const onIceCandidate = async (payload) => {
            if (
                !isOurCall(payload) ||
                payload.callerId === currentUserId ||
                !payload.candidate
            ) {
                return;
            }

            const peerId = payload.callerId;
            const peer = peersRef.current.get(peerId);

            if (!peer || !peer.remoteDescription) {
                const queued = pendingIceRef.current.get(peerId) || [];
                queued.push(payload.candidate);
                pendingIceRef.current.set(peerId, queued);
                return;
            }

            try {
                await peer.addIceCandidate(payload.candidate);
            } catch (error) {
                console.error("Could not add ICE candidate:", error);
            }
        };

        const onScreenShare = (payload) => {
            if (!isOurCall(payload) || payload.callerId === currentUserId) {
                return;
            }

            const peerId = payload.callerId;

            if (payload.screenMid) {
                remoteScreenMidsRef.current.set(peerId, payload.screenMid);
            }

            const active = payload.screenSharing === true;
            remoteScreenActiveRef.current.set(peerId, active);

            if (!active) {
                setRemoteScreenStreams((current) => {
                    const next = { ...current };
                    delete next[peerId];
                    return next;
                });
                return;
            }

            const track = remoteScreenTracksRef.current.get(peerId);
            if (track && track.readyState === "live") {
                setRemoteScreenStreams((current) => ({
                    ...current,
                    [peerId]: new MediaStream([track]),
                }));
            }
        };

        const onReject = (payload) => {
            if (isOurCall(payload)) {
                resetCall();
            }
        };

        const onEnd = (payload) => {
            if (isOurCall(payload)) {
                resetCall();
            }
        };

        socket.on("call-invite", onInvite);
        socket.on("call-accept", onAccept);
        socket.on("call-offer", onOffer);
        socket.on("call-answer", onAnswer);
        socket.on("call-ice-candidate", onIceCandidate);
        socket.on("call-screen-share", onScreenShare);
        socket.on("call-reject", onReject);
        socket.on("call-end", onEnd);

        return () => {
            socket.off("call-invite", onInvite);
            socket.off("call-accept", onAccept);
            socket.off("call-offer", onOffer);
            socket.off("call-answer", onAnswer);
            socket.off("call-ice-candidate", onIceCandidate);
            socket.off("call-screen-share", onScreenShare);
            socket.off("call-reject", onReject);
            socket.off("call-end", onEnd);
        };
    }, [
        createPeer,
        currentUserId,
        emitSignal,
        enabled,
        endCall,
        flushIce,
        isGroup,
        makeOffer,
        participantNames,
        resetCall,
        targetId,
    ]);

    useEffect(() => {
        return () => {
            resetCall();
        };
    }, [resetCall]);

    return {
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
        endCall: () => endCall(true),
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        participantNames,
    };
}
