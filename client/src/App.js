import React, { useEffect, useState } from 'react';
const API_URL = process.env.REACT_APP_API_URL;

function getRandomColor() {
  // Simple color generator for usernames
  const colors = ['#C0392B','#2980B9','#27AE60','#8E44AD','#F39C12','#16A085'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function timeLeft(target) {
  const now = new Date();
  const diff = (new Date(target) - now) / 1000;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  return `${h}h ${m}m ${s}s`;
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
  const [cooldown, setCooldown] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Check daily cooldown after posting
  const checkCooldown = async () => {
    // Here you might implement a real endpoint `/api/timer` to check, for now check on error response
  };

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
          setCooldown('24h'); // Real implementation: get next eligible time from backend
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

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(fetchStory, 60000);
    return () => clearInterval(interval);
  }, []);

  // Render
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
      <h1>
        {story ? story.name || 'Untitled Story' : 'Loading Story...'}
      </h1>
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
