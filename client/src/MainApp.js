import React, { useEffect, useState } from 'react';
import './App.css';
import Header from "./components/Header";

const SunSVG = () => <span style={{ fontSize: 24 }}>☀️</span>;
const MoonSVG = () => <span style={{ fontSize: 24 }}>🌑</span>;
const API_URL = process.env.REACT_APP_API_URL;

// Countdown helper: DD:HH:MM
function formatCountdown(secs) {
  if (!secs || secs <= 0) return 'Ready!';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return (
    d.toString().padStart(2, '0') + ':' +
    h.toString().padStart(2, '0') + ':' +
    m.toString().padStart(2, '0')
  );
}

export default function MainApp() {
  // Theme
  const [darkMode, setDarkMode] = useState(true);
  function toggleDarkMode() { setDarkMode(m => !m); }

  // Main state
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
  const [nextResetAt, setNextResetAt] = useState(null);
  const [resetCountdown, setResetCountdown] = useState(0);

  // For rename and cooldown
  const [lastRenamer, setLastRenamer] = useState('');
  const [nextRenameAt, setNextRenameAt] = useState(null);

  // --- Data fetchers ---
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

  // NEW: Backend-based line cooldown
  async function fetchLineCooldown() {
    try {
      const res = await fetch(`${API_URL}/api/line/cooldown`);
      const data = await res.json();
      setLineCooldown(data.cooldown || 0);
      setCanAdd((data.cooldown || 0) === 0);
    } catch {}
  }

  // --- Main useEffect: Initial fetch + reset logic ---
  useEffect(() => {
    fetchStory();
    fetchRenameStatus();
    fetchLineCooldown();

    // Calculate next reset: first of next 3rd month (Mar, Jun, Sep, Dec)
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    let nextResetMonth = [3, 6, 9, 12].find(m => m > month || (m === month && now.getDate() < 1));
    if (!nextResetMonth) {
      nextResetMonth = 3;
      year++;
    }

    const nextReset = new Date(year, nextResetMonth - 1, 1, 0, 0, 0, 0);
    setNextResetAt(nextReset.getTime());

    // Regular refresh (story, rename, line cooldown) every minute
    const interval = setInterval(() => {
      fetchStory();
      fetchRenameStatus();
      fetchLineCooldown();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Timers for live UI countdowns ---
  useEffect(() => {
    // Title rename cooldown
    const cooldownTimer = setInterval(() => {
      setTitleCooldown(nextRenameAt ? Math.max(0, Math.floor((nextRenameAt - Date.now()) / 1000)) : 0);
    }, 1000);

    // Line cooldown (client-side display only; true value always comes from backend)
    const lineTimer = setInterval(() => {
      setLineCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Reset countdown
    const resetTimer = setInterval(() => {
      setResetCountdown(nextResetAt ? Math.max(0, Math.floor((nextResetAt - Date.now()) / 1000)) : 0);
    }, 1000);

    return () => {
      clearInterval(cooldownTimer);
      clearInterval(lineTimer);
      clearInterval(resetTimer);
    };
  }, [nextRenameAt, nextResetAt]);

  // --- Handlers ---
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
          fetchLineCooldown(); // Always fetch the real value from backend after error
        }
        throw new Error(data.error || 'Failed to add line');
      }
      setSuccess('Line added!');
      setText('');
      fetchStory();
      fetchLineCooldown();
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

  // --- RENDER ---
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main className="main-columns">
        {/* Left Cooldown Panel */}
        <div className="panel">
          <div style={{ fontWeight: 500, fontSize: 17, marginBottom: 5 }}>Title cooldown:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, marginBottom: 14 }}>
            {formatCountdown(titleCooldown)}
          </div>
          <div style={{ fontWeight: 500, fontSize: 17, marginBottom: 5 }}>Your new line cooldown:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 20, marginBottom: 20 }}>
            {formatCountdown(lineCooldown, false)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 3 }}>NEXT RESET:</div>
          <div style={{ color: '#ed3131', fontWeight: 800, fontSize: 18 }}>
            {nextResetAt && (new Date(nextResetAt)).toLocaleDateString()}
          </div>
          <div style={{ color: '#ed3131', fontWeight: 600, fontSize: 16, marginTop: 3 }}>
            {formatCountdown(resetCountdown, true)}
          </div>
          <div style={{ fontWeight: 600, color: '#ed3131', fontSize: 15, marginTop: 6 }}>
            (NOTE: Start of every 3rd month)
          </div>
        </div>

        {/* Center Story Card */}
        <div className="story-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            {editMode ? (
              <>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  maxLength={38}
                  style={{
                    fontSize: 25, padding: 4, borderRadius: 5,
                    border: '1px solid #888', marginRight: 12
                  }}
                />
                <button onClick={handleRename} style={{
                  marginRight: 7, fontWeight: 500, background: '#36f', color: '#fff',
                  border: 'none', borderRadius: 5, padding: '4px 14px'
                }}>Save</button>
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
          <hr style={{ margin: '10px 0 18px 0' }} />
          <div style={{ minHeight: 100, marginBottom: 19 }}>
            {lines.length === 0
              ? <div style={{ color: '#888', fontSize: 19 }}>No lines yet.</div>
              : lines.map(line => (
                <div key={line.id}
                  className="story-line"
                  style={{
                    borderBottom: `3px solid ${line.color || '#aaa'}`
                  }}>
                  <div style={{ color: line.color || '#333', fontWeight: 500 }}>
                    {line.text}
                  </div>
                  {line.username && (
                    <div className="username" style={{ color: line.color || '#555' }}>
                      [by {line.username}]
                    </div>
                  )}
                </div>
              ))}
          </div>
          {error && <div style={{ color: 'crimson', marginTop: 10, fontWeight: 600 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 10, fontWeight: 600 }}>{success}</div>}
        </div>

        {/* Right Add Line Box */}
        <form className="add-panel" onSubmit={addLine}>
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 7
          }}>
            <input
              className="username-input"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
            />
            <input
              className="color-picker"
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
          </div>
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
          <button className="add-line-btn" type="submit" disabled={!canAdd || !text}>
            Add Line
          </button>
        </form>
      </main>

      <footer className="footer">
        Story resets every 3 months. All contributions are public.&nbsp;
        Refreshes automatically every minute.
      </footer>
    </div>
  );
}