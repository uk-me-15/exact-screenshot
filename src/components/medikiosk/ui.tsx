import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Audio waveform indicator — simulates active speech recognition      */
/* ------------------------------------------------------------------ */

export function Waveform({
  active,
  bars = 28,
  className,
  tone = "teal",
}: {
  active: boolean;
  bars?: number;
  className?: string;
  tone?: "teal" | "white";
}) {
  const heights = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const wave = Math.sin((i / bars) * Math.PI * 3.2) * 0.5 + 0.5;
        const jitter = ((i * 7919) % 17) / 17; // deterministic pseudo-jitter
        return 0.28 + wave * 0.55 + jitter * 0.28;
      }),
    [bars],
  );

  return (
    <div
      aria-hidden="true"
      className={cn("flex h-10 items-center gap-[3px]", className)}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors duration-300",
            tone === "teal"
              ? active
                ? "bg-teal-600"
                : "bg-teal-900/15"
              : active
                ? "bg-emerald-300"
                : "bg-white/25",
          )}
          style={
            active
              ? {
                  height: `${Math.round(h * 100)}%`,
                  animation: `eq 0.9s ease-in-out ${((i % 7) * 0.09).toFixed(2)}s infinite`,
                }
              : { height: "18%" }
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Typewriter narration text                                           */
/* ------------------------------------------------------------------ */

export function Typewriter({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setShown(0);
    let start: number | null = null;
    let mounted = true;
    const step = (t: number) => {
      if (start === null) start = t;
      const chars = Math.min(text.length, Math.floor(((t - start) / 1000) * 42));
      if (!mounted) return;
      setShown(chars);
      if (chars < text.length) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      mounted = false;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [text]);

  const done = shown >= text.length;
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {!done && <span className="animate-blink text-teal-600">▌</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Logos                                                               */
/* ------------------------------------------------------------------ */

export function MediKioskLogo({
  size = 40,
  className,
  dark = false,
}: {
  size?: number;
  className?: string;
  dark?: boolean;
}) {
  const box = Math.round(size * 1.3);
  return (
    <svg
      width={box}
      height={box}
      viewBox="0 0 52 52"
      fill="none"
      className={className}
      aria-label="MediKiosk"
      role="img"
    >
      <rect
        x="2"
        y="2"
        width="48"
        height="48"
        rx="13"
        className={dark ? "fill-white/10" : "fill-teal-900"}
      />
      <rect
        x="2.75"
        y="2.75"
        width="46.5"
        height="46.5"
        rx="12.25"
        stroke={dark ? "rgba(255,255,255,0.35)" : "rgba(13,148,136,0.55)"}
        strokeWidth="1.5"
      />
      <rect x="16" y="11" width="20" height="26" rx="3" stroke="#5EEAD4" strokeWidth="2" />
      <rect x="20.5" y="31.5" width="11" height="1.8" rx="0.9" fill="#5EEAD4" />
      <path d="M26 17v8M22 21h8" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M14 43.5h24"
        stroke={dark ? "rgba(94,234,212,0.6)" : "#2DD4BF"}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ABHAArkaLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#0F766E" />
      <path
        d="M12 4c2.2 1.8 3.4 4.6 3.4 8S14.2 18.2 12 20c-2.2-1.8-3.4-4.6-3.4-8S9.8 5.8 12 4Z"
        fill="#FDE68A"
      />
      <path
        d="M12 4v16"
        stroke="#0F766E"
        strokeWidth="0.9"
      />
    </svg>
  );
}
