import { useEffect, useState } from 'react';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');

  const load = () =>
    fetch('/api/notes').then((r) => r.json()).then(setNotes).catch(() => {});

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    setText('');
    load();
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>OM Notes</h1>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note" />
      <button onClick={add}>Add</button>
      <ul>{notes.map((n) => <li key={n._id}>{n.text}</li>)}</ul>
    </div>
  );
}
