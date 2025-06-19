import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [lines, setLines] = useState([]);
  const [stats, setStats] = useState({ lines: 0, contributors: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { fetchAll(); }, [token]);

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

  // Logout
  function handleLogout() {
    setToken("");
    localStorage.removeItem("admin_token");
  }

  // --- Render ---
  return (
    <div className="app dark">
      <header className="header">
        <div style={{ width: 52 }} />
        <div className="header-title">Storyline <span style={{ fontWeight: 300 }}>- Dashboard</span></div>
        <div style={{ width: 52 }} />
      </header>

      <main style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", margin: "60px 0" }}>
        <div className="story-card" style={{ width: 820, minHeight: 340 }}>
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
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ marginBottom: 0 }}>Manage Lines</h2>
                <div>
                  <b>Total lines:</b> {stats.lines} &nbsp;&nbsp;
                  <b>Contributors:</b> {stats.contributors}
                  <button style={{
                    marginLeft: 24,
                    padding: "7px 17px", borderRadius: 5, border: "none",
                    background: "#333", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer"
                  }} onClick={handleLogout}>Logout</button>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
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
                          style={{ background: "#ed3131", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
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
              {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
            </div>
          )}
        </div>
      </main>
      <footer className="footer">
        Admin only &mdash; Moderate lines, stats, and manage the story in real time.
      </footer>
    </div>
  );
}