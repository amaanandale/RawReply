"use client";

import * as React from "react";

export function ProductDemoVideo() {
  const videoRef = React.useRef(null);
  const phoneRef = React.useRef(null);

  // Auto-play when visible, pause when off-screen, respect reduced motion
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
              // Browser autoplay policy fallback (silent catch)
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (phoneRef.current) {
      observer.observe(phoneRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center py-4 sm:py-6 select-none">
      {/* Smartphone Mockup Outer Container */}
      <div
        ref={phoneRef}
        className="relative mx-auto w-[270px] sm:w-[300px] md:w-[325px] lg:w-[340px] aspect-[9/18.8] transition-transform duration-300 hover:scale-[1.01]"
      >
        {/* Ambient Backlight Glow behind Phone */}
        <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent rounded-[60px] blur-2xl -z-10 pointer-events-none" />

        {/* Physical Hardware Buttons */}
        {/* Left: Volume Up */}
        <div className="absolute -left-1 sm:-left-1.5 top-20 w-1 sm:w-1.5 h-9 rounded-l-md bg-slate-700 border-l border-t border-b border-slate-600/70 shadow-xs pointer-events-none" />
        {/* Left: Volume Down */}
        <div className="absolute -left-1 sm:-left-1.5 top-32 w-1 sm:w-1.5 h-9 rounded-l-md bg-slate-700 border-l border-t border-b border-slate-600/70 shadow-xs pointer-events-none" />
        {/* Right: Power / Side Button */}
        <div className="absolute -right-1 sm:-right-1.5 top-24 w-1 sm:w-1.5 h-14 rounded-r-md bg-slate-700 border-r border-t border-b border-slate-600/70 shadow-xs pointer-events-none" />

        {/* Phone Chassis (Outer Frame) */}
        <div className="relative w-full h-full rounded-[44px] sm:rounded-[50px] p-2.5 sm:p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-[3.5px] sm:border-[4px] border-slate-600/70 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),0_10px_25px_rgba(0,0,0,0.4)] ring-1 ring-white/10 flex flex-col">
          
          {/* Inner Screen Display Glass */}
          <div className="relative w-full h-full rounded-[35px] sm:rounded-[40px] overflow-hidden bg-slate-950 border border-slate-800/80 shadow-inner flex flex-col">
            
            {/* Top Phone Status Bar & Dynamic Island */}
            <div className="absolute top-0 inset-x-0 z-30 pt-2 sm:pt-2.5 px-6 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-white/90 tracking-tight pointer-events-none">
              {/* Left: Time */}
              <span className="font-mono text-[11px] sm:text-xs tracking-tight text-white/95 drop-shadow-xs">
                9:41
              </span>

              {/* Center: Dynamic Island Pill */}
              <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 w-22 sm:w-26 h-5 sm:h-5.5 rounded-full bg-black border border-white/10 flex items-center justify-between px-2 shadow-md">
                {/* Camera Lens */}
                <div className="size-2 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <div className="size-0.5 rounded-full bg-emerald-500/50" />
                </div>
                {/* Sensor */}
                <div className="size-1 rounded-full bg-slate-900" />
              </div>

              {/* Right: Phone Status Icons (Signal, Wifi, Battery) */}
              <div className="flex items-center gap-1.5 text-white/90 drop-shadow-xs">
                {/* Signal Bars */}
                <svg
                  className="size-3.5 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="2" y="17" width="3" height="5" rx="1" />
                  <rect x="7" y="13" width="3" height="9" rx="1" />
                  <rect x="12" y="9" width="3" height="13" rx="1" />
                  <rect x="17" y="4" width="3" height="18" rx="1" />
                </svg>

                {/* WiFi Icon */}
                <svg
                  className="size-3.5 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 18c-.8 0-1.4.6-1.4 1.4 0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4c0-.8-.6-1.4-1.4-1.4zm-4.7-3.7l1.4 1.4C9.8 14.8 10.9 14.3 12 14.3s2.2.5 3.3 1.4l1.4-1.4c-1.5-1.3-3.1-2-4.7-2s-3.2.7-4.7 2zm-3.8-3.7l1.4 1.4c2.5-2.2 4.8-3.3 7.1-3.3s4.6 1.1 7.1 3.3l1.4-1.4C17.5 7.9 14.8 6.7 12 6.7s-5.5 1.2-8.5 3.9z" />
                </svg>

                {/* Battery Icon */}
                <div className="flex items-center">
                  <div className="w-5 h-2.5 rounded-xs border border-white/90 p-0.5 flex items-center">
                    <div className="h-full w-full rounded-2xs bg-emerald-400" />
                  </div>
                  <div className="w-0.5 h-1 bg-white/90 rounded-r-xs ml-0.5" />
                </div>
              </div>
            </div>

            {/* Seamless Demonstration Video inside Smartphone Screen */}
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
              aria-label="RawReply mobile demonstration"
              className="w-full h-full object-cover object-center pointer-events-none"
            />

            {/* Bottom Home Indicator Bar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 w-28 sm:w-32 h-1 rounded-full bg-white/40 pointer-events-none" />

            {/* Subtle Curved Glass Specular Glare */}
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
