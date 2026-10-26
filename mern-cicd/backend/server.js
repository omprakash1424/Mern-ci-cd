const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/mern';
mongoose.connect(MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err.message));

const Note = mongoose.model('Note', new mongoose.Schema({ text: String }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/notes', async (req, res) => res.json(await Note.find()));
app.post('/api/notes', async (req, res) => {
  const note = await Note.create({ text: req.body.text });
  res.status(201).json(note);
});

app.listen(5000, () => console.log('Backend running on port 5000'));
