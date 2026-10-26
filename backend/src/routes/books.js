const express = require('express');
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const STATUSES = ['TO_READ', 'READING', 'COMPLETED'];

// Përdoruesi sheh vetëm librat e tij, admini sheh të gjithë
router.get('/', async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
  if (req.query.genre) where.genre = req.query.genre;
  if (req.query.status) where.status = req.query.status;
  const books = await prisma.book.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(books);
});

router.post('/', async (req, res) => {
  const { title, author, genre, status, price, pages } = req.body;
  if (!title || !author || !genre) {
    return res.status(400).json({ error: 'Titulli, autori dhe zhanri kërkohen' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status i pavlefshëm' });
  }
  const book = await prisma.book.create({
    data: {
      title, author, genre,
      status: status || 'TO_READ',
      price: price != null && price !== '' ? Number(price) : null,
      pages: pages != null && pages !== '' ? Number(pages) : null,
      userId: req.user.id,
    },
  });
  res.status(201).json(book);
});

async function loadOwned(req, res) {
  const book = await prisma.book.findUnique({ where: { id: Number(req.params.id) } });
  if (!book) { res.status(404).json({ error: 'Libri nuk u gjet' }); return null; }
  if (req.user.role !== 'ADMIN' && book.userId !== req.user.id) {
    res.status(403).json({ error: 'Nuk ke akses' }); return null;
  }
  return book;
}

router.put('/:id', async (req, res) => {
  const book = await loadOwned(req, res);
  if (!book) return;
  const { title, author, genre, status, price, pages } = req.body;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status i pavlefshëm' });
  }
  const updated = await prisma.book.update({
    where: { id: book.id },
    data: {
      title, author, genre, status,
      price: price === undefined ? undefined : (price === '' || price === null ? null : Number(price)),
      pages: pages === undefined ? undefined : (pages === '' || pages === null ? null : Number(pages)),
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const book = await loadOwned(req, res);
  if (!book) return;
  await prisma.book.delete({ where: { id: book.id } });
  res.status(204).end();
});

module.exports = router;