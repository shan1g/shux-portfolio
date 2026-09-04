"use client";

import { useState } from "react";
import { ambientTracks } from "@/lib/audio/tracks";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAmbientAudio } from "./useAmbientAudio";

export function AudioPlayer() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const {
    canvasRef,
    muted,
    playing,
    started,
    trackIndex,
    selectTrack,
    toggle,
    toggleMute,
  } = useAmbientAudio();

  const current = ambientTracks[trackIndex]!;

  return (
    <div className="audio-player">
      {open ? (
        <div className="audio-player__panel">
          <p className="audio-player__panel-label">Now playing</p>
          <ul className="audio-player__list">
            {ambientTracks.map((track, index) => (
              <li key={track.src}>
                <button
                  type="button"
                  className={`audio-player__track${
                    index === trackIndex ? " audio-player__track--active" : ""
                  }`}
                  aria-current={index === trackIndex}
                  onClick={() => selectTrack(index)}
                >
                  <span className="audio-player__track-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="audio-player__track-title">
                    {track.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="audio-player__mute"
            aria-pressed={muted}
            onClick={toggleMute}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      ) : null}

      <div className="audio-player__bar">
        <button
          type="button"
          className="audio-player__toggle"
          aria-label={playing ? "Pause music" : "Play music"}
          onClick={toggle}
        >
          <span className="audio-player__toggle-icon" aria-hidden="true">
            {playing ? "❙❙" : "▶"}
          </span>
          <span className="audio-player__toggle-label">
            {started ? current.title : "Press Play"}
          </span>
        </button>

        {reducedMotion ? null : (
          <canvas
            ref={canvasRef}
            className="audio-player__waveform"
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          className="audio-player__more"
          aria-expanded={open}
          aria-label={open ? "Hide track list" : "Show track list"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "−" : "+"}
        </button>
      </div>
    </div>
  );
}
