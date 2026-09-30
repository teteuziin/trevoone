"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const AUDIO_SRC = "/audio/login-theme.mp3";
const TARGET_VOLUME = 0.15;
const STORAGE_KEY = "trevo_login_audio_enabled";

export function LoginAudioController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPausedRef = useRef(false);

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeIn = useCallback(
    (audio: HTMLAudioElement) => {
      clearFade();
      audio.volume = 0;
      const step = 0.015;
      const intervalMs = 60;

      fadeIntervalRef.current = setInterval(() => {
        if (!audioRef.current) {
          clearFade();
          return;
        }
        if (audio.volume + step >= TARGET_VOLUME) {
          audio.volume = TARGET_VOLUME;
          clearFade();
        } else {
          audio.volume = Math.min(TARGET_VOLUME, audio.volume + step);
        }
      }, intervalMs);
    },
    [clearFade]
  );

  const fadeOutAndStop = useCallback(() => {
    clearFade();
    const audio = audioRef.current;
    if (!audio) return;

    const step = 0.025;
    const intervalMs = 40;

    fadeIntervalRef.current = setInterval(() => {
      if (!audioRef.current) {
        clearFade();
        return;
      }
      if (audio.volume - step <= 0.01) {
        audio.volume = 0;
        audio.pause();
        setIsPlaying(false);
        clearFade();
      } else {
        audio.volume = Math.max(0, audio.volume - step);
      }
    }, intervalMs);
  }, [clearFade]);

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || userPausedRef.current) return;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        fadeIn(audio);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  }, [fadeIn]);

  const pauseAudio = useCallback(() => {
    clearFade();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, [clearFade]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      userPausedRef.current = true;
      try {
        localStorage.setItem(STORAGE_KEY, "false");
      } catch {
        // storage fallback
      }
      pauseAudio();
    } else {
      userPausedRef.current = false;
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // storage fallback
      }
      playAudio();
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "false") {
        userPausedRef.current = true;
      }
    } catch {
      // storage fallback
    }

    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setIsPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Helper for first user interaction fallback when browser blocks autoplay
    let interactionHandlersRegistered = false;

    const handleFirstInteraction = () => {
      cleanupInteractionListeners();
      if (!userPausedRef.current && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          fadeIn(audioRef.current!);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const cleanupInteractionListeners = () => {
      if (interactionHandlersRegistered) {
        window.removeEventListener("pointerdown", handleFirstInteraction);
        window.removeEventListener("touchstart", handleFirstInteraction);
        window.removeEventListener("click", handleFirstInteraction);
        window.removeEventListener("keydown", handleFirstInteraction);
        interactionHandlersRegistered = false;
      }
    };

    if (!userPausedRef.current) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio);
        })
        .catch(() => {
          // Autoplay blocked by browser policy: register single-fire interaction listeners
          interactionHandlersRegistered = true;
          window.addEventListener("pointerdown", handleFirstInteraction, { once: true, passive: true });
          window.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });
          window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
          window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });
        });
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      } else {
        if (!userPausedRef.current && audioRef.current && audioRef.current.paused && isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleFadeOutEvent = () => {
      fadeOutAndStop();
    };
    window.addEventListener("trevo-login-fade-out", handleFadeOutEvent);

    return () => {
      clearFade();
      cleanupInteractionListeners();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("trevo-login-fade-out", handleFadeOutEvent);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [clearFade, fadeIn, fadeOutAndStop, playAudio, isPlaying]);

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={togglePlay}
        title={isPlaying ? "Pausar música" : "Ativar música"}
        aria-label={isPlaying ? "Pausar música" : "Ativar música"}
        className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]/50 ${
          isPlaying
            ? "bg-[#00E676]/10 border-[#00E676]/40 text-[#00E676] hover:bg-[#00E676]/20 shadow-[0_0_15px_rgba(0,230,118,0.15)]"
            : "bg-[#0e1015]/90 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white hover:bg-[#141720]"
        }`}
      >
        {isPlaying ? (
          <>
            <span className="flex items-end gap-0.5 h-3.5 w-3.5" aria-hidden="true">
              <span className="w-0.5 bg-[#00E676] rounded-full h-full animate-pulse" />
              <span className="w-0.5 bg-[#00E676] rounded-full h-2/3 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 bg-[#00E676] rounded-full h-4/5 animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-[11px] font-medium tracking-wide">
              Pausar música
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
            <span className="text-[11px] font-normal tracking-wide">
              Ativar música
            </span>
          </>
        )}
      </button>
    </div>
  );
}
