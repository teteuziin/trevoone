"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export interface ConsultationDevicePreflightProps {
  consultancySlug: string;
  title: string;
  counterpartName: string;
  counterpartRole: string;
  scheduledStartFormatted: string;
  scheduledEndFormatted: string;
  timezone: string;
}

type PreflightStatus = "IDLE" | "REQUESTING" | "READY" | "ERROR";

export function ConsultationDevicePreflight({
  consultancySlug,
  title,
  counterpartName,
  counterpartRole,
  scheduledStartFormatted,
  scheduledEndFormatted,
  timezone,
}: ConsultationDevicePreflightProps) {
  const [status, setStatus] = useState<PreflightStatus>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const startMediaTest = async (preferredVideoId?: string, preferredAudioId?: string) => {
    setErrorMessage(null);

    // 1. Secure context verification
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setStatus("ERROR");
      setErrorMessage("O acesso à câmera e microfone requer conexão segura HTTPS.");
      return;
    }

    // 2. Feature detection
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("ERROR");
      setErrorMessage("Este navegador não oferece suporte ao acesso à câmera e ao microfone.");
      return;
    }

    setStatus("REQUESTING");

    // Clean any existing media before requesting new
    stopAllTracks();

    const videoConstraint: MediaTrackConstraints | boolean = preferredVideoId
      ? { deviceId: { exact: preferredVideoId } }
      : { facingMode: { ideal: "user" } };

    const audioConstraint: MediaTrackConstraints | boolean = preferredAudioId
      ? { deviceId: { exact: preferredAudioId } }
      : true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: audioConstraint,
      });

      streamRef.current = stream;

      // Verify track presence
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0 || audioTracks.length === 0) {
        setStatus("ERROR");
        setErrorMessage("Não foi possível detectar a câmera ou o microfone.");
        stopAllTracks();
        return;
      }

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Setup audio analyzer
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
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
          // Scale roughly to 0-100%
          const normalized = Math.min(100, Math.round((average / 128) * 100));
          setMicVolumeLevel(normalized);
          animationFrameRef.current = requestAnimationFrame(checkAudioVolume);
        };

        animationFrameRef.current = requestAnimationFrame(checkAudioVolume);
      } catch {
        // Non-critical AudioContext failure fallback
      }

      // Populate devices & select active device IDs
      await updateDeviceList();

      const activeVideoTrack = videoTracks[0];
      const activeAudioTrack = audioTracks[0];
      const currentVideoSettings = activeVideoTrack.getSettings ? activeVideoTrack.getSettings() : {};
      const currentAudioSettings = activeAudioTrack.getSettings ? activeAudioTrack.getSettings() : {};

      if (currentVideoSettings.deviceId) {
        setSelectedVideoDeviceId(currentVideoSettings.deviceId);
      }
      if (currentAudioSettings.deviceId) {
        setSelectedAudioDeviceId(currentAudioSettings.deviceId);
      }

      setIsCameraOn(true);
      setIsMicOn(true);
      setStatus("READY");
    } catch (err: unknown) {
      stopAllTracks();
      setStatus("ERROR");

      if (err instanceof DOMException || (err && typeof err === "object" && "name" in err)) {
        const errorName = (err as { name: string }).name;
        switch (errorName) {
          case "NotAllowedError":
          case "PermissionDeniedError":
            setErrorMessage("A câmera ou o microfone foram bloqueados. Autorize o acesso no navegador e tente novamente.");
            break;
          case "NotFoundError":
          case "DevicesNotFoundError":
            setErrorMessage("Não encontramos uma câmera ou microfone disponível no seu dispositivo.");
            break;
          case "NotReadableError":
          case "TrackStartError":
            setErrorMessage("Não foi possível usar o dispositivo. Ele pode estar sendo usado por outro aplicativo.");
            break;
          case "OverconstrainedError":
            setErrorMessage("As configurações solicitadas não são suportadas pela sua câmera ou microfone.");
            break;
          case "SecurityError":
            setErrorMessage("Acesso aos dispositivos bloqueado por política de segurança do navegador.");
            break;
          default:
            setErrorMessage("Não foi possível acessar a câmera ou o microfone. Verifique as permissões do dispositivo.");
        }
      } else {
        setErrorMessage("Ocorreu um erro ao inicializar o teste de dispositivos.");
      }
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
            status === "READY" && isCameraOn ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Camera Off Overlay */}
        {status === "READY" && !isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90 text-zinc-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
            <span className="text-xs font-semibold">Câmera desativada</span>
          </div>
        )}

        {/* Idle Overlay (Explicit user gesture required) */}
        {status === "IDLE" && (
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--brand)] text-white hover:opacity-90 transition-all shadow-sm"
            >
              Iniciar teste de câmera e microfone
            </button>
          </div>
        )}

        {/* Requesting Overlay */}
        {status === "REQUESTING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-[var(--brand)] border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-zinc-300">
              Solicitando autorização de câmera e microfone...
            </p>
          </div>
        )}

        {/* Error Overlay */}
        {status === "ERROR" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <p role="alert" className="text-xs text-red-300 max-w-md leading-relaxed">
              {errorMessage || "Não foi possível acessar a câmera ou o microfone."}
            </p>
            <button
              type="button"
              onClick={() => startMediaTest()}
              className="px-5 py-2 rounded-xl font-bold text-xs bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Live Audio Activity Meter Bar (bottom of video preview) */}
        {status === "READY" && (
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

      {/* Control Buttons & Device Selectors */}
      {status === "READY" && (
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-5">
          {/* Quick Toggle Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleCamera}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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

            <button
              type="button"
              onClick={toggleMic}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
                disabled={videoDevices.length <= 1}
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
                disabled={audioDevices.length <= 1}
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
            {status === "READY" ? "Dispositivos verificados com sucesso" : "Pré-teste de dispositivos"}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {status === "READY"
              ? "Sua câmera e microfone estão funcionando perfeitamente."
              : "Inicie o teste para conferir sua imagem e som."}
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

          <button
            type="button"
            disabled
            aria-disabled="true"
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition-all ${
              status === "READY"
                ? "bg-[var(--brand)] opacity-90 cursor-not-allowed"
                : "bg-zinc-700 opacity-50 cursor-not-allowed"
            }`}
          >
            Continuar para a consulta
          </button>
        </div>
      </div>
    </div>
  );
}
