"use client";

import * as React from "react";

export function ProductDemoVideo() {
  const videoRef = React.useRef(null);
  const tabletRef = React.useRef(null);

  // Autoplay when visible, pause when off-screen, respect reduced motion
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Silently catch autoplay restrictions
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.2 }
    );

    if (tabletRef.current) {
      observer.observe(tabletRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center py-4 sm:py-6 select-none">
      {/* Tablet Mockup Container (max-w-[850px], centered, responsive) */}
      <div
        ref={tabletRef}
        className="relative w-full max-w-[850px] mx-auto transition-transform duration-300"
      >
        {/* Subtle Ambient Backlight Glow */}
        <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent rounded-[32px] blur-xl -z-10 pointer-events-none" />

        {/* Clean, Minimal iPad-Style Tablet Chassis */}
        <div className="relative w-full rounded-[22px] sm:rounded-[26px] md:rounded-[30px] p-2.5 sm:p-3 md:p-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-lg dark:shadow-xl shadow-slate-900/5 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/10">
          
          {/* Subtle Top Camera Pinhole on Bezel (Landscape Center) */}
          <div className="absolute top-1 sm:top-1.5 left-1/2 -translate-x-1/2 size-1.5 sm:size-2 rounded-full bg-slate-300 dark:bg-slate-700/80 pointer-events-none" />

          {/* 16:9 Tablet Screen Display (No thick black border, uncropped, zero zoom) */}
          <div className="relative w-full aspect-video rounded-[14px] sm:rounded-[18px] md:rounded-[22px] overflow-hidden bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 shadow-inner flex items-center justify-center">
            
            {/* Full 100% Original Demonstration Video (object-contain, 100% w/h) */}
            <video
              ref={videoRef}
              src="/videos/product-demo.mp4"
              poster="/videos/product-demo-poster.jpg"
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              aria-label="RawReply product demonstration"
              className="w-full h-full object-contain pointer-events-none block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
