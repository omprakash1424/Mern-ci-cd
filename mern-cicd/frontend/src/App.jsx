import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#fff7c2', '#ffd6d6', '#d6f5d6', '#d6e8ff', '#ead6ff', '#ffffff'];

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function Palette({ value, onChange }) {
  return (
    <div className="palette">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={'swatch' + (value === c ? ' active' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={'Colour ' + c}
        />
      ))}
    </div>
  );
}

function NoteForm({ onCreated, onError }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState([]);

  const addDraftTask = () => {
    const t = taskText.trim();
    if (!t) return;
    setTasks([...tasks, t]);
    setTaskText('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const pending = taskText.trim() ? [...tasks, taskText.trim()] : tasks;
    try {
      const note = await api('/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content, color, tasks: pending })
      });
      onCreated(note);
      setTitle('');
      setContent('');
      setTasks([]);
      setTaskText('');
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <form className="new-note" style={{ background: color }} onSubmit={submit}>
      <input
        className="title-input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Write a note..."
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {tasks.length > 0 && (
        <ul className="draft-tasks">
          {tasks.map((t, i) => (
            <li key={i}>
              {t}
              <button type="button" className="link" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <input
          placeholder="Add a task and press Enter"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addDraftTask();
            }
          }}
        />
        <button type="button" className="btn light" onClick={addDraftTask}>
          + Task
        </button>
      </div>
      <div className="row between">
        <Palette value={color} onChange={setColor} />
        <button type="submit" className="btn">Add note</button>
      </div>
    </form>
  );
}

function NoteCard({ note, onUpdate, onDelete, onError }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title || note.text || '');
  const [content, setContent] = useState(note.content || '');
  const [color, setColor] = useState(note.color || COLORS[0]);
  const [taskText, setTaskText] = useState('');

  const tasks = note.tasks || [];
  const done = tasks.filter((t) => t.done).length;
  const base = '/notes/' + note._id;

  const run = async (fn) => {
    try {
      onUpdate(await fn());
    } catch (err) {
      onError(err.message);
    }
  };

  const save = () =>
    run(async () => {
      const updated = await api(base, {
        method: 'PUT',
        body: JSON.stringify({ title, content, color })
      });
      setEditing(false);
      return updated;
    });

  const cancel = () => {
    setTitle(note.title || note.text || '');
    setContent(note.content || '');
    setColor(note.color || COLORS[0]);
    setEditing(false);
  };

  const togglePin = () =>
    run(() => api(base, { method: 'PUT', body: JSON.stringify({ pinned: !note.pinned }) }));

  const addTask = () => {
    const text = taskText.trim();
    if (!text) return;
    run(async () => {
      const updated = await api(base + '/tasks', { method: 'POST', body: JSON.stringify({ text }) });
      setTaskText('');
      return updated;
    });
  };

  const toggleTask = (t) =>
    run(() => api(base + '/tasks/' + t._id, { method: 'PATCH', body: JSON.stringify({ done: !t.done }) }));

  const removeTask = (t) => run(() => api(base + '/tasks/' + t._id, { method: 'DELETE' }));

  const remove = async () => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api(base, { method: 'DELETE' });
      onDelete(note._id);
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div className="card" style={{ background: editing ? color : note.color || COLORS[0] }}>
      {editing ? (
        <>
          <input className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          <Palette value={color} onChange={setColor} />
          <div className="row">
            <button className="btn" onClick={save}>Save</button>
            <button className="btn light" onClick={cancel}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="card-head">
            <h3>{note.title || note.text || 'Untitled'}</h3>
            <button className={'icon' + (note.pinned ? ' on' : '')} onClick={togglePin} title="Pin">
              {note.pinned ? '\u2605' : '\u2606'}
            </button>
          </div>
          {note.content && <p className="content">{note.content}</p>}
        </>
      )}

      {tasks.length > 0 && (
        <>
          <div className="progress"><span style={{ width: (done / tasks.length) * 100 + '%' }} /></div>
          <small>{done}/{tasks.length} done</small>
          <ul className="tasks">
            {tasks.map((t) => (
              <li key={t._id} className={t.done ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                  <span>{t.text}</span>
                </label>
                <button className="link" onClick={() => removeTask(t)} title="Delete task">✕</button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="row">
        <input
          placeholder="Add task"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <button className="btn light" onClick={addTask}>+</button>
      </div>

      {!editing && (
        <div className="row between card-actions">
          <button className="link" onClick={() => setEditing(true)}>Edit</button>
          <button className="link danger" onClick={remove}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/notes')
      .then(setNotes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const replaceNote = (updated) =>
    setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (!q) return true;
        const haystack = [n.title, n.text, n.content, ...(n.tasks || []).map((t) => t.text)]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
  }, [notes, search]);

  const allTasks = notes.flatMap((n) => n.tasks || []);
  const doneTasks = allTasks.filter((t) => t.done).length;

  return (
    <div className="app">
      <header>
        <h1>Notes &amp; Tasks</h1>
        <p>{notes.length} notes &middot; {doneTasks}/{allTasks.length} tasks done</p>
      </header>

      {error && (
        <div className="error" onClick={() => setError('')}>
          {error} (tap to dismiss)
        </div>
      )}

      <NoteForm onCreated={(n) => setNotes((prev) => [n, ...prev])} onError={setError} />

      <input
        className="search"
        placeholder="Search notes and tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="empty">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="empty">{search ? 'Nothing matches your search.' : 'No notes yet. Add your first one above.'}</p>
      ) : (
        <div className="grid">
          {visible.map((n) => (
            <NoteCard
              key={n._id}
              note={n}
              onUpdate={replaceNote}
              onDelete={(id) => setNotes((prev) => prev.filter((x) => x._id !== id))}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}
