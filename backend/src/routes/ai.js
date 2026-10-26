const express = require('express');
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');
const { validate } = require('../sqlGuard');
const router = express.Router();
router.use(auth);

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';

const SCHEMA_PROMPT = `You translate questions into a single PostgreSQL SELECT query.
Tables (always use double quotes around table and camelCase column names):
"User"(id int, name text, email text, role text ['USER','ADMIN'], "createdAt" timestamp)
"Book"(id int, title text, author text, genre text, status text ['TO_READ','READING','COMPLETED'], price float nullable, pages int nullable, "createdAt" timestamp, "userId" int references "User".id)

Rules:
- Output ONLY the SQL query, nothing else. No explanations.
- Only SELECT. Never modify data. Never select the password column.
- Use readable column aliases.
- "popular book" means the book title that appears for the most users.

Examples:
Q: Who owns the most books?
SELECT u.name, COUNT(b.id) AS total_books FROM "User" u JOIN "Book" b ON b."userId" = u.id GROUP BY u.id, u.name ORDER BY total_books DESC LIMIT 1
Q: Show the five most expensive books.
SELECT title, author, price FROM "Book" WHERE price IS NOT NULL ORDER BY price DESC LIMIT 5
Q: Which is the most popular book?
SELECT title, author, COUNT(*) AS owners FROM "Book" GROUP BY title, author ORDER BY owners DESC LIMIT 1
Q: Which genre has the most books?
SELECT genre, COUNT(*) AS total FROM "Book" GROUP BY genre ORDER BY total DESC LIMIT 1
`;

async function askLLM(question) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `${SCHEMA_PROMPT}\nQ: ${question}\n`,
      stream: false,
      options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error('Ollama nuk u përgjigj');
  const data = await response.json();
  let text = String(data.response || '').trim();
  const fence = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  return text;
}


class Done {
  constructor(rows) { this.rows = rows; }
}

// Ekzekuton SQL në transaksion vetëm-lexim. View-t e përkohshme kufizojnë të dhënat sipas rolit.
// Transaksioni anulohet gjithmonë (rollback), kështu view-t nuk mbeten.
async function runSafe(sql, user) {
  const uid = Number(user.id);
  const isAdmin = user.role === 'ADMIN';
  const bookFilter = isAdmin ? '' : `WHERE "userId" = ${uid}`;
  const userFilter = isAdmin ? '' : `WHERE id = ${uid}`;
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`CREATE TEMP VIEW "Book" AS SELECT * FROM public."Book" ${bookFilter}`);
        await tx.$executeRawUnsafe(
          `CREATE TEMP VIEW "User" AS SELECT id, name, email, role, "createdAt" FROM public."User" ${userFilter}`
        );
        await tx.$executeRawUnsafe('SET LOCAL transaction_read_only = on');
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5000'");
        const rows = await tx.$queryRawUnsafe(`SELECT * FROM (${sql}) AS q LIMIT 100`);
        throw new Done(rows);
      },
      { timeout: 15000 }
    );
  } catch (e) {
    if (e instanceof Done) {
      return e.rows.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]))
      );
    }
    throw e;
  }
  return [];
}

// Fallback me fjalë kyçe (anglisht dhe shqip)
const NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  një: 1, dy: 2, tre: 3, katër: 4, pesë: 5, gjashtë: 6, shtatë: 7, tetë: 8, nëntë: 9, dhjetë: 10,
};

function ruleBased(question) {
  const t = question.toLowerCase();
  const m = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|një|dy|tre|katër|pesë|gjashtë|shtatë|tetë|nëntë|dhjetë)\b/);
  const n = m ? Math.min(Number(m[1]) || NUMBERS[m[1]] || 5, 50) : 5;

  if (/(who|kush)/.test(t) && /(most|shumë)/.test(t) && /(book|libra|libër)/.test(t))
    return `SELECT u.name, COUNT(b.id) AS total_books FROM "User" u JOIN "Book" b ON b."userId" = u.id GROUP BY u.id, u.name ORDER BY total_books DESC LIMIT 1`;
  if (/expensive|shtrenjt/.test(t))
    return `SELECT title, author, price FROM "Book" WHERE price IS NOT NULL ORDER BY price DESC LIMIT ${n}`;
  if (/cheap|lirë|lire/.test(t))
    return `SELECT title, author, price FROM "Book" WHERE price IS NOT NULL ORDER BY price ASC LIMIT ${n}`;
  if (/popular|popullor/.test(t))
    return `SELECT title, author, COUNT(*) AS owners FROM "Book" GROUP BY title, author ORDER BY owners DESC LIMIT 1`;
  if (/(genre|zhanr)/.test(t))
    return `SELECT genre, COUNT(*) AS total FROM "Book" GROUP BY genre ORDER BY total DESC`;
  if (/(longest|gjat|pages|faqe)/.test(t))
    return `SELECT title, author, pages FROM "Book" WHERE pages IS NOT NULL ORDER BY pages DESC LIMIT ${n}`;
  if (/(completed|përfunduar|perfunduar)/.test(t))
    return `SELECT title, author, genre FROM "Book" WHERE status = 'COMPLETED'`;
  if (/(reading|duke lexuar)/.test(t))
    return `SELECT title, author, genre FROM "Book" WHERE status = 'READING'`;
  if (/(how many|count|sa libra|sa )/.test(t))
    return `SELECT COUNT(*) AS total_books FROM "Book"`;
  return null;
}

router.post('/query', async (req, res) => {
  const question = String(req.body.question || '').trim();
  if (!question || question.length > 300) {
    return res.status(400).json({ error: 'Shkruaj një pyetje (maksimumi 300 karaktere)' });
  }

  let sql;
  let rows;
  let source = 'llm';
  try {
    sql = validate(await askLLM(question));
    rows = await runSafe(sql, req.user);
  } catch (err) {
    console.warn('AI (LLM) dështoi, po provoj rregullat:', err.message);
    const fallback = ruleBased(question);
    if (!fallback) {
      return res.status(422).json({ error: 'Nuk e kuptova pyetjen. Provo ta riformulosh ose përdor një shembull.' });
    }
    try {
      sql = validate(fallback);
      rows = await runSafe(sql, req.user);
      source = 'rules';
    } catch (err2) {
      console.error(err2);
      return res.status(500).json({ error: 'Nuk u ekzekutua dot pyetja' });
    }
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];
  res.json({ question, sql, source, columns, rows });
});

module.exports = router;
