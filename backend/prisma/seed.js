const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const BOOKS = {
  fantasy: [
    ['The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 310, 14.5],
    ['Harry Potter 1', 'J.K. Rowling', 'Fantasy', 223, 12],
    ['A Game of Thrones', 'George R.R. Martin', 'Fantasy', 694, 18],
    ['The Name of the Wind', 'Patrick Rothfuss', 'Fantasy', 662, 16],
  ],
  scifi: [
    ['Dune', 'Frank Herbert', 'Sci-Fi', 412, 12.5],
    ['Neuromancer', 'William Gibson', 'Sci-Fi', 271, 11],
    ['Foundation', 'Isaac Asimov', 'Sci-Fi', 255, 10],
    ['The Martian', 'Andy Weir', 'Sci-Fi', 369, 13],
  ],
  classic: [
    ['1984', 'George Orwell', 'Dystopia', 328, 9],
    ['Brave New World', 'Aldous Huxley', 'Dystopia', 311, 9.5],
    ['The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 180, 8],
    ['Pride and Prejudice', 'Jane Austen', 'Classic', 279, 7.5],
  ],
};

const USERS = [
  { name: 'Admin', email: 'admin@test.com', role: 'ADMIN', picks: [] },
  { name: 'Alba', email: 'alba@test.com', picks: [...BOOKS.fantasy, BOOKS.scifi[0], BOOKS.scifi[1]] },
  { name: 'Besnik', email: 'besnik@test.com', picks: [...BOOKS.scifi, BOOKS.fantasy[0], BOOKS.classic[0]] },
  { name: 'Elira', email: 'elira@test.com', picks: [...BOOKS.classic, BOOKS.fantasy[1], BOOKS.scifi[2]] },
];

const STATUSES = ['COMPLETED', 'COMPLETED', 'READING', 'TO_READ'];

async function main() {
  const password = await bcrypt.hash('test123', 10);
  for (const u of USERS) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (exists) continue;
    const pwd = u.role === 'ADMIN' ? await bcrypt.hash('admin123', 10) : password;
    const user = await prisma.user.create({
      data: { name: u.name, email: u.email, password: pwd, role: u.role || 'USER' },
    });
    if (!u.picks.length) continue;
    await prisma.book.createMany({
      data: u.picks.map(([title, author, genre, pages, price], i) => ({
        title, author, genre, pages, price,
        status: STATUSES[i % STATUSES.length],
        userId: user.id,
      })),
    });
  }
  console.log('Seed përfundoi. Admin: admin@test.com/admin123. Demo: alba/besnik/elira @test.com, fjalëkalimi test123');
}


main().finally(() => prisma.$disconnect());
