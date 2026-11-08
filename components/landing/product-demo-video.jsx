"use client";

import * as React from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw, CheckCircle2 } from "lucide-react";

const STAGES = [
  { start: 0, end: 2, label: "Connect Instagram", icon: "📸" },
  { start: 2, end: 3, label: "Create Automation", icon: "⚡" },
  { start: 3, end: 5, label: "Select Post & Trigger", icon: "🎯" },
  { start: 5, end: 7, label: "Configure Reply & DM", icon: "💬" },
  { start: 7, end: 9, label: "Publish Workflow", icon: "🚀" },
  { start: 9, end: 10, label: "Qualified Lead Ready", icon: "✓" },
];

export function ProductDemoVideo() {
  const videoRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(10);
  const [showControls, setShowControls] = React.useState(false);
  const [hasPlayed, setHasPlayed] = React.useState(false);

  // Derive current workflow step
  const activeStage = React.useMemo(() => {
    return STAGES.find((s) => currentTime >= s.start && currentTime < s.end) || STAGES[0];
  }, [currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setHasPlayed(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, pos * duration));
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleJumpToStage = (stageStart, e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = stageStart;
      setCurrentTime(stageStart);
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        setHasPlayed(true);
      }
    }
  };

  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds) => {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Video Player Container */}
      <div
        ref={containerRef}
        onClick={togglePlay}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-slate-950 shadow-2xl shadow-primary/10 cursor-pointer select-none transition-all duration-300"
      >
        <video
          ref={videoRef}
          src="/videos/product-demo.mp4"
          poster="/videos/product-demo-poster.jpg"
          preload="metadata"
          playsInline
          muted={isMuted}
          loop
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Live Workflow Step Pill (Top Left) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white shadow-lg pointer-events-none transition-transform duration-200">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white/80">{activeStage.icon}</span>
          <span className="font-semibold text-white tracking-tight">{activeStage.label}</span>
          <span className="text-white/40 text-[10px] ml-1 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* 10s Speed Badge (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 text-[11px] font-semibold text-emerald-400 shadow-lg pointer-events-none">
          <span>⚡ 10s Live Demo</span>
        </div>

        {/* Center Play Button (Shown when paused or initial) */}
        {(!isPlaying || !hasPlayed) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px] transition-all duration-300">
            <button
              type="button"
              aria-label="Play Product Demo"
              className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/30 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <Play className="size-7 sm:size-9 fill-current ml-1" />
            </button>
          </div>
        )}

        {/* Interactive Bottom Control Bar */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-4 sm:p-5 transition-opacity duration-200 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 sm:opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrubber Bar */}
          <div
            onClick={handleSeek}
            className="group/seek relative mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
          >
            {/* Progress fill */}
            <div
              className="h-full rounded-full bg-emerald-500 transition-all relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
            </div>

            {/* Stage dividers on scrubber */}
            {STAGES.map((s, idx) => {
              if (idx === 0) return null;
              const leftPercent = (s.start / duration) * 100;
              return (
                <div
                  key={s.label}
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-950/60 pointer-events-none"
                  style={{ left: `${leftPercent}%` }}
                />
              );
            })}
          </div>

          {/* Control Buttons & Timings */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>

              <span className="font-mono text-white/80 text-[11px] hidden sm:inline-block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Quick Stage Jump Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-1.5">
              {STAGES.map((stage) => {
                const isActive = currentTime >= stage.start && currentTime < stage.end;
                return (
                  <button
                    key={stage.label}
                    type="button"
                    onClick={(e) => handleJumpToStage(stage.start, e)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 font-semibold"
                        : "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={handleFullscreen}
              aria-label="Toggle Fullscreen"
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Phase Indicator Pills for Mobile & Tablets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:hidden gap-1.5 pt-1">
        {STAGES.map((stage) => {
          const isActive = currentTime >= stage.start && currentTime < stage.end;
          return (
            <button
              key={stage.label}
              type="button"
              onClick={(e) => handleJumpToStage(stage.start, e)}
              className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs shrink-0">{stage.icon}</span>
              <span className="truncate text-[11px]">{stage.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

