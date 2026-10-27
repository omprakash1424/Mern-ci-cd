const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/mern';
mongoose
  .connect(MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err.message));

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false }
});

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    text: String, // kept so notes from the first version still show up
    content: { type: String, default: '' },
    color: { type: String, default: '#fff7c2' },
    pinned: { type: Boolean, default: false },
    tasks: [taskSchema]
  },
  { timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);

// forwards errors from async routes to the error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const findNote = async (id) => {
  const note = await Note.findById(id);
  if (!note) {
    const err = new Error('Note not found');
    err.status = 404;
    throw err;
  }
  return note;
};

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// list notes (pinned first, newest first)
app.get('/api/notes', wrap(async (req, res) => {
  res.json(await Note.find().sort({ pinned: -1, updatedAt: -1 }));
}));

// create a note (optionally with tasks)
app.post('/api/notes', wrap(async (req, res) => {
  const { title = '', content = '', color, tasks = [] } = req.body;
  const taskList = tasks
    .map((t) => String(t).trim())
    .filter(Boolean)
    .map((text) => ({ text }));

  if (!title.trim() && !content.trim() && taskList.length === 0) {
    return res.status(400).json({ error: 'Add a title, some text or a task' });
  }
  const note = await Note.create({ title, content, color, tasks: taskList });
  res.status(201).json(note);
}));

// edit title / content / colour / pin
app.put('/api/notes/:id', wrap(async (req, res) => {
  const note = await findNote(req.params.id);
  ['title', 'content', 'color', 'pinned'].forEach((field) => {
    if (req.body[field] !== undefined) note[field] = req.body[field];
  });
  await note.save();
  res.json(note);
}));

// delete a note
app.delete('/api/notes/:id', wrap(async (req, res) => {
  const note = await findNote(req.params.id);
  await note.deleteOne();
  res.json({ ok: true });
}));

// add a task to a note
app.post('/api/notes/:id/tasks', wrap(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Task text is required' });
  const note = await findNote(req.params.id);
  note.tasks.push({ text });
  await note.save();
  res.status(201).json(note);
}));

// tick / untick a task
app.patch('/api/notes/:id/tasks/:taskId', wrap(async (req, res) => {
  const note = await findNote(req.params.id);
  const task = note.tasks.id(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.done = req.body.done !== undefined ? Boolean(req.body.done) : !task.done;
  await note.save();
  res.json(note);
}));

// delete a task
app.delete('/api/notes/:id/tasks/:taskId', wrap(async (req, res) => {
  const note = await findNote(req.params.id);
  note.tasks.pull({ _id: req.params.taskId });
  await note.save();
  res.json(note);
}));

app.use((err, req, res, next) => {
  const status =
    err.status || (err.name === 'CastError' || err.name === 'ValidationError' ? 400 : 500);
  res.status(status).json({ error: err.message });
});

app.listen(5000, () => console.log('Backend running on port 5000'));
