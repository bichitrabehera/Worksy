"use client";

import { useState } from "react";

export default function WorksyTitle() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <h1
      aria-label="Worksy"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="tracking-3 relative shrink-0 font-[copper] text-[clamp(5rem,15vw,13rem)] leading-[0.8] whitespace-nowrap select-none"
    >
      {/* Base text */}
      <span className="text-brand/10">WORKSY</span>

      {/* Spotlight layer */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: hovered
            ? `radial-gradient(
          circle 160px at ${position.x}px ${position.y}px,
          color-mix(in srgb, var(--color-brand) 100%, transparent) 0%,
          color-mix(in srgb, var(--color-brand) 15%, transparent) 40%,
          transparent 100%
        )`
            : "none",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        WORKSY
      </span>
    </h1>
  );
}
