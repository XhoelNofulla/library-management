const { validate } = require('../src/sqlGuard');

describe('validate (mbrojtja e SQL-it të AI)', () => {
  test('pranon një SELECT të thjeshtë', () => {
    expect(validate('SELECT title FROM "Book" LIMIT 5')).toBe('SELECT title FROM "Book" LIMIT 5');
  });

  test('heq pikëpresjen në fund', () => {
    expect(validate('SELECT 1;')).toBe('SELECT 1');
  });

  test('pranon WITH (CTE)', () => {
    expect(() => validate('WITH x AS (SELECT 1 AS a) SELECT a FROM x')).not.toThrow();
  });

  test.each([
    ['DROP TABLE "Book"'],
    ['DELETE FROM "Book"'],
    ['UPDATE "User" SET role = \'ADMIN\''],
    ['INSERT INTO "Book" VALUES (1)'],
    ['SELECT 1; DROP TABLE "Book"'],
    ['SELECT * FROM "Book" -- komente'],
    ['SELECT /* x */ 1'],
    ['SELECT * FROM pg_user'],
    ['SELECT * FROM information_schema.tables'],
    ['SELECT set_config(\'a\', \'b\', false)'],
    [''],
  ])('refuzon: %s', (sql) => {
    expect(() => validate(sql)).toThrow();
  });
});
