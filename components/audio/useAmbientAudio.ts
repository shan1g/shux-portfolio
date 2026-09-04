"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ambientTracks } from "@/lib/audio/tracks";
import { publishAudioEnergy } from "@/lib/audio/audioEnergyBus";
import {
  getMutedServerSnapshot,
  getMutedSnapshot,
  setMutedPreference,
  subscribeMuted,
} from "@/lib/audio/mutePreference";

export const WAVEFORM_BARS = 32;

const BASE_VOLUME = 0.55;

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  );
}

export function useAmbientAudio() {
  const muted = useSyncExternalStore(
    subscribeMuted,
    getMutedSnapshot,
    getMutedServerSnapshot,
  );

  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bytesRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelsRef = useRef<Float32Array>(new Float32Array(WAVEFORM_BARS));
  const energyRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const trackIndexRef = useRef(0);
  const mutedRef = useRef(false);
  const resumeOnVisibleRef = useRef(false);
  const colorRef = useRef("#888888");
  const colorFrameRef = useRef(0);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    if (colorFrameRef.current % 30 === 0) {
      const resolved = getComputedStyle(canvas).color;
      if (resolved) colorRef.current = resolved;
    }
    colorFrameRef.current += 1;

    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.fillStyle = colorRef.current;

    const levels = levelsRef.current;
    const gap = Math.max(1, Math.round(2 * dpr));
    const barWidth = Math.max(
      1,
      (pixelWidth - gap * (WAVEFORM_BARS - 1)) / WAVEFORM_BARS,
    );
    const minHeight = Math.max(1, Math.round(dpr));

    for (let i = 0; i < WAVEFORM_BARS; i += 1) {
      const level = levels[i] ?? 0;
      const barHeight = Math.max(minHeight, level * pixelHeight);
      const x = i * (barWidth + gap);
      const y = (pixelHeight - barHeight) * 0.5;
      context.fillRect(x, y, barWidth, barHeight);
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null) return;

    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);

      const analyser = analyserRef.current;
      const bytes = bytesRef.current;
      const levels = levelsRef.current;

      if (analyser && bytes && !mutedRef.current) {
        analyser.getByteTimeDomainData(bytes);

        const step = Math.max(1, Math.floor(bytes.length / WAVEFORM_BARS));
        let sumSquares = 0;

        for (let bar = 0; bar < WAVEFORM_BARS; bar += 1) {
          let peak = 0;
          for (let i = 0; i < step; i += 1) {
            const sample = (bytes[bar * step + i] ?? 128) / 128 - 1;
            const magnitude = Math.abs(sample);
            if (magnitude > peak) peak = magnitude;
            sumSquares += sample * sample;
          }
          const target = Math.min(1, peak * 1.7);
          const current = levels[bar] ?? 0;
          levels[bar] = current + (target - current) * 0.35;
        }

        const rms = Math.sqrt(sumSquares / (WAVEFORM_BARS * step));
        const target = Math.min(1, rms * 3.2);
        energyRef.current += (target - energyRef.current) * 0.12;
      } else {
        for (let bar = 0; bar < WAVEFORM_BARS; bar += 1) {
          levels[bar] = (levels[bar] ?? 0) * 0.9;
        }
        energyRef.current *= 0.9;
      }

      publishAudioEnergy(energyRef.current);
      drawWaveform();
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [drawWaveform]);

  const ensureGraph = useCallback(() => {
    const existing = audioRef.current;
    if (existing) return existing;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = BASE_VOLUME;
    audio.muted = getMutedSnapshot();
    audio.src = ambientTracks[trackIndexRef.current]!.src;

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => {
      const next = (trackIndexRef.current + 1) % ambientTracks.length;
      trackIndexRef.current = next;
      setTrackIndex(next);
      audio.src = ambientTracks[next]!.src;
      void audio.play().catch(() => undefined);
    });

    audioRef.current = audio;

    try {
      const Ctor = resolveAudioContextCtor();
      if (Ctor) {
        const context = new Ctor();
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(context.destination);
        contextRef.current = context;
        analyserRef.current = analyser;
        bytesRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }
    } catch {
      // Analysis is optional — playback still works without the graph.
    }

    return audio;
  }, []);

  const play = useCallback(
    (audio: HTMLAudioElement) => {
      void contextRef.current?.resume().catch(() => undefined);
      void audio
        .play()
        .then(() => startLoop())
        .catch(() => undefined);
    },
    [startLoop],
  );

  const toggle = useCallback(() => {
    const audio = ensureGraph();
    setStarted(true);

    if (audio.paused) {
      play(audio);
      return;
    }

    resumeOnVisibleRef.current = false;
    audio.pause();
    stopLoop();
    energyRef.current = 0;
    levelsRef.current.fill(0);
    publishAudioEnergy(0);
    drawWaveform();
  }, [drawWaveform, ensureGraph, play, stopLoop]);

  const selectTrack = useCallback(
    (index: number) => {
      const next = ((index % ambientTracks.length) + ambientTracks.length) %
        ambientTracks.length;
      const audio = ensureGraph();
      trackIndexRef.current = next;
      setTrackIndex(next);
      setStarted(true);
      audio.src = ambientTracks[next]!.src;
      play(audio);
    },
    [ensureGraph, play],
  );

  const toggleMute = useCallback(() => {
    const next = !getMutedSnapshot();
    setMutedPreference(next);
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        if (audio.paused) return;
        resumeOnVisibleRef.current = true;
        audio.pause();
        stopLoop();
        publishAudioEnergy(0);
        return;
      }

      if (!resumeOnVisibleRef.current) return;
      resumeOnVisibleRef.current = false;
      play(audio);
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [play, stopLoop]);

  useEffect(() => {
    return () => {
      stopLoop();
      publishAudioEnergy(0);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
      void contextRef.current?.close().catch(() => undefined);
      audioRef.current = null;
      analyserRef.current = null;
      contextRef.current = null;
      bytesRef.current = null;
    };
  }, [stopLoop]);

  return {
    canvasRef,
    muted,
    playing,
    started,
    trackIndex,
    selectTrack,
    toggle,
    toggleMute,
  };
}
