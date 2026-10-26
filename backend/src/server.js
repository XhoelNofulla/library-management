require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Gabim i brendshëm i serverit' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Serveri punon në http://localhost:${port}`));
