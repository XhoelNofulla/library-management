const express = require('express');
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';

function computeStats(books) {
  const total = books.length;
  const count = (arr) => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
  const genres = count(books.map((b) => b.genre));
  const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0];
  const completed = books.filter((b) => b.status === 'COMPLETED');
  const completedGenres = Object.entries(count(completed.map((b) => b.genre))).sort((a, b) => b[1] - a[1])[0];
  const withPages = books.filter((b) => b.pages);
  const avgPages = withPages.length ? Math.round(withPages.reduce((s, b) => s + b.pages, 0) / withPages.length) : null;
  const withPrice = books.filter((b) => b.price != null);
  const totalValue = withPrice.reduce((s, b) => s + b.price, 0);
  return {
    total,
    genres,
    topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
    topCompletedGenre: completedGenres ? { name: completedGenres[0], count: completedGenres[1] } : null,
    completed: completed.length,
    reading: books.filter((b) => b.status === 'READING').length,
    toRead: books.filter((b) => b.status === 'TO_READ').length,
    avgPages,
    totalValue: Math.round(totalValue * 100) / 100,
  };
}

function buildInsights(s) {
  const out = [];
  if (!s.total) return ['Ende nuk ka libra për të analizuar.'];
  if (s.topGenre) out.push(`${s.topGenre.name} është zhanri më i shpeshtë (${s.topGenre.count} libra).`);
  if (s.topCompletedGenre) out.push(`${s.topCompletedGenre.name} është zhanri më i lexuar deri në fund (${s.topCompletedGenre.count} libra të përfunduar).`);
  if (s.avgPages) out.push(`Mesatarisht librat kanë ${s.avgPages} faqe${s.avgPages < 300 ? ': tendencë për libra të shkurtër.' : s.avgPages > 450 ? ': tendencë për libra të gjatë.' : '.'}`);
  out.push(`${s.completed} të përfunduar, ${s.reading} duke u lexuar, ${s.toRead} për t'u lexuar.`);
  out.push(`Vlera totale e koleksionit: ${s.totalValue}.`);
  return out;
}

async function summarize(name, stats) {
  try {
const prompt = `Write a 2-sentence friendly summary of this reader's habits in simple English. Use ONLY these facts, do not invent anything.\nReader: ${name}\nFacts: ${JSON.stringify(stats)}\nSummary:`;
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.3 } }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return String(data.response || '').trim() || null;
  } catch {
    return null;
  }
}

// Insights: përdoruesi për veten; admini mund të zgjedhë ?userId=
router.get('/', async (req, res) => {
  let userId = req.user.id;
  if (req.user.role === 'ADMIN' && req.query.userId) userId = Number(req.query.userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) return res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
  const books = await prisma.book.findMany({ where: { userId } });
  const stats = computeStats(books);
  const summary = req.query.summary === '1' ? await summarize(user.name, stats) : null;
  res.json({ user, stats, insights: buildInsights(stats), summary });
});

// Rekomandime: filtrim bashkëpunues (përdorues me libra të përbashkët) + zhanret e preferuara
router.get('/recommendations', async (req, res) => {
  const me = req.user.id;
  const mine = await prisma.book.findMany({ where: { userId: me } });
  const key = (b) => `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
  const owned = new Set(mine.map(key));
  const myGenres = {};
  mine.forEach((b) => (myGenres[b.genre] = (myGenres[b.genre] || 0) + 1));

  const others = await prisma.book.findMany({ where: { userId: { not: me } } });
  const byUser = {};
  others.forEach((b) => (byUser[b.userId] ||= []).push(b));

  const scores = {};
  for (const books of Object.values(byUser)) {
    const shared = books.filter((b) => owned.has(key(b))).length;
    const union = new Set([...owned, ...books.map(key)]).size;
    const similarity = union ? shared / union : 0;
    for (const b of books) {
      if (owned.has(key(b))) continue;
      const k = key(b);
      const entry = (scores[k] ||= { title: b.title, author: b.author, genre: b.genre, pages: b.pages, score: 0, reasons: new Set() });
      if (similarity > 0) {
        entry.score += similarity * 10;
        entry.reasons.add('lexuesit me shije të ngjashme e kanë');
      }
      if (myGenres[b.genre]) {
        entry.score += myGenres[b.genre];
        entry.reasons.add(`të pëlqen zhanri ${b.genre}`);
      }
    }
  }
  const recs = Object.values(scores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => ({ ...r, score: Math.round(r.score * 10) / 10, reasons: [...r.reasons].join(' · ') || 'popullor në bibliotekë' }));
  res.json(recs);
});

module.exports = router;
