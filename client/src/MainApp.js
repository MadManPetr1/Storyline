import React, { useEffect, useState } from 'react';
import './App.css';

import Header from "./components/Header";
import CooldownPanel from "./components/CooldownPanel";
import AddLinePanel from "./components/AddLinePanel";
import StoryCard from "./components/StoryCard";

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
        {/* Cooldown Panel */}
        <CooldownPanel
          titleCooldown={titleCooldown}
          lineCooldown={lineCooldown}
          nextResetAt={nextResetAt}
          resetCountdown={resetCountdown}
        />
        {/* Center Story Card */}
        <StoryCard
          story={story}
          lines={lines}
          editMode={editMode}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          titleCooldown={titleCooldown}
          handleRename={handleRename}
          setEditMode={setEditMode}
          error={error}
          success={success}
        />
        {/* Right Add Line Box */}
        <AddLinePanel
          username={username}
          setUsername={setUsername}
          color={color}
          setColor={setColor}
          text={text}
          setText={setText}
          canAdd={canAdd}
          addLine={addLine}
        />
      </main>

      <footer className="footer">
        Story resets every 3 months. All contributions are public.&nbsp;
        Refreshes automatically every minute.
      </footer>
    </div>);
}