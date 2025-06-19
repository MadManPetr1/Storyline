import React, { useEffect, useState } from 'react';
const API_URL = process.env.REACT_APP_API_URL;

// Utility: format seconds as DD:HH:MM:SS
function formatCountdown(secs) {
  if (secs <= 0 || isNaN(secs)) return 'Ready!';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (d ? d.toString().padStart(2, '0') + ':' : '') +
    h.toString().padStart(2, '0') + ':' +
    m.toString().padStart(2, '0') + ':' +
    s.toString().padStart(2, '0');
}

export default function App() {
  // Main story state
  const [story, setStory] = useState(null);
  const [lines, setLines] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem('storyline_user') || '');
  const [color, setColor] = useState(localStorage.getItem('storyline_color') || '#d23');
  const [text, setText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canAdd, setCanAdd] = useState(true);

  // Cooldowns
  const [titleCooldown, setTitleCooldown] = useState(0);
  const [lineCooldown, setLineCooldown] = useState(0);

  // Used for displaying who renamed last
  const [lastRenamer, setLastRenamer] = useState('');

  // Store cooldown times as JS timestamps
  const [nextRenameAt, setNextRenameAt] = useState(null);
  const [nextLineAt, setNextLineAt] = useState(null);

  // --- Fetch story and lines ---
  async function fetchStory() {
    try {
      const res = await fetch(`${API_URL}/api/story/current`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStory(data.story);
      setLines(data.lines);
      setError('');
    } catch {
      setError('Error loading story.');
    }
  }

  // --- Fetch story rename status (global cooldown) ---
  async function fetchRenameStatus() {
    try {
      const res = await fetch(`${API_URL}/api/story/rename-status`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.nextAllowed) {
        setNextRenameAt(new Date(data.nextAllowed).getTime());
        setLastRenamer(data.lastRenamer);
      } else {
        setNextRenameAt(null);
        setLastRenamer('');
      }
    } catch {}
  }

  // --- Check line cooldown (per user) ---
  function checkLineCooldown() {
    const next = Number(localStorage.getItem('storyline_nextAllowed') || 0);
    setNextLineAt(next > Date.now() ? next : null);
    setCanAdd(next <= Date.now());
  }

  // --- On mount and on updates, fetch everything ---
  useEffect(() => {
    fetchStory();
    fetchRenameStatus();
    checkLineCooldown();
    const interval = setInterval(() => {
      fetchStory();
      fetchRenameStatus();
      checkLineCooldown();
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // --- Live countdown timers (1s) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleCooldown(
        nextRenameAt ? Math.max(0, Math.floor((nextRenameAt - Date.now()) / 1000)) : 0
      );
      setLineCooldown(
        nextLineAt ? Math.max(0, Math.floor((nextLineAt - Date.now()) / 1000)) : 0
      );
      setCanAdd(!nextLineAt || Date.now() >= nextLineAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRenameAt, nextLineAt]);

  // --- Handle rename ---
  async function handleRename() {
    setError('');
    if (!newTitle.trim()) {
      setError('Title cannot be empty.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/story/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitle.trim(),
          username,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Rename failed.');
      } else {
        setEditMode(false);
        setNewTitle('');
        fetchStory();
        fetchRenameStatus();
        setSuccess('Title changed!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch {
      setError('Rename request failed.');
    }
  }

  // --- Handle add line ---
  async function addLine(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!text.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          username,
          color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes('limit')) {
          const nextTime = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem('storyline_nextAllowed', nextTime);
          setNextLineAt(nextTime);
          setCanAdd(false);
        }
        throw new Error(data.error || 'Failed to add line');
      }
      setSuccess('Line added!');
      setText('');
      fetchStory();
      checkLineCooldown();
      setCanAdd(true);
    } catch (err) {
      setError(err.message);
    }
    setTimeout(() => setSuccess(''), 2500);
  }

  // --- Save user/color in localStorage ---
  useEffect(() => {
    localStorage.setItem('storyline_user', username);
    localStorage.setItem('storyline_color', color);
  }, [username, color]);

  // --- Render ---
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#1a1b21',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Left Cooldown Sidebar */}
      <div style={{
        width: 270,
        minHeight: 310,
        margin: 'auto 0 auto 3vw',
        borderRadius: 10,
        background: '#22232a',
        color: '#eee',
        boxShadow: '0 0 14px #10101d77',
        padding: 22,
        fontSize: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Title cooldown:</div>
        <div style={{ fontFamily: 'monospace', fontSize: 20, marginBottom: 15 }}>
          {formatCountdown(titleCooldown)}
        </div>
        <div style={{ color: '#bbb', fontSize: 14, marginBottom: 22 }}>
          {lastRenamer ? `Last renamed by: ${lastRenamer}` : ''}
        </div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Your new line cooldown:</div>
        <div style={{ fontFamily: 'monospace', fontSize: 20 }}>
          {formatCountdown(lineCooldown)}
        </div>
      </div>

      {/* Main Story Card */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: 520,
          background: '#fff',
          borderRadius: 15,
          boxShadow: '0 0 18px #1111',
          padding: 34,
          minHeight: 370,
          margin: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            {editMode ? (
              <>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  maxLength={38}
                  style={{
                    fontSize: 25, padding: 4, borderRadius: 5,
                    border: '1px solid #aaa', marginRight: 12
                  }}
                />
                <button onClick={handleRename} style={{ marginRight: 7, fontWeight: 500, background: '#36f', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 14px' }}>Save</button>
                <button onClick={() => { setEditMode(false); setError(''); }} style={{ fontWeight: 500 }}>Cancel</button>
              </>
            ) : (
              <>
                <h1 style={{ flex: 1, margin: 0, fontSize: 31 }}>{story ? (story.name || 'Untitled') : 'Loading Story...'}</h1>
                <button
                  onClick={() => { setEditMode(true); setNewTitle(story ? (story.name || '') : ''); setError(''); }}
                  disabled={titleCooldown > 0}
                  style={{
                    padding: '3px 12px', borderRadius: 5, border: 'none',
                    background: titleCooldown > 0 ? '#aaa' : '#2577f7',
                    color: '#fff', fontWeight: 500,
                    cursor: titleCooldown > 0 ? 'not-allowed' : 'pointer'
                  }}
                  title={titleCooldown > 0 ? `Cooldown active.` : 'Rename Story'}
                >
                  Rename
                </button>
              </>
            )}
          </div>
          <hr style={{ margin: '12px 0' }} />
          {/* Story lines or empty */}
          <div style={{ minHeight: 80, marginBottom: 19 }}>
            {lines.length === 0
              ? <div style={{ color: '#888', fontSize: 19 }}>No lines yet.</div>
              : lines.map(line => (
                <div key={line.id} style={{ marginBottom: 9, padding: 7, background: '#fafaff', borderRadius: 5 }}>
                  <span style={{
                    borderBottom: line.username ? `2px solid ${line.color || '#aaa'}` : 'none',
                    color: line.color || '#333',
                    fontWeight: 500
                  }}>
                    {line.text}
                  </span>
                  {line.username && (
                    <span style={{ fontSize: 13, color: line.color || '#555', marginLeft: 8 }}>
                      [by {line.username}]
                    </span>
                  )}
                </div>
              ))}
          </div>
          <hr style={{ margin: '11px 0' }} />
          {/* Input Row */}
          <form style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }} onSubmit={addLine}>
            <input
              placeholder="Your username (optional)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              style={{ padding: 6, borderRadius: 4, border: '1px solid #aaa', width: 135 }}
            />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ width: 32, height: 32, border: 'none', background: 'none', marginRight: 3 }}
              title="Choose underline color"
            />
            <textarea
              required
              placeholder="Add your line..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={1}
              maxLength={120}
              disabled={!canAdd}
              style={{
                flex: 1,
                padding: 7,
                borderRadius: 4,
                border: '1px solid #aaa',
                minHeight: 32,
                maxHeight: 100,
                resize: 'vertical'
              }}
            />
            <button
              type="submit"
              disabled={!canAdd || !text}
              style={{
                padding: '9px 15px', borderRadius: 5, border: 'none',
                background: canAdd && text ? '#3d86f8' : '#bbb', color: '#fff',
                fontWeight: 500
              }}>
              Add Line
            </button>
          </form>
          {error && <div style={{ color: 'crimson', marginTop: 12, fontWeight: 500 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 10, fontWeight: 500 }}>{success}</div>}
        </div>
        <div style={{ fontSize: 14, color: '#bbb', textAlign: 'center', marginTop: 13 }}>
          Story resets every 3 months. All contributions are public. <br />
          Refreshes automatically every minute.
        </div>
      </div>
    </div>
  );
}