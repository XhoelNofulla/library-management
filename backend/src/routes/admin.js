const express = require('express');
const prisma = require('../prisma');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth, adminOnly);

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { books: true } } },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Rol i pavlefshëm' });
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Nuk mund të fshish veten' });
  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

module.exports = router;
