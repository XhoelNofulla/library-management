const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Emri, email dhe fjalëkalimi (min. 6 karaktere) kërkohen' });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email ekziston tashmë' });

  const user = await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Email ose fjalëkalim i gabuar' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

module.exports = router;
