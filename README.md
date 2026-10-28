# 📚 Library Management System

Aplikacion web ku çdo përdorues menaxhon bibliotekën e tij personale, me panel admini dhe asistent AI që përgjigjet në pyetje në gjuhë natyrore për të dhënat.

## Veçoritë

- **Regjistrim dhe login** me JWT, fjalëkalime të hash-uara me bcrypt
- **Libra**: shto, ndrysho, fshi; zhanër dhe status leximi (Për t'u lexuar, Duke lexuar, Përfunduar); filtrim sipas zhanrit dhe statusit
- **Role**: `USER` sheh dhe menaxhon vetëm librat e tij; `ADMIN` menaxhon të gjithë librat dhe përdoruesit (ndryshim roli, fshirje)
- **AI Query Agent**: pyetje si *"Who owns the most books?"*, *"Show the five most expensive books."*. Modeli lokal (Ollama) përkthen pyetjen në SQL, rezultati shfaqet si tabelë
- **Library Insights**: statistika të gjeneruara nga të dhënat (zhanri më i lexuar, mesatarja e faqeve etj.) dhe përmbledhje me AI
- **Rekomandime**: sugjerime librash me filtrim bashkëpunues (përdorues me shije të ngjashme) dhe sipas zhanreve të preferuara
- Light/dark mode

## Teknologjitë

React + Vite, Node.js + Express, PostgreSQL + Prisma, JWT, Ollama (`qwen2.5-coder`), Jest + Supertest, Docker + Docker Compose.

## Modeli i të dhënave

- **User**: id, name, email, password, role (USER/ADMIN), createdAt
- **Book**: id, title, author, genre, status, price, pages, createdAt, userId
- Lidhja: **një User ka shumë Book** (`Book.userId`, fshirje në kaskadë)

## Si ta nisësh me Docker 

Kërkon Docker Desktop.

```bash
docker compose up --build -d
```

- Aplikacioni: http://localhost:8080
- API: http://localhost:4000/api

Krijo përdoruesit demo dhe adminin:

```bash
docker compose exec backend node prisma/seed.js
```

Hyrje: `admin@test.com` / `admin123` (admin). Përdoruesit demo: `alba@test.com`, `besnik@test.com`, `elira@test.com` me fjalëkalim `test123`.

## Si ta nisësh lokalisht

1. `docker compose up -d db` (vetëm databaza)
2. Backend:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma migrate deploy
   node prisma/seed.js
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Hape http://localhost:5173

## AI Assistant (Ollama)

1. Instalo Ollama nga https://ollama.com
2. `ollama pull qwen2.5-coder:3b`
3. Lëre Ollama të ndezur. Backend-i e thërret te `http://localhost:11434`.

**Siguria e text-to-SQL:** pranohet vetëm një `SELECT`; bllokohen komentet, `;` dhe fjalët INSERT/UPDATE/DELETE/DROP etj.; query ekzekutohet në transaksion vetëm-lexim me timeout 5s dhe `LIMIT 100`; përdoruesi i zakonshëm sheh vetëm të dhënat e veta (view-t e përkohshme sipas rolit); fjalëkalimet nuk ekspozohen kurrë. Nëse modeli dështon, hyn një parser me fjalë kyçe (anglisht dhe shqip).

## Pamje


