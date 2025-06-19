const API_URL = process.env.REACT_APP_API_URL;

export async function getCurrentStory() {
  const res = await fetch(`${API_URL}/api/story/current`);
  if (!res.ok) throw new Error('Failed to fetch story');
  return res.json();
}

export async function addLine(line, username, color) {
  const res = await fetch(`${API_URL}/api/line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line, username, color }),
  });
  if (!res.ok) throw new Error('Failed to add line');
  return res.json();
}