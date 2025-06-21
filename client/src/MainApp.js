import React, { useEffect, useState } from 'react';
import './App.css';

import Header from "./components/Header";
import CooldownPanel from "./components/CooldownPanel";
import AddLinePanel from "./components/AddLinePanel";
import StoryCard from "./components/StoryCard";
import NotesPanel from "./components/NotesPanel";

const API_URL = process.env.REACT_APP_API_URL;


export default function MainApp() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

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
  const [titleCooldown, setTitleCooldown] = useState(0);
  const [lineCooldown, setLineCooldown] = useState(0);
  const [nextResetAt, setNextResetAt] = useState(null);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [lastRenamer, setLastRenamer] = useState('');
  const [nextRenameAt, setNextRenameAt] = useState(null);

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

  async function fetchLineCooldown() {
    try {
      const res = await fetch(`${API_URL}/api/line/cooldown`);
      const data = await res.json();
      setLineCooldown(data.cooldown || 0);
      setCanAdd((data.cooldown || 0) === 0);
    } catch {}
  }

  useEffect(() => {
    fetchStory();
    fetchRenameStatus();
    fetchLineCooldown();

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

    const interval = setInterval(() => {
      fetchStory();
      fetchRenameStatus();
      fetchLineCooldown();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cooldownTimer = setInterval(() => {
      setTitleCooldown(nextRenameAt ? Math.max(0, Math.floor((nextRenameAt - Date.now()) / 1000)) : 0);
    }, 1000);
    const lineTimer = setInterval(() => {
      setLineCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    const resetTimer = setInterval(() => {
      setResetCountdown(nextResetAt ? Math.max(0, Math.floor((nextResetAt - Date.now()) / 1000)) : 0);
    }, 1000);
    return () => {
      clearInterval(cooldownTimer);
      clearInterval(lineTimer);
      clearInterval(resetTimer);
    };
  }, [nextRenameAt, nextResetAt]);

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
        body: JSON.stringify({ name: newTitle.trim(), username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed.');
      setEditMode(false);
      setNewTitle('');
      fetchStory();
      fetchRenameStatus();
      setSuccess('Title changed!');
      setTimeout(() => setSuccess(''), 2000);
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
        body: JSON.stringify({ text, username, color })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('limit')) fetchLineCooldown();
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

  useEffect(() => {
    localStorage.setItem('storyline_user', username);
    localStorage.setItem('storyline_color', color);
  }, [username, color]);

  // --- RENDER ---
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className="main-columns">
        <CooldownPanel
          titleCooldown={titleCooldown}
          lineCooldown={lineCooldown}
          nextResetAt={nextResetAt}
          resetCountdown={resetCountdown}
        />
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
        <div className="add-notes-container">
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
          {story && <NotesPanel storyId={story.id} />}
        </div>
      </main>
      <footer className="footer">
        Story resets every 3 months. All contributions are public. Refreshes automatically every minute.
      </footer>
    </div>
  );
}