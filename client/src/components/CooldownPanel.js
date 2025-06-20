import React from "react";
import "./CooldownPanel.css";
import { formatCountdown } from "../utils/timeUtils";

export default function CooldownPanel({ titleCooldown, lineCooldown, nextResetAt, resetCountdown }) {
  return (
    <div className="cooldown-panel">
      <div className="cooldown-block">
        <div className="cooldown-label">Title cooldown</div>
        <div className="cooldown-value">{formatCountdown(titleCooldown)}</div>
      </div>
    
      <div className="cooldown-block">
        <div className="cooldown-label">Your line cooldown</div>
        <div className="cooldown-value">{formatCountdown(lineCooldown)}</div>
      </div>
    
      <div className="cooldown-block">
        <div className="cooldown-label">Next Reset</div>
        <div className="reset-date">
          {nextResetAt && new Date(nextResetAt).toLocaleDateString("en-GB")} {/* DD/MM/YYYY */}
        </div>
        <div className="reset-countdown">{formatCountdown(resetCountdown)}</div>
        <div className="reset-note">(Every 3rd month — starts on the 1st)</div>
      </div>
    </div>
  );
}