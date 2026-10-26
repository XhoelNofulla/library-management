const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prisma');

const alice = { name: 'Alice', email: 'alice@t.com', password: 'secret123' };
const bob = { name: 'Bob', email: 'bob@t.com', password: 'secret123' };
const root = { name: 'Root', email: 'root@t.com', password: 'secret123' };

let aliceToken, bobToken, adminToken, bookId;

async function register(u) {
  return request(app).post('/api/auth/register').send(u);
}
async function login(u) {
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password });
  return res.body.token;
}

beforeAll(async () => {
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  await register(alice);
  await register(bob);
  await register(root);
  await prisma.user.update({ where: { email: root.email }, data: { role: 'ADMIN' } });
  aliceToken = await login(alice);
  bobToken = await login(bob);
  adminToken = await login(root);
});

afterAll(async () => {
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Autentikimi', () => {
  test('regjistrimi me fjalëkalim të shkurtër dështon (400)', async () => {
    const res = await register({ name: 'X', email: 'x@t.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('email i dyfishtë kthen 409', async () => {
    const res = await register(alice);
    expect(res.status).toBe(409);
  });

  test('login me fjalëkalim të gabuar kthen 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: alice.email, password: 'gabim' });
    expect(res.status).toBe(401);
  });

  test('login i saktë kthen token dhe rolin', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: alice.email, password: alice.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('USER');
  });

  test('përgjigjja nuk përmban fjalëkalimin', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: alice.email, password: alice.password });
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
  });
});

describe('Librat (CRUD)', () => {
  test('pa token kthen 401', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(401);
  });

  test('krijimi pa titull kthen 400', async () => {
    const res = await request(app).post('/api/books').set('Authorization', `Bearer ${aliceToken}`).send({ author: 'A' });
    expect(res.status).toBe(400);
  });

  test('krijimi i librit punon', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Dune', author: 'Herbert', genre: 'Sci-Fi', price: 12.5, pages: 412 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('TO_READ');
    bookId = res.body.id;
  });

  test('përdoruesi sheh vetëm librat e tij', async () => {
    const mine = await request(app).get('/api/books').set('Authorization', `Bearer ${aliceToken}`);
    const others = await request(app).get('/api/books').set('Authorization', `Bearer ${bobToken}`);
    expect(mine.body).toHaveLength(1);
    expect(others.body).toHaveLength(0);
  });

  test('përdoruesi tjetër nuk mund ta fshijë (403)', async () => {
    const res = await request(app).delete(`/api/books/${bookId}`).set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  test('redaktimi i statusit punon', async () => {
    const res = await request(app)
      .put(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });

  test('status i pavlefshëm kthen 400', async () => {
    const res = await request(app)
      .put(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'GABIM' });
    expect(res.status).toBe(400);
  });

  test('admini sheh librat e të gjithëve', async () => {
    const res = await request(app).get('/api/books').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Admin', () => {
  test('përdoruesi i zakonshëm merr 403', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(403);
  });

  test('admini merr listën e përdoruesve', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test('admini nuk mund të fshijë veten (400)', async () => {
    const me = await prisma.user.findUnique({ where: { email: root.email } });
    const res = await request(app).delete(`/api/admin/users/${me.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  test('admini mund ta fshijë një përdorues', async () => {
    const b = await prisma.user.findUnique({ where: { email: bob.email } });
    const res = await request(app).delete(`/api/admin/users/${b.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});

describe('AI Query', () => {
  test('pa token kthen 401', async () => {
    const res = await request(app).post('/api/ai/query').send({ question: 'test' });
    expect(res.status).toBe(401);
  });

  test('pyetje boshe kthen 400', async () => {
    const res = await request(app).post('/api/ai/query').set('Authorization', `Bearer ${aliceToken}`).send({ question: '' });
    expect(res.status).toBe(400);
  });
});
