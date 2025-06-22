//client/src/components/StoryCard.js
import "./StoryCard.css";


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

  async function handleFlag(lineId) {
    const reason = prompt("Why are you flagging this line?");
    if (!reason) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/flag/${lineId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json() : {};

      if (res.ok) {
        alert("Flag submitted.");
      } else {
        alert("Flag failed: " + (data.error || res.statusText));
      }
    } catch (err) {
      alert("Could not flag: " + err.message);
    }
  }

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
          <span
            key={line.id}
            className="story-snippet"
            style={{ '--hover-color': line.color || '#aaa' }}
          >
            {line.text}
            <span className="author">
              @{line.username}
              <button
                className="flag-btn"
                onClick={() => handleFlag(line.id)}
                title="Flag this line"
              >
                🚩
              </button>
            </span>
          </span>
        ))}
      </div>

      {/* Feedback */}
      {error && <div className="feedback error">{error}</div>}
      {success && <div className="feedback success">{success}</div>}
    </div>
  );
}