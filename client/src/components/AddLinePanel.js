import React, { useEffect, useRef } from "react";
import "./AddLinePanel.css";

export default function AddLinePanel({
  username, setUsername,
  color, setColor,
  text, setText,
  canAdd, addLine
}) {
  const textareaRef = useRef();

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("storyline_user", username);
    localStorage.setItem("storyline_color", color);
  }, [username, color]);

  // Handle enter key submit
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canAdd && text.trim()) {
        addLine(e);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 10);
      }
    }
  }

  return (
    <form className="add-panel" onSubmit={addLine}>
        <div className="add-panel-row">
            <input
              className="username-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
            <input
              className="color-picker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Choose your line color"
            />
         </div>
        <div className="line-textarea-container">
            <textarea
                className="line-textarea"
                required
                placeholder="Add your line..."
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                maxLength={512}
                disabled={!canAdd}
            />
            <div className={`char-counter ${text.length > 450 ? 'warn' : ''}`}>
                {text.length}/512
            </div>
        </div>
    <button
        type="submit"
        className="add-line-btn"
        disabled={!canAdd || !text.trim()}
     >
        Add Line
    </button>
    </form>
  );
}