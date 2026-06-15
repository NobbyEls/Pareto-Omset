import { useEffect, useRef, useState } from "react";

interface LoadingOverlayProps {
  /** When true, overlay is shown. When false, it fades out (400ms) then unmounts. */
  visible: boolean;
  title?: string;
  status?: string;
  /** Optional secondary line, shown in red — useful for soft-fail messages. */
  detail?: string;
  /**
   * Progress 0..100 to drive the bar. When `null` (default), the bar
   * runs an indeterminate shimmer animation.
   */
  progress?: number | null;
}

/**
 * Full-screen loading splash with logo, spinner and progress bar.
 * Visual language mirrors NobbyEls/ParetoPC's loading overlay:
 *   - dark glass backdrop (rgba(7, 9, 26, 0.95) + blur)
 *   - 240×240 logo card with indigo glow shadow
 *   - 48px spinner above the title
 *   - indigo→pink gradient progress bar (4px tall)
 *
 * Used for both the very first data load and every "Update Data" refresh.
 */
export function LoadingOverlay({
  visible,
  title = "Memuat Data Analytics",
  status = "Mengambil data...",
  detail,
  progress = null,
}: LoadingOverlayProps) {
  // Keep the overlay mounted briefly after `visible` flips to false so the
  // CSS opacity transition can play out before we unmount.
  const [mounted, setMounted] = useState(visible);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      setMounted(true);
    } else if (mounted) {
      fadeTimerRef.current = setTimeout(() => {
        setMounted(false);
        fadeTimerRef.current = null;
      }, 400);
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [visible, mounted]);

  if (!mounted) return null;

  const indeterminate = progress == null;
  const clampedPct =
    progress == null ? 0 : Math.max(0, Math.min(100, progress));

  // Resolve the asset URL via Vite's BASE_URL so this works whether the app
  // is served at the domain root or under a subpath (e.g. /Pareto-Omset/).
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      className={
        "pareto-loading-overlay" +
        (visible ? "" : " pareto-loading-overlay--hidden")
      }
    >
      <div className="pareto-loading-content">
        <div className="pareto-loading-logo">
          <img
            src={logoUrl}
            alt=""
            className="pareto-loading-logo-img"
            onError={(e) => {
              // Hide the broken <img> and reveal the SVG fallback that lives
              // immediately after it in the DOM.
              const img = e.currentTarget;
              img.style.display = "none";
              const svg = img.nextElementSibling as SVGSVGElement | null;
              if (svg) svg.style.display = "block";
            }}
          />
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#pareto-loading-grad)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "none" }}
          >
            <defs>
              <linearGradient
                id="pareto-loading-grad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <div className="pareto-loading-spinner" aria-hidden="true" />
        <h3 className="pareto-loading-title">{title}</h3>
        <p className="pareto-loading-status">{status}</p>
        <div
          className="pareto-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : clampedPct}
        >
          <div
            className={
              "pareto-progress-fill " +
              (indeterminate
                ? "pareto-progress-fill--indeterminate"
                : "pareto-progress-fill--determinate")
            }
            style={indeterminate ? undefined : { width: `${clampedPct}%` }}
          />
        </div>
        {detail && <p className="pareto-loading-detail">{detail}</p>}
      </div>
    </div>
  );
}
