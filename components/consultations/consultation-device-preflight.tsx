"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export interface ConsultationDevicePreflightProps {
  consultancySlug: string;
  consultationPublicId: string;
  title: string;
  counterpartName: string;
  counterpartRole: string;
  scheduledStartFormatted: string;
  scheduledEndFormatted: string;
  timezone: string;
}

export type DeviceState =
  | "IDLE"
  | "REQUESTING"
  | "READY"
  | "BLOCKED"
  | "NOT_FOUND"
  | "BUSY"
  | "ERROR";

export type OverallStatus = "IDLE" | "REQUESTING" | "READY" | "PARTIAL" | "ERROR";

function parseMediaError(
  err: unknown,
  deviceType: "CAMERA" | "MIC" | "BOTH"
): { state: DeviceState; message: string } {
  const name =
    err instanceof DOMException || (err && typeof err === "object" && "name" in err)
      ? String((err as { name: string }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        state: "BLOCKED",
        message:
          deviceType === "CAMERA"
            ? "Acesso à câmera bloqueado. Permita a câmera no ícone de configurações ou cadeado na barra de endereços do navegador."
            : deviceType === "MIC"
            ? "Acesso ao microfone bloqueado. Permita o microfone no ícone de configurações ou cadeado na barra de endereços do navegador."
            : "Acesso bloqueado. Permita a câmera e o microfone nas configurações do navegador.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        state: "NOT_FOUND",
        message:
          deviceType === "CAMERA"
            ? "Nenhuma câmera encontrada no seu dispositivo."
            : deviceType === "MIC"
            ? "Nenhum microfone encontrado no seu dispositivo."
            : "Câmera e microfone não foram encontrados no seu dispositivo.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        state: "BUSY",
        message:
          deviceType === "CAMERA"
            ? "A câmera pode estar sendo usada por outro aplicativo (como Zoom, Teams ou Meet)."
            : deviceType === "MIC"
            ? "O microfone pode estar sendo usado por outro aplicativo (como Zoom, Teams ou Meet)."
            : "O dispositivo pode estar sendo usado por outro aplicativo.",
      };
    case "OverconstrainedError":
      return {
        state: "ERROR",
        message: "Este dispositivo não suporta a configuração solicitada.",
      };
    case "SecurityError":
      return {
        state: "ERROR",
        message: "O navegador bloqueou o acesso por segurança (requer conexão segura HTTPS).",
      };
    case "AbortError":
      return {
        state: "ERROR",
        message: "A inicialização foi interrompida. Tente novamente.",
      };
    case "TypeError":
      return {
        state: "ERROR",
        message: "Configuração de dispositivo inválida.",
      };
    default:
      return {
        state: "ERROR",
        message: "Não foi possível iniciar este dispositivo. Verifique as permissões do sistema.",
      };
  }
}

export function ConsultationDevicePreflight({
  consultancySlug,
  consultationPublicId,
  title,
  counterpartName,
  counterpartRole,
  scheduledStartFormatted,
  scheduledEndFormatted,
  timezone,
}: ConsultationDevicePreflightProps) {
  const [overallStatus, setOverallStatus] = useState<OverallStatus>("IDLE");
  const [cameraState, setCameraState] = useState<DeviceState>("IDLE");
  const [micState, setMicState] = useState<DeviceState>("IDLE");

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>("");

  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopAllTracks = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMicVolumeLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, [stopAllTracks]);

  const updateDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices.filter((d) => d.kind === "videoinput");
      const aInputs = devices.filter((d) => d.kind === "audioinput");
      setVideoDevices(vInputs);
      setAudioDevices(aInputs);
    } catch {}
  }, []);

  // Listen to devicechange events if supported
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => {
      updateDeviceList();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [updateDeviceList]);

  // Starts media testing with decoupled and resilient device acquisition
  const startMediaTest = async (preferredVideoId?: string, preferredAudioId?: string) => {
    // 1. Immediate visual feedback
    setOverallStatus("REQUESTING");
    setCameraState("REQUESTING");
    setMicState("REQUESTING");
    setCameraError(null);
    setMicError(null);

    // Stop existing streams before requesting new ones
    stopAllTracks();

    // 2. Secure context verification
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      const secErr = "O acesso à câmera e ao microfone requer conexão segura HTTPS.";
      setOverallStatus("ERROR");
      setCameraState("ERROR");
      setMicState("ERROR");
      setCameraError(secErr);
      setMicError(secErr);
      return;
    }

    // 3. Feature detection
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const featErr = "Este navegador não oferece suporte ao acesso à câmera e ao microfone.";
      setOverallStatus("ERROR");
      setCameraState("ERROR");
      setMicState("ERROR");
      setCameraError(featErr);
      setMicError(featErr);
      return;
    }

    const videoConstraint: MediaTrackConstraints | boolean = preferredVideoId
      ? { deviceId: { exact: preferredVideoId } }
      : { facingMode: { ideal: "user" } };

    const audioConstraint: MediaTrackConstraints | boolean = preferredAudioId
      ? { deviceId: { exact: preferredAudioId } }
      : true;

    let videoTrack: MediaStreamTrack | null = null;
    let audioTrack: MediaStreamTrack | null = null;

    // Step A: Attempt combined acquisition first
    try {
      const combinedStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: audioConstraint,
      });
      const vTracks = combinedStream.getVideoTracks();
      const aTracks = combinedStream.getAudioTracks();
      if (vTracks.length > 0) videoTrack = vTracks[0];
      if (aTracks.length > 0) audioTrack = aTracks[0];
    } catch {
      // Step B: Combined failed — diagnose individually to isolate camera vs mic
    }

    // Step B1: Acquire video independently if not yet acquired
    if (!videoTrack) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
        const vTracks = vStream.getVideoTracks();
        if (vTracks.length > 0) {
          videoTrack = vTracks[0];
        } else {
          setCameraState("NOT_FOUND");
          setCameraError("Nenhuma câmera foi detectada no dispositivo.");
        }
      } catch (vErr) {
        const parsed = parseMediaError(vErr, "CAMERA");
        setCameraState(parsed.state);
        setCameraError(parsed.message);
      }
    }

    // Step B2: Acquire audio independently if not yet acquired
    if (!audioTrack) {
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
        const aTracks = aStream.getAudioTracks();
        if (aTracks.length > 0) {
          audioTrack = aTracks[0];
        } else {
          setMicState("NOT_FOUND");
          setMicError("Nenhum microfone foi detectado no dispositivo.");
        }
      } catch (aErr) {
        const parsed = parseMediaError(aErr, "MIC");
        setMicState(parsed.state);
        setMicError(parsed.message);
      }
    }

    // Step C: Process acquired video track
    if (videoTrack) {
      setCameraState("READY");
      setCameraError(null);
    }

    // Step D: Process acquired audio track
    if (audioTrack) {
      setMicState("READY");
      setMicError(null);

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        analyserRef.current = analyser;

        const micOnlyStream = new MediaStream([audioTrack]);
        const source = audioCtx.createMediaStreamSource(micOnlyStream);
        source.connect(analyser);
        sourceNodeRef.current = source;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((average / 128) * 100));
          setMicVolumeLevel(normalized);
          animationFrameRef.current = requestAnimationFrame(checkAudioVolume);
        };

        animationFrameRef.current = requestAnimationFrame(checkAudioVolume);
      } catch {
        // Non-critical AudioContext analyzer failure fallback
      }
    }

    // Step E: Combine active tracks into single MediaStream
    const activeTracks = [videoTrack, audioTrack].filter(Boolean) as MediaStreamTrack[];
    if (activeTracks.length > 0) {
      const activeStream = new MediaStream(activeTracks);
      streamRef.current = activeStream;

      if (videoTrack && videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(() => {
          // Play rejection due to browser policies does not invalidate permission
        });
      }
    }

    // Step F: Populate device selectors
    await updateDeviceList();

    if (videoTrack) {
      const currentVideoSettings = videoTrack.getSettings ? videoTrack.getSettings() : {};
      if (currentVideoSettings.deviceId) {
        setSelectedVideoDeviceId(currentVideoSettings.deviceId);
      }
    }

    if (audioTrack) {
      const currentAudioSettings = audioTrack.getSettings ? audioTrack.getSettings() : {};
      if (currentAudioSettings.deviceId) {
        setSelectedAudioDeviceId(currentAudioSettings.deviceId);
      }
    }

    setIsCameraOn(true);
    setIsMicOn(true);

    // Step G: Determine overall presentation status
    if (videoTrack && audioTrack) {
      setOverallStatus("READY");
    } else if (videoTrack || audioTrack) {
      setOverallStatus("PARTIAL");
    } else {
      setOverallStatus("ERROR");
    }
  };

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      if (!audioTrack.enabled) {
        setMicVolumeLevel(0);
      }
    }
  };

  const handleVideoDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedVideoDeviceId(newId);
    startMediaTest(newId, selectedAudioDeviceId);
  };

  const handleAudioDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedAudioDeviceId(newId);
    startMediaTest(selectedVideoDeviceId, newId);
  };

  const isBothReady = cameraState === "READY" && micState === "READY";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        eyebrow="Teleconsulta 1:1"
        title="Verificação de Dispositivos"
        description="Teste sua câmera e microfone antes de entrar no atendimento."
        backHref={`/consultoria/${consultancySlug}/consultas`}
        backLabel="Voltar para consultas"
      />

      {/* Summary Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-bold text-sm text-[var(--text-primary)]">
            {title || "Consulta 1:1"}
          </div>
          <p className="text-[var(--text-secondary)]">
            Participante: <strong className="text-[var(--text-primary)]">{counterpartName}</strong> ({counterpartRole})
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="font-semibold text-[var(--text-primary)]">
            {scheduledStartFormatted} - {scheduledEndFormatted}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Fuso: {timezone}
          </div>
        </div>
      </div>

      {/* Video Preview Container */}
      <div className="relative w-full aspect-video rounded-3xl bg-zinc-950 border-2 border-[var(--border-default)] overflow-hidden flex items-center justify-center shadow-md">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-200 ${
            cameraState === "READY" && isCameraOn ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Camera Off Overlay */}
        {cameraState === "READY" && !isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90 text-zinc-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
            <span className="text-xs font-semibold">Câmera desativada</span>
          </div>
        )}

        {/* Idle Overlay */}
        {overallStatus === "IDLE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[var(--brand)] shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Pronto para testar seus dispositivos?
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Clique no botão abaixo para verificar sua imagem e captação de voz antes do atendimento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => startMediaTest()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand)] text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              Iniciar teste de câmera e microfone
            </button>
          </div>
        )}

        {/* Requesting Overlay with Immediate Feedback */}
        {overallStatus === "REQUESTING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 space-y-4 animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-full border-3 border-[var(--brand)] border-t-transparent animate-spin" />
            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-sm font-bold text-white">
                Solicitando acesso à câmera e ao microfone...
              </h4>
              <p className="text-xs text-zinc-300 bg-zinc-800/80 px-3 py-2 rounded-xl border border-zinc-700/80 leading-relaxed">
                Se o navegador pedir permissão, clique em <strong className="text-[var(--brand)]">Permitir</strong> no topo da janela ou na barra de endereços.
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay (when both devices failed) */}
        {overallStatus === "ERROR" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-red-300">
                Não foi possível iniciar seus dispositivos
              </h4>
              <p role="alert" className="text-xs text-zinc-400 leading-relaxed">
                {cameraError || micError || "Verifique se a câmera e o microfone estão conectados e autorizados no navegador."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startMediaTest()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Live Audio Activity Meter Bar (bottom of video preview when mic is ready) */}
        {micState === "READY" && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className={`w-4 h-4 shrink-0 transition-colors ${isMicOn ? "text-emerald-400" : "text-zinc-500"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
              </svg>
              <span className="text-[11px] font-semibold truncate">
                {isMicOn ? "Microfone detectado" : "Microfone mutado"}
              </span>
            </div>

            {/* Visual audio bars indicator */}
            <div className="flex items-center gap-1 shrink-0" aria-label={`Nível de captação: ${micVolumeLevel}%`}>
              <div className="w-24 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${isMicOn ? micVolumeLevel : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Status Pills (Granular Camera & Microphone Indicators) */}
      {(overallStatus === "READY" || overallStatus === "PARTIAL" || overallStatus === "ERROR") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Camera Status Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
              cameraState === "READY"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                cameraState === "READY"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {cameraState === "READY" ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="font-bold text-xs">
                Câmera: {cameraState === "READY" ? "✓ Funcionando" : "✗ Não detectada ou bloqueada"}
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                {cameraState === "READY"
                  ? "Imagem de vídeo captada com sucesso."
                  : cameraError || "Permita o acesso à câmera nas configurações do navegador."}
              </p>
            </div>
          </div>

          {/* Microphone Status Card */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
              micState === "READY"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                micState === "READY"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {micState === "READY" ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="font-bold text-xs">
                Microfone: {micState === "READY" ? "✓ Funcionando" : "✗ Não detectado ou bloqueado"}
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                {micState === "READY"
                  ? "Captação de voz ativa e testada."
                  : micError || "Permita o acesso ao microfone nas configurações do navegador."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons & Device Selectors */}
      {(overallStatus === "READY" || overallStatus === "PARTIAL") && (
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-5">
          {/* Quick Toggle Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {cameraState === "READY" && (
              <button
                type="button"
                onClick={toggleCamera}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCameraOn
                    ? "bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-zinc-700"
                    : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 hover:bg-red-500/20"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                </svg>
                <span>{isCameraOn ? "Desligar câmera" : "Ligar câmera"}</span>
              </button>
            )}

            {micState === "READY" && (
              <button
                type="button"
                onClick={toggleMic}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isMicOn
                    ? "bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 border border-zinc-700"
                    : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 hover:bg-red-500/20"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                </svg>
                <span>{isMicOn ? "Mutar microfone" : "Ativar microfone"}</span>
              </button>
            )}

            {/* Retry Button to re-diagnose if anything failed */}
            {!isBothReady && (
              <button
                type="button"
                onClick={() => startMediaTest()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Tentar novamente</span>
              </button>
            )}
          </div>

          {/* Selectors for multiple devices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <label htmlFor="camera-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Câmera
              </label>
              <select
                id="camera-select"
                value={selectedVideoDeviceId}
                onChange={handleVideoDeviceChange}
                disabled={videoDevices.length <= 1 || cameraState !== "READY"}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] disabled:opacity-60"
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Câmera ${idx + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Câmera padrão</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="mic-select" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Microfone
              </label>
              <select
                id="mic-select"
                value={selectedAudioDeviceId}
                onChange={handleAudioDeviceChange}
                disabled={audioDevices.length <= 1 || micState !== "READY"}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] disabled:opacity-60"
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Microfone ${idx + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Microfone padrão</option>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Ready Action Bar */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-[var(--text-primary)]">
            {isBothReady
              ? "Dispositivos verificados com sucesso"
              : overallStatus === "PARTIAL"
              ? "Dispositivos parcialmente detectados"
              : overallStatus === "REQUESTING"
              ? "Verificando dispositivos..."
              : "Pré-teste de dispositivos"}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {isBothReady
              ? "Sua câmera e microfone estão funcionando perfeitamente."
              : overallStatus === "PARTIAL"
              ? "Para entrar na teleconsulta, ambos os dispositivos (câmera e microfone) devem estar funcionando."
              : overallStatus === "REQUESTING"
              ? "Aguardando confirmação de permissões no navegador."
              : "Inicie o teste para conferir sua imagem e som antes de entrar."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            onClick={() => stopAllTracks()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Voltar
          </Link>

          {isBothReady ? (
            <Link
              href={`/consultoria/${consultancySlug}/consultas/${consultationPublicId}/sala`}
              onClick={() => stopAllTracks()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--brand)] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Entrar na chamada</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-zinc-700 opacity-50 cursor-not-allowed shadow-xs"
            >
              Continuar para a consulta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
