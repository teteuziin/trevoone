"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const AUDIO_SRC = "/audio/login-theme.mp3";
const TARGET_VOLUME = 0.15;
const STORAGE_KEY = "trevo_login_audio_enabled";

export function LoginAudioController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userDisabledRef = useRef(false);

  // Clear any ongoing fade intervals safely
  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Smooth fade-in
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

  // Smooth fade-out and stop
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

  // Start playback
  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || userDisabledRef.current) return;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        fadeIn(audio);
      })
      .catch(() => {
        // Silently caught if browser policy rejects autoplay or file absent
        setIsPlaying(false);
      });
  }, [fadeIn]);

  // Pause playback
  const pauseAudio = useCallback(() => {
    clearFade();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, [clearFade]);

  // User click toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      userDisabledRef.current = true;
      try {
        localStorage.setItem(STORAGE_KEY, "false");
      } catch {
        // storage fallback
      }
      pauseAudio();
    } else {
      userDisabledRef.current = false;
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // storage fallback
      }
      playAudio();
    }
  };

  useEffect(() => {
    // 1. Check local preference
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "false") {
        userDisabledRef.current = true;
      }
    } catch {
      // storage fallback
    }

    // 2. Initialize Audio element
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;

    // Detect error silently
    const handleError = () => {
      setIsPlaying(false);
    };
    audio.addEventListener("error", handleError);

    // 3. Attempt autoplay if not user disabled
    if (!userDisabledRef.current) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio);
        })
        .catch(() => {
          // Autoplay blocked by browser policy: listen for first valid user interaction
          const handleFirstInteraction = () => {
            window.removeEventListener("click", handleFirstInteraction);
            window.removeEventListener("touchstart", handleFirstInteraction);
            window.removeEventListener("keydown", handleFirstInteraction);

            if (!userDisabledRef.current && audioRef.current && audioRef.current.paused) {
              playAudio();
            }
          };

          window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
          window.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });
          window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });
        });
    }

    // 4. Page Visibility Handling (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      } else {
        if (!userDisabledRef.current && audioRef.current && audioRef.current.paused && isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Listen for login submission trigger to smoothly fade out
    const handleFadeOutEvent = () => {
      fadeOutAndStop();
    };
    window.addEventListener("trevo-login-fade-out", handleFadeOutEvent);

    return () => {
      clearFade();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("trevo-login-fade-out", handleFadeOutEvent);
      audio.removeEventListener("error", handleError);
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
        title={isPlaying ? "Pausar música" : "Tocar música"}
        aria-label={isPlaying ? "Pausar música" : "Tocar música"}
        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
          isPlaying
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15"
            : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80"
        }`}
      >
        {isPlaying ? (
          <>
            {/* Animated Equalizer Wave Bars */}
            <span className="flex items-end gap-0.5 h-3.5 w-3.5" aria-hidden="true">
              <span className="w-0.5 bg-emerald-400 rounded-full h-full animate-pulse" />
              <span className="w-0.5 bg-emerald-400 rounded-full h-2/3 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 bg-emerald-400 rounded-full h-4/5 animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="hidden sm:inline text-[11px] font-medium tracking-wide">
              Música ambiente
            </span>
          </>
        ) : (
          <>
            {/* Muted Speaker Icon */}
            <svg
              className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
            <span className="hidden sm:inline text-[11px] font-normal tracking-wide">
              Ativar música
            </span>
          </>
        )}
      </button>
    </div>
  );
}
