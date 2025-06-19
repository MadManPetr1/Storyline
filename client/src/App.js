import React, { useEffect, useState } from 'react';
// You can replace these with your actual SVG icons
const SunSVG = () => <span style={{ fontSize: 24 }}>☀️</span>;
const MoonSVG = () => <span style={{ fontSize: 24 }}>🌑</span>;
const API_URL = process.env.REACT_APP_API_URL;

// Utility: format seconds as DD:HH:MM:SS or M:DD:HH:MM
function formatCountdown(secs, showMonths) {
  if (!secs || secs <= 0) return 'Ready!';
  const m = showMonths ? Math.floor(secs / 2592000) : 0;
  const d = showMonths ? Math.floor((secs % 2592000) / 86400) : Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const mi = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (showMonths ? `${m}:` : '') +
    (showMonths ? d.toString().padStart(2, '0') : d ? d.toString().padStart(2, '0') + ':' : '') +
    h.toString().padStart(2, '0') + ':' +
    mi.toString().padStart(2, '0') + ':' +
    s.toString().padStart(2, '0');
}

export default function App() {
  // --- Dark/Light Mode ---
  const [darkMode, setDarkMode] = useState(true);
  function toggleDarkMode() {
    setDarkMode(m => !m);
  }

  // --- State as before ---
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

  // For reset
  const [nextResetAt, setNextResetAt] = useState(null);
  const [resetCountdown, setResetCountdown] = useState(0);

  // Used for displaying who renamed last
  const [lastRenamer, setLastRenamer] = useState('');
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
    // Calculate next reset: first of every 3rd month
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    let nextMonth = month + (3 - (month - 1) % 3);
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear++;
    }
    const nextReset = new Date(nextYear, nextMonth - 1, 1, 0, 0, 0, 0);
    setNextResetAt(nextReset.getTime());
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
      setResetCountdown(
        nextResetAt ? Math.max(0, Math.floor((nextResetAt - Date.now()) / 1000)) : 0
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRenameAt, nextLineAt, nextResetAt]);

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
    <div className={`app ${darkMode ? 'dark' : 'light'}`} style={{
      minHeight: '100vh',
      background: darkMode ? '#232327' : '#f3f3f6',
      color: darkMode ? '#e7e7ea' : '#111',
      transition: 'background .3s, color .3s'
    }}>
      {/* Header */}
      <header style={{
        width: '100vw', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 3vw', height: 70,
        borderBottom: darkMode ? '1px solid #333' : '1px solid #ddd',
        background: darkMode ? '#202023' : '#fff',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px #0002'
      }}>
        <div style={{ width: 52 }} />
        <div style={{
          textAlign: 'center', fontWeight: 700, fontSize: 30, letterSpacing: 1
        }}>
          Storyline
        </div>
        <div>
          <button
            onClick={toggleDarkMode}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              padding: 0, marginRight: 3
            }}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <MoonSVG /> : <SunSVG />}
          </button>
        </div>
      </header>

      {/* Main content: Three columns */}
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '3vw',
        margin: '60px 0 0 0'
      }}>
        {/* Cooldown/Info panel (left) */}
        <div style={{
          minWidth: 260, maxWidth: 330, minHeight: 330,
          background: darkMode ? '#1e1f22' : '#eaeaec',
          borderRadius: 14, boxShadow: darkMode ? '0 0 18px #1117' : '0 0 10px #ccc5',
          padding: 28, marginTop: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
        }}>
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

        {/* Story Card (center) */}
        <div style={{
          flex: 1, minWidth: 420, maxWidth: 600, minHeight: 420,
          background: darkMode ? '#fff' : '#fff',
          color: '#222', borderRadius: 17,
          boxShadow: '0 0 24px #0e0e2177',
          padding: 38, marginTop: 6, marginBottom: 18
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
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
          <hr style={{ margin: '10px 0 18px 0' }} />
          {/* Story lines or empty */}
          <div style={{ minHeight: 100, marginBottom: 19 }}>
            {lines.length === 0
              ? <div style={{ color: '#888', fontSize: 19 }}>No lines yet.</div>
              : lines.map(line => (
                <div key={line.id} style={{
                  marginBottom: 13, padding: 8,
                  background: '#fafaff',
                  borderRadius: 6,
                  borderBottom: `3px solid ${line.color || '#aaa'}`
                }}>
                  <div style={{ color: line.color || '#333', fontWeight: 500 }}>
                    {line.text}
                  </div>
                  {line.username && (
                    <div style={{ fontSize: 13, color: line.color || '#555', marginTop: 1 }}>
                      [by {line.username}]
                    </div>
                  )}
                </div>
              ))}
          </div>
          {error && <div style={{ color: 'crimson', marginTop: 10, fontWeight: 600 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 10, fontWeight: 600 }}>{success}</div>}
        </div>

        {/* Add Line Box (right) */}
        <form style={{
          minWidth: 270, maxWidth: 330, minHeight: 320,
          background: darkMode ? '#1e1f22' : '#eaeaec',
          borderRadius: 15, boxShadow: darkMode ? '0 0 18px #1117' : '0 0 10px #ccc5',
          marginTop: 8, padding: '20px 16px 28px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
        }} onSubmit={addLine}>
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 7
          }}>
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              style={{
                borderRadius: 6, padding: '6px 9px', border: 'none',
                background: darkMode ? '#22252b' : '#f5f6fb',
                fontWeight: 600, fontSize: 15, flex: 1, marginRight: 10,
                outline: '1.5px solid #8882'
              }}
            />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{
                width: 28, height: 28, border: 'none', background: 'none',
                boxShadow: '0 0 6px #2225', borderRadius: 5
              }}
              title="Underline color"
            />
          </div>
          <textarea
            required
            placeholder="Add your line..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            maxLength={140}
            disabled={!canAdd}
            style={{
              width: '100%', minHeight: 72, maxHeight: 160, resize: 'vertical',
              borderRadius: 10, border: 'none', background: darkMode ? '#1b1a1e' : '#f9f9fa',
              padding: 12, fontSize: 16, marginBottom: 8, boxShadow: '0 1px 8px #0002'
            }}
          />
          <button
            type="submit"
            disabled={!canAdd || !text}
            style={{
              width: '90%', padding: '13px 0', borderRadius: 7, border: 'none',
              background: canAdd && text ? '#3d86f8' : '#bbb',
              color: '#fff', fontWeight: 700, fontSize: 17, marginTop: 3,
              boxShadow: canAdd && text ? '0 2px 10px #3464c420' : 'none'
            }}>
            Add Line
          </button>
        </form>
      </main>

      {/* Footer for past stories */}
      <footer style={{
        width: '100vw', minHeight: 46,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 55, padding: 10, background: 'transparent',
        color: darkMode ? '#aaa' : '#555', fontSize: 16,
        borderTop: darkMode ? '1px solid #28292c' : '1px solid #e2e2e2'
      }}>
        {/* TODO: List/archive of past stories here */}
        Story resets every 3 months. All contributions are public.&nbsp;
        Refreshes automatically every minute.
      </footer>
    </div>
  );
}