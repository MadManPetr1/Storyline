// src/utils/timeUtils.js

export function formatCountdown(secs) {
  if (!secs || secs <= 0) return "Ready!";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return (
    d.toString().padStart(2, "0") +
    ":" +
    h.toString().padStart(2, "0") +
    ":" +
    m.toString().padStart(2, "0")
  );
}