import React, { useEffect, useState } from 'react';
import './App.css';

import Header from "./components/Header";

const API_URL = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [lines, setLines] = useState([]);
  const [stats, setStats] = useState({ lines: 0, contributors: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState([]);
  const [tab, setTab] = useState('flags');

  // Secure login
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!res.ok) throw new Error("Wrong password");
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("admin_token", data.token);
      setPassword("");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // Fetch all data after login
  async function fetchAll() {
    if (!token) return;
    setLoading(true);
    try {
      const [linesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/lines`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (!linesRes.ok || !statsRes.ok) throw new Error("Not authorized or server error");
      const linesData = await linesRes.json();
      const statsData = await statsRes.json();
      setLines(linesData.lines || []);
      setStats(statsData || {});
    } catch (err) {
      setError("Failed to fetch admin data.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (token) {
      fetchAll();
      fetchFlags();
    }
  }, [token]);

  // Delete line
  async function deleteLine(id) {
    if (!window.confirm("Are you sure you want to delete this line?")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/line/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed.");
      setLines(lines => lines.filter(l => l.id !== id));
      setStats(s => ({ ...s, lines: s.lines - 1 }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchFlags() {
    try {
      const res = await fetch(`${API_URL}/api/admin/flags`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFlags(data.flags || []);
    } catch {}
  }

  // Logout
  function handleLogout() {
    setToken("");
    localStorage.removeItem("admin_token");
  }

  // --- Render ---
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
  
      <main style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", margin: "60px 0" }}>
        <div className="story-card" style={{ width: 860, minHeight: 400 }}>
          {!token ? (
            <form onSubmit={handleLogin} style={{ maxWidth: 320, margin: "60px auto", textAlign: "center" }}>
              <h2>Admin Login</h2>
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: 8, fontSize: 16, borderRadius: 5, marginBottom: 15 }}
              />
              <button
                type="submit"
                style={{
                  padding: "10px 36px", borderRadius: 7, border: "none", background: "#3d86f8",
                  color: "#fff", fontWeight: 700, fontSize: 17
                }}
                disabled={loading || !password}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
            </form>
          ) : (
            <>
              {/* Top Panel */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>Admin Dashboard</h2>
                  <div>
                    <b>Total lines:</b> {stats.lines} &nbsp;&nbsp;
                    <b>Contributors:</b> {stats.contributors}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "8px 20px", borderRadius: 6, background: "#222",
                    color: "#fff", border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer"
                  }}
                >
                  Logout
                </button>
              </div>
                
              {/* Tab Switch */}
              <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
                <button
                  onClick={() => setTab('flags')}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 5,
                    fontWeight: 600,
                    border: tab === 'flags' ? '2px solid #36f' : '1px solid #888',
                    background: tab === 'flags' ? '#eef2ff' : 'transparent',
                    cursor: "pointer"
                  }}
                >
                  🚩 Flagged Lines
                </button>
                <button
                  onClick={() => setTab('lines')}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 5,
                    fontWeight: 600,
                    border: tab === 'lines' ? '2px solid #36f' : '1px solid #888',
                    background: tab === 'lines' ? '#eef2ff' : 'transparent',
                    cursor: "pointer"
                  }}
                >
                  📜 All Lines
                </button>
              </div>
                
              {/* Flag Table */}
              {tab === 'flags' && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ccc", background: "#f7f7f9" }}>
                      <th>ID</th>
                      <th>Text</th>
                      <th>User</th>
                      <th>Reason</th>
                      <th>Flagged By</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#999", padding: 20 }}>No flags found.</td>
                      </tr>
                    ) : (
                      flags.map(f => (
                        <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td>{f.line_id}</td>
                          <td>{f.text}</td>
                          <td>{f.username}</td>
                          <td>{f.reason || '—'}</td>
                          <td>{f.flagged_by}</td>
                          <td>{new Date(f.flagged_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
  
              {/* Lines Table */}
              {tab === 'lines' && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ccc", background: "#f7f7f9" }}>
                      <th>ID</th>
                      <th>User</th>
                      <th>Color</th>
                      <th>Line</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => (
                      <tr key={l.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td>{l.id}</td>
                        <td>{l.username}</td>
                        <td>
                          <span style={{
                            display: "inline-block",
                            width: 18, height: 18, borderRadius: 4,
                            background: l.color || "#eee", border: "1px solid #ccc"
                          }} title={l.color}></span>
                        </td>
                        <td>{l.text}</td>
                        <td style={{ fontSize: 13 }}>{l.created_at && l.created_at.replace("T", " ").slice(0, 16)}</td>
                        <td>
                          <button
                            style={{
                              background: "#ed3131", color: "#fff", border: "none",
                              padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontWeight: 700
                            }}
                            onClick={() => deleteLine(l.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ color: "#888", textAlign: "center", padding: 30 }}>
                          No lines yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
  
              {/* Error Output */}
              {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}