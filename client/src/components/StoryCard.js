// components/StoryCard.js
import React from "react";
import "./StoryCard.css";

function getTextColor(bgColor) {
  if (!bgColor) return '#000';

  const r = parseInt(bgColor.slice(1, 3), 16);
  const g = parseInt(bgColor.slice(3, 5), 16);
  const b = parseInt(bgColor.slice(5, 7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#111' : '#fff';
}
export default function StoryCard({
  story,
  lines,
  editMode,
  newTitle,
  setNewTitle,
  titleCooldown,
  handleRename,
  setEditMode,
  error,
  success
}) {
  return (
    <div className="story-card">
      {/* Title Row */}
      <div className="story-title-row">
        {editMode ? (
          <>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              maxLength={38}
              className="title-input"
            />
            <button className="title-save" onClick={handleRename}>Save</button>
            <button className="title-cancel" onClick={() => setEditMode(false)}>Cancel</button>
          </>
        ) : (
          <>
            <h1 className="story-title">{story ? (story.name || 'Untitled') : 'Loading Story...'}</h1>
            <button
              className="rename-btn"
              onClick={() => {
                setEditMode(true);
                setNewTitle(story ? (story.name || '') : '');
              }}
              disabled={titleCooldown > 0}
              title={titleCooldown > 0 ? `Cooldown active.` : 'Rename Story'}
            >
              Rename
            </button>
          </>
        )}
      </div>

      <hr className="story-separator" />

        {/* Story Lines */}
    <div className="story-flow">
      {lines.map((line, index) => (
        <span key={line.id} className="story-snippet" style={{ '--hover-color': line.color || '#aaa' }}>
          {line.text}
          <span className="author">@{line.username}</span>
          {index < lines.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>


      {/* Feedback */}
      {error && <div className="feedback error">{error}</div>}
      {success && <div className="feedback success">{success}</div>}
    </div>
  );
}