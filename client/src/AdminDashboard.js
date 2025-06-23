import React, { useEffect, useState } from 'react';
import './App.css';
import Header from "./components/Header";

const API_URL = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  // --- Theme ---
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // --- Auth & State ---
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Data ---
  const [stats, setStats] = useState({ lines: 0, contributors: 0 });
  const [lines, setLines] = useState([]);
  const [flags, setFlags] = useState([]);
  const [rawFlags, setRawFlags] = useState(null);

  // --- UI ---
  const [tab, setTab] = useState('flags');

  // --- Auth: login ---
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
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
      setError(err.message || "Login failed.");
    }
    setLoading(false);
  }

  // --- Data fetchers ---
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

  async function fetchFlags() {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/flags`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFlags(data.flags || []);
    } catch {
      setFlags([]);
    }
  }

  async function fetchRawFlags() {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/debug-flags`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRawFlags(data);
    } catch {
      setRawFlags([{ error: "Failed to load flags." }]);
    }
  }

  // --- Delete line ---
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

  // --- Logout ---
  function handleLogout() {
    setToken("");
    localStorage.removeItem("admin_token");
  }

  // --- Data sync on login ---
  useEffect(() => {
    if (token) {
      fetchAll();
      fetchFlags();
    }
  }, [token]);

  // --- RENDER ---
  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", margin: "60px 0" }}>
        <div className="story-card" style={{ width: 880, minHeight: 420 }}>
          {/* --- LOGIN PANEL --- */}
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
              {/* --- HEADER PANEL --- */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>Admin Dashboard</h2>
                  <div>
                    <b>Total lines:</b> {stats.lines} &nbsp;&nbsp;
                    <b>Contributors:</b> {stats.contributors}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`${API_URL}/api/admin/download-db`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#2577f7", color: "#fff", padding: "7px 20px",
                      borderRadius: 6, fontWeight: 600, textDecoration: "none"
                    }}
                  >
                    ⬇ Download Database
                  </a>
                  <button
                    onClick={fetchRawFlags}
                    style={{
                      background: "#36c", color: "#fff", padding: "7px 18px",
                      borderRadius: 6, fontWeight: 600, border: "none", cursor: "pointer"
                    }}
                  >
                    🧩 Show Raw Flags
                  </button>
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
              </div>

              {/* --- TABS --- */}
              <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
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

              {/* --- RAW FLAGS JSON (optional) --- */}
              {rawFlags && (
                <div style={{
                  background: "#eee", color: "#333", fontSize: 15, padding: 16,
                  borderRadius: 8, margin: "20px 0", maxHeight: 240, overflow: "auto"
                }}>
                  <b>Raw Flags Table:</b>
                  <pre style={{ fontSize: 13 }}>{JSON.stringify(rawFlags, null, 2)}</pre>
                </div>
              )}

              {/* --- FLAGGED LINES TABLE --- */}
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

              {/* --- ALL LINES TABLE --- */}
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

              {/* --- ERRORS --- */}
              {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}