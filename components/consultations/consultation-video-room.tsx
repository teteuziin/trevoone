"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export interface ConsultationVideoRoomProps {
  consultancySlug: string;
  consultationPublicId: string;
  title: string;
  counterpartName: string;
  counterpartRole: string;
  participantRole: "STUDENT" | "PROFESSIONAL";
  scheduledStartFormatted: string;
  scheduledEndFormatted: string;
  timezone: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
}

type RoomState =
  | "IDLE"
  | "REQUESTING_MEDIA"
  | "PREPARING"
  | "WAITING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ENDED"
  | "ERROR";

interface SignalingMessage {
  id: string;
  sender: "STUDENT" | "PROFESSIONAL";
  type: "OFFER" | "ANSWER" | "ICE_CANDIDATE" | "ICE_COMPLETE";
  payload: unknown;
  cursor: string;
  createdAt: string;
}

export function ConsultationVideoRoom({
  consultancySlug,
  consultationPublicId,
  title,
  counterpartName,
  counterpartRole,
  participantRole,
  scheduledStartFormatted,
  scheduledEndFormatted,
  consultancyName,
}: ConsultationVideoRoomProps) {
  const [roomState, setRoomState] = useState<RoomState>("IDLE");
  const [statusMessage, setStatusMessage] = useState<string>("Pronto para ingressar");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const sessionPublicIdRef = useRef<string | null>(null);
  const currentGenerationRef = useRef<number>(1);
  const signalingCursorRef = useRef<string | undefined>(undefined);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingRemoteIceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = useRef<boolean>(false);

  const isConnectedRef = useRef<boolean>(false);
  const isStartedOnServerRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // References for cross-dependent handlers
  const prepareSessionRef = useRef<((action?: "PREPARE" | "RESET") => Promise<void>) | null>(null);
  const triggerReconnectRef = useRef<(() => void) | null>(null);

  // Stop all media tracks and close peer connection
  const cleanupAll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {}
      dataChannelRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    pendingRemoteIceQueueRef.current = [];
    hasRemoteDescriptionRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  // Publish a signaling message via existing POST /signaling/messages route
  const publishSignal = useCallback(
    async (
      type: "OFFER" | "ANSWER" | "ICE_CANDIDATE" | "ICE_COMPLETE",
      payload: unknown
    ): Promise<boolean> => {
      const sessionPublicId = sessionPublicIdRef.current;
      if (!sessionPublicId) return false;

      const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      try {
        const res = await fetch(
          `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/signaling/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionPublicId,
              clientMessageId,
              type,
              payload,
            }),
            cache: "no-store",
          }
        );
        return res.ok;
      } catch {
        return false;
      }
    },
    [consultancySlug, consultationPublicId]
  );

  // Flush queued remote ICE candidates after remote description is set
  const flushPendingIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (pendingRemoteIceQueueRef.current.length > 0) {
      const cand = pendingRemoteIceQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(cand);
        } catch {}
      }
    }
  }, []);

  // Handle incoming signaling message
  const handleIncomingMessage = useCallback(
    async (msg: SignalingMessage) => {
      const pc = pcRef.current;
      if (!pc) return;

      // Avoid processing own messages or duplicate messages
      if (msg.sender === participantRole) return;
      if (processedMessageIdsRef.current.has(msg.id)) return;
      processedMessageIdsRef.current.add(msg.id);

      if (msg.type === "OFFER" && participantRole === "STUDENT") {
        try {
          const offerPayload = msg.payload as RTCSessionDescriptionInit;
          if (offerPayload?.sdp) {
            setRoomState("CONNECTING");
            setStatusMessage("Conectando ao profissional...");
            await pc.setRemoteDescription(new RTCSessionDescription(offerPayload));
            hasRemoteDescriptionRef.current = true;
            await flushPendingIceCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await publishSignal("ANSWER", {
              type: answer.type,
              sdp: answer.sdp,
            });
          }
        } catch (err) {
          console.error("Failed to process offer:", err);
        }
      } else if (msg.type === "ANSWER" && participantRole === "PROFESSIONAL") {
        try {
          const answerPayload = msg.payload as RTCSessionDescriptionInit;
          if (answerPayload?.sdp && pc.signalingState === "have-local-offer") {
            setRoomState("CONNECTING");
            setStatusMessage("Finalizando conexão segura...");
            await pc.setRemoteDescription(new RTCSessionDescription(answerPayload));
            hasRemoteDescriptionRef.current = true;
            await flushPendingIceCandidates();
          }
        } catch (err) {
          console.error("Failed to process answer:", err);
        }
      } else if (msg.type === "ICE_CANDIDATE") {
        try {
          const candPayload = msg.payload as RTCIceCandidateInit;
          if (candPayload?.candidate) {
            if (hasRemoteDescriptionRef.current && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candPayload));
            } else {
              pendingRemoteIceQueueRef.current.push(candPayload);
            }
          }
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      }
    },
    [flushPendingIceCandidates, participantRole, publishSignal]
  );

  // Poll signaling messages
  const pollSignaling = useCallback(async () => {
    const sessionPublicId = sessionPublicIdRef.current;
    if (!sessionPublicId || isConnectedRef.current) return;

    const url = new URL(
      `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/signaling/messages`,
      window.location.origin
    );
    url.searchParams.set("session", sessionPublicId);
    if (signalingCursorRef.current) {
      url.searchParams.set("after", signalingCursorRef.current);
    }

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 400) {
          // Session might have been closed/reset by counterpart
          if (participantRole === "STUDENT" && roomState !== "ENDED") {
            // Re-prepare session on generation change
            prepareSessionRef.current?.("PREPARE");
          }
        }
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        if (data.nextCursor) {
          signalingCursorRef.current = data.nextCursor;
        }
        for (const msg of data.messages) {
          await handleIncomingMessage(msg);
        }
      }
    } catch {}
  }, [consultancySlug, consultationPublicId, handleIncomingMessage, participantRole, roomState]);

  // Start server call lifecycle transition (SCHEDULED -> IN_PROGRESS)
  const notifyServerCallStarted = useCallback(async () => {
    if (isStartedOnServerRef.current) return;
    try {
      const res = await fetch(
        `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/call`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "START" }),
          cache: "no-store",
        }
      );
      if (res.ok) {
        isStartedOnServerRef.current = true;
      }
    } catch {}
  }, [consultancySlug, consultationPublicId]);

  // Setup DataChannel listeners
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "CALL_ENDED") {
          cleanupAll();
          setRoomState("ENDED");
          setStatusMessage("A consulta foi encerrada pela contraparte.");
        }
      } catch {}
    };
  }, [cleanupAll]);

  // Setup WebRTC PeerConnection
  const setupPeerConnection = useCallback(
    async (iceServers: RTCIceServer[], action: "PREPARE" | "RESET" = "PREPARE") => {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      hasRemoteDescriptionRef.current = false;
      pendingRemoteIceQueueRef.current = [];

      // Add local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote media tracks
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });

        // Trigger remote video play and handle potential autoplay block
        if (remoteVideoRef.current) {
          remoteVideoRef.current
            .play()
            .then(() => setIsAutoplayBlocked(false))
            .catch(() => setIsAutoplayBlocked(true));
        }
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          publishSignal("ICE_CANDIDATE", {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          });
        } else {
          publishSignal("ICE_COMPLETE", {});
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          isConnectedRef.current = true;
          reconnectAttemptsRef.current = 0;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setRoomState("CONNECTED");
          setStatusMessage("Conectado");
          notifyServerCallStarted();
        } else if (state === "disconnected") {
          setRoomState("RECONNECTING");
          setStatusMessage("Reconectando chamada...");
          // Grace period of 5 seconds
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (pc.connectionState !== "connected") {
                triggerReconnectRef.current?.();
              }
            }, 5000);
          }
        } else if (state === "failed") {
          setRoomState("RECONNECTING");
          setStatusMessage("Falha na conexão. Reconectando...");
          triggerReconnectRef.current?.();
        }
      };

      // Configure roles
      if (participantRole === "PROFESSIONAL") {
        const dc = pc.createDataChannel("trevo-control");
        setupDataChannel(dc);

        setRoomState("WAITING");
        setStatusMessage("Aguardando o aluno...");

        const offer = await pc.createOffer(
          action === "RESET" ? { iceRestart: true } : undefined
        );
        await pc.setLocalDescription(offer);

        await publishSignal("OFFER", {
          type: offer.type,
          sdp: offer.sdp,
        });
      } else {
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };
        setRoomState("WAITING");
        setStatusMessage("Aguardando o profissional...");
      }

      // Start signaling polling loop
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(pollSignaling, 800);
      pollSignaling();
    },
    [notifyServerCallStarted, participantRole, pollSignaling, publishSignal, setupDataChannel]
  );

  // Request ICE and Signaling Session, then initialize PeerConnection
  const prepareSession = useCallback(
    async (action: "PREPARE" | "RESET" = "PREPARE") => {
      try {
        setRoomState(action === "RESET" ? "RECONNECTING" : "PREPARING");
        setStatusMessage(
          action === "RESET" ? "Reiniciando sessão de sinalização..." : "Preparando conexão segura..."
        );

        // 1. Fetch authorized Cloudflare ICE config from same-origin Trevo endpoint
        const iceRes = await fetch(
          `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/ice-config`,
          {
            method: "POST",
            cache: "no-store",
          }
        );

        if (!iceRes.ok) {
          throw new Error("Não foi possível carregar as credenciais de conexão (ICE).");
        }

        const iceData = await iceRes.json();
        const iceServers: RTCIceServer[] = iceData.iceServers || [];

        // 2. Prepare signaling session
        const sigRes = await fetch(
          `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/signaling/session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
            cache: "no-store",
          }
        );

        if (!sigRes.ok) {
          const sigError = await sigRes.json().catch(() => ({}));
          throw new Error(sigError.message || "Não foi possível iniciar a sessão de sinalização.");
        }

        const sigData = await sigRes.json();
        sessionPublicIdRef.current = sigData.session.publicId;
        currentGenerationRef.current = sigData.session.generation;
        signalingCursorRef.current = undefined;
        processedMessageIdsRef.current.clear();
        pendingRemoteIceQueueRef.current = [];

        // 3. Setup RTCPeerConnection with real Cloudflare ICE servers
        await setupPeerConnection(iceServers, action);
      } catch (err: unknown) {
        cleanupAll();
        setRoomState("ERROR");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Ocorreu um erro ao conectar à sala de teleconsulta."
        );
      }
    },
    [cleanupAll, consultancySlug, consultationPublicId, setupPeerConnection]
  );

  useEffect(() => {
    prepareSessionRef.current = prepareSession;
  }, [prepareSession]);

  // Trigger bounded reconnection logic
  const triggerReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= 3) {
      cleanupAll();
      setRoomState("ERROR");
      setErrorMessage("Não foi possível restabelecer a conexão. Tente novamente.");
      return;
    }

    reconnectAttemptsRef.current += 1;
    isConnectedRef.current = false;

    if (participantRole === "PROFESSIONAL") {
      prepareSessionRef.current?.("RESET");
    } else {
      prepareSessionRef.current?.("PREPARE");
    }
  }, [cleanupAll, participantRole]);

  useEffect(() => {
    triggerReconnectRef.current = triggerReconnect;
  }, [triggerReconnect]);

  // User gesture action: Request camera/mic and begin connection
  const handleJoinCall = async () => {
    setErrorMessage(null);
    setRoomState("REQUESTING_MEDIA");
    setStatusMessage("Solicitando permissão de câmera e microfone...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
      setIsMicOn(true);

      // Begin session preparation
      await prepareSession("PREPARE");
    } catch (err: unknown) {
      cleanupAll();
      setRoomState("ERROR");
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setErrorMessage("Acesso à câmera ou microfone foi negado. Autorize no navegador para entrar.");
      } else {
        setErrorMessage("Não foi possível acessar a câmera ou microfone do dispositivo.");
      }
    }
  };

  // Toggle local mic
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  // Toggle local camera
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  // Confirm End Consultation
  const handleConfirmEnd = async () => {
    setIsEnding(true);
    try {
      // 1. Call server END authority
      await fetch(
        `/api/consultancies/${encodeURIComponent(consultancySlug)}/consultations/${encodeURIComponent(consultationPublicId)}/call`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "END" }),
          cache: "no-store",
        }
      );

      // 2. Notify remote counterpart via DataChannel
      if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
        try {
          dataChannelRef.current.send(JSON.stringify({ v: 1, type: "CALL_ENDED" }));
        } catch {}
      }

      // 3. Stop all media and set ENDED
      cleanupAll();
      setRoomState("ENDED");
      setStatusMessage("Consulta encerrada com sucesso.");
    } catch {
      cleanupAll();
      setRoomState("ENDED");
    } finally {
      setIsEnding(false);
      setShowEndModal(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-zinc-950 flex flex-col justify-between overflow-hidden">
      {/* Live Accessibility Status Announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      {/* Top Header Bar */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-400">
              {consultancyName} • {title}
            </span>
            <span className="text-sm font-bold text-white">
              {counterpartName} <span className="text-xs font-normal text-zinc-300">({counterpartRole})</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Connection Status Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border ${
              roomState === "CONNECTED"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : roomState === "CONNECTING" || roomState === "RECONNECTING" || roomState === "PREPARING" || roomState === "REQUESTING_MEDIA"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse"
                : roomState === "WAITING"
                ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                : roomState === "ENDED"
                ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                : "bg-zinc-800/80 border-zinc-700 text-zinc-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                roomState === "CONNECTED"
                  ? "bg-emerald-400"
                  : roomState === "WAITING"
                  ? "bg-sky-400"
                  : roomState === "CONNECTING" || roomState === "RECONNECTING"
                  ? "bg-amber-400"
                  : "bg-zinc-500"
              }`}
            />
            <span>{statusMessage}</span>
          </div>
        </div>
      </header>

      {/* Main Video Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950">
        {/* Remote Video Element (Protagonist) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            roomState === "CONNECTED" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Autoplay Audio Blocked CTA */}
        {isAutoplayBlocked && roomState === "CONNECTED" && (
          <div className="absolute top-20 z-30">
            <button
              type="button"
              onClick={() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play();
                  setIsAutoplayBlocked(false);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--brand)] text-white shadow-lg flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
              <span>Tocar para ouvir o áudio</span>
            </button>
          </div>
        )}

        {/* Local Video Floating Card (PiP) */}
        {(roomState === "WAITING" ||
          roomState === "CONNECTING" ||
          roomState === "CONNECTED" ||
          roomState === "RECONNECTING") && (
          <div className="absolute top-20 right-4 sm:top-24 sm:right-6 z-20 w-32 sm:w-48 aspect-video rounded-2xl bg-zinc-900 border-2 border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${
                isCameraOn ? "opacity-100" : "opacity-0"
              }`}
            />
            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-900 text-zinc-400 text-[10px] font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </svg>
                <span>Câmera desligada</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white/80 bg-black/50 px-1.5 py-0.5 rounded-md">
              Você {!isMicOn && "(Mudo)"}
            </div>
          </div>
        )}

        {/* State Overlay: IDLE (Safe user gesture) */}
        {roomState === "IDLE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 space-y-5 z-30">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[var(--brand)] shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Entrar na Sala de Teleconsulta
              </h2>
              <p className="text-xs text-zinc-400">
                Atendimento agendado: <strong className="text-zinc-300">{scheduledStartFormatted} - {scheduledEndFormatted}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleJoinCall}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand)] text-white hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <span>Ativar câmera e entrar</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <Link
              href={`/consultoria/${consultancySlug}/consultas`}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Voltar para a agenda
            </Link>
          </div>
        )}

        {/* State Overlay: WAITING */}
        {roomState === "WAITING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 space-y-4">
            <div className="w-16 h-16 rounded-full border-3 border-sky-400 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {participantRole === "PROFESSIONAL"
                  ? "Aguardando a entrada do aluno..."
                  : "Aguardando o início pelo profissional..."}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                A transmissão começará automaticamente assim que ambos estiverem conectados.
              </p>
            </div>
          </div>
        )}

        {/* State Overlay: CONNECTING / RECONNECTING */}
        {(roomState === "CONNECTING" || roomState === "RECONNECTING" || roomState === "REQUESTING_MEDIA" || roomState === "PREPARING") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90 backdrop-blur-xs space-y-4">
            <div className="w-14 h-14 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {statusMessage}
              </h3>
              <p className="text-xs text-zinc-400">
                Estabelecendo canal seguro ponto a ponto.
              </p>
            </div>
          </div>
        )}

        {/* State Overlay: ENDED */}
        {roomState === "ENDED" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 space-y-5 z-40">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Consulta finalizada
              </h2>
              <p className="text-xs text-zinc-400">
                O atendimento foi concluído. As informações foram salvas com sucesso.
              </p>
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/consultas`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand)] text-white hover:opacity-90 transition-all shadow-md"
            >
              <span>Voltar para consultas</span>
            </Link>
          </div>
        )}

        {/* State Overlay: ERROR */}
        {roomState === "ERROR" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 space-y-5 z-40">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="text-base font-bold text-white">
                Não foi possível realizar a chamada
              </h2>
              <p className="text-xs text-red-300">
                {errorMessage || "Ocorreu uma falha na conexão de vídeo."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleJoinCall}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
              >
                Tentar novamente
              </button>
              <Link
                href={`/consultoria/${consultancySlug}/consultas`}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Voltar para consultas
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer className="relative z-30 w-full p-4 sm:p-6 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur-md flex items-center justify-center gap-4">
        {/* Toggle Microphone Button */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={roomState === "IDLE" || roomState === "ENDED" || roomState === "ERROR"}
          aria-label={isMicOn ? "Desativar microfone" : "Ativar microfone"}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
            isMicOn
              ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
              : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            {isMicOn ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </>
            )}
          </svg>
          <span className="hidden sm:inline">{isMicOn ? "Mutar áudio" : "Ativar áudio"}</span>
        </button>

        {/* Toggle Camera Button */}
        <button
          type="button"
          onClick={toggleCamera}
          disabled={roomState === "IDLE" || roomState === "ENDED" || roomState === "ERROR"}
          aria-label={isCameraOn ? "Desativar câmera" : "Ativar câmera"}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
            isCameraOn
              ? "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
              : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            {isCameraOn ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
            ) : (
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </>
            )}
          </svg>
          <span className="hidden sm:inline">{isCameraOn ? "Desligar vídeo" : "Ligar vídeo"}</span>
        </button>

        {/* End Call Button */}
        {roomState !== "ENDED" && (
          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            aria-label="Encerrar consulta"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            <span>Encerrar consulta</span>
          </button>
        )}
      </footer>

      {/* Confirmation Modal for Ending Call */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-white space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Deseja encerrar a consulta?
              </h3>
              <p className="text-xs text-zinc-400">
                A transmissão de vídeo será interrompida e o atendimento será marcado como finalizado.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={isEnding}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {isEnding ? "Encerrando..." : "Confirmar encerramento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
