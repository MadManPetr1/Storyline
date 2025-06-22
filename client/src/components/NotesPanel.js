// components/NotesPanel.js
import React, { useState, useEffect } from "react";
import "./NotesPanel.css";

export default function NotesPanel({ storyId }) {
  const storageKey = `notes_${storyId || 'unknown'}`;
  const [notes, setNotes] = useState('');
  const [visible, setVisible] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setNotes(saved);
  }, [storageKey]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(storageKey, notes);
  }, [notes, storageKey]);

  return (
    <div className="notes-wrapper">
      <button className="notes-toggle" onClick={() => setVisible(v => !v)}>
        {visible ? "Hide Notes" : "Show Notes"}
      </button>

      {visible && (
        <textarea
          className="notes-box"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Your private notes for this story..."
        />
      )}
    </div>
  );
}