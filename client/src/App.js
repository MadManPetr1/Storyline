import React, { useEffect, useState } from 'react';
const API_URL = process.env.REACT_APP_API_URL;

function getRandomColor() {
  const colors = ['#C0392B','#2980B9','#27AE60','#8E44AD','#F39C12','#16A085'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function App() {
  const [story, setStory] = useState(null);
  const [lines, setLines] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem('storyline_user') || '');
  const [color, setColor] = useState(localStorage.getItem('storyline_color') || getRandomColor());
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canAdd, setCanAdd] = useState(true);
  const [loading, setLoading] = useState(true);

  // Rename states
  const [editMode, setEditMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameCooldown, setRenameCooldown] = useState(null);
  const [lastRenamer, setLastRenamer] = useState('');

  // Save user credentials
  useEffect(() => {
    localStorage.setItem('storyline_user', username);
    localStorage.setItem('storyline_color', color);
  }, [username, color]);

  // Fetch current story and lines
  const fetchStory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/story/current`);
      if (!res.ok) throw new Error('Failed to fetch story.');
      const data = await res.json();
      setStory(data.story);
      setLines(data.lines);
      setError('');
    } catch (err) {
      setError('Error loading story.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchStory(); }, []);

  // Auto-refresh story and rename status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStory();
      fetchRenameStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Add a new line
  const addLine = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCanAdd(false);
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
          setCanAdd(false);
        }
        throw new Error(data.error || 'Failed to add line');
      }
      setSuccess('Line added!');
      setText('');
      fetchStory();
      setCanAdd(true);
    } catch (err) {
      setError(err.message);
    }
    setTimeout(() => setSuccess(''), 2500);
  };

  // Story rename logic

  // Check story rename cooldown/status
  const fetchRenameStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/story/rename-status`);
      const data = await res.json();
      if (data.nextAllowed) {
        setRenameCooldown(new Date(data.nextAllowed));
        setLastRenamer(data.lastRenamer);
      } else {
        setRenameCooldown(null);
        setLastRenamer('');
      }
    } catch {
      setRenameCooldown(null);
      setLastRenamer('');
    }
  };
  useEffect(() => { fetchRenameStatus(); }, [story]);

  // Handle rename button
  const handleRename = async () => {
    setRenameError('');
    if (!newTitle.trim()) {
      setRenameError('Title cannot be empty.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/story/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitle.trim(),
          username
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.nextAllowed) {
          setRenameCooldown(new Date(data.nextAllowed));
          setRenameError(
            `Cooldown active. Next rename: ${new Date(data.nextAllowed).toLocaleString()} (last by ${data.lastRenamer})`
          );
        } else {
          setRenameError(data.error || 'Rename failed.');
        }
      } else {
        setEditMode(false);
        setNewTitle('');
        fetchStory();
        fetchRenameStatus();
      }
    } catch {
      setRenameError('Rename request failed.');
    }
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: '40px auto',
      fontFamily: 'sans-serif',
      padding: 20,
      borderRadius: 10,
      background: '#fafafa',
      boxShadow: '0 0 12px #ccc',
      minHeight: 500
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {editMode ? (
          <>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              maxLength={40}
              style={{ fontSize: 28, padding: 4, borderRadius: 6, border: '1px solid #aaa', marginRight: 10 }}
            />
            <button onClick={handleRename} style={{ marginRight: 8 }}>Save</button>
            <button onClick={() => { setEditMode(false); setRenameError(''); }}>Cancel</button>
          </>
        ) : (
          <>
            <h1 style={{ marginRight: 12 }}>{story ? (story.name || 'Untitled') : 'Loading Story...'}</h1>
            <button
              onClick={() => { setEditMode(true); setNewTitle(story ? (story.name || '') : ''); setRenameError(''); }}
              disabled={renameCooldown && renameCooldown > new Date()}
              style={{
                padding: '2px 10px',
                borderRadius: 4,
                border: 'none',
                background: (renameCooldown && renameCooldown > new Date()) ? '#aaa' : '#3d86f8',
                color: '#fff',
                cursor: (renameCooldown && renameCooldown > new Date()) ? 'not-allowed' : 'pointer'
              }}
              title={renameCooldown && renameCooldown > new Date()
                ? `Cooldown active. Next rename: ${renameCooldown.toLocaleString()}`
                : 'Rename Story'}
            >
              Rename
            </button>
          </>
        )}
      </div>
      {renameError && <div style={{ color: 'crimson', fontSize: 15 }}>{renameError}</div>}
      {renameCooldown && renameCooldown > new Date() && (
        <div style={{ color: '#555', fontSize: 13 }}>
          Next rename: {renameCooldown.toLocaleString()}
          {lastRenamer && ` (last by ${lastRenamer})`}
        </div>
      )}

      <hr />
      <div style={{ minHeight: 220 }}>
        {loading
          ? <div>Loading...</div>
          : lines.length === 0
            ? <div>No lines yet.</div>
            : lines.map((line, i) => (
              <div
                key={line.id}
                style={{ marginBottom: 8, padding: 8, background: '#fff', borderRadius: 4 }}
                title={line.username ? `by ${line.username}` : 'Anonymous'}
              >
                <span style={{
                  borderBottom: line.username ? `2px solid ${line.color || '#aaa'}` : 'none',
                  color: line.color || '#333'
                }}>
                  {line.text}
                </span>
                {line.username && (
                  <span style={{ fontSize: 12, color: line.color || '#666', marginLeft: 6 }}>
                    [by {line.username}]
                  </span>
                )}
              </div>
            ))
        }
      </div>

      <form onSubmit={addLine} style={{ marginTop: 32, marginBottom: 16 }}>
        <input
          placeholder="Your username (optional)"
          value={username}
          style={{ marginRight: 8, padding: 6, borderRadius: 4, border: '1px solid #aaa', width: 130 }}
          onChange={e => setUsername(e.target.value)}
          maxLength={20}
        />
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          style={{ marginRight: 8, width: 36, height: 36, verticalAlign: 'middle' }}
          title="Choose your underline color"
        />
        <input
          required
          placeholder="Add your line..."
          value={text}
          style={{ marginRight: 8, padding: 6, borderRadius: 4, border: '1px solid #aaa', width: 200 }}
          onChange={e => setText(e.target.value)}
          maxLength={120}
          disabled={!canAdd}
        />
        <button type="submit" disabled={!canAdd || !text} style={{
          padding: '8px 16px', borderRadius: 4, border: 'none',
          background: canAdd && text ? '#3d86f8' : '#aaa', color: '#fff'
        }}>
          Add Line
        </button>
      </form>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
      {!canAdd && <div style={{ color: '#555', fontSize: 13 }}>You can add another line in 24h.</div>}
      <hr />
      <div style={{ fontSize: 13, color: '#888' }}>
        Story resets every 3 months. All contributions are public.<br />
        Refreshes automatically every minute.
      </div>
    </div>
  );
}

export default App;