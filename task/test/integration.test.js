// Integration tests using supertest + jest
jest.mock('../db', () => {
  const mockQuery = jest.fn(async (text, params) => {
    if (text.includes('CREATE TABLE')) return { rowCount: 0 };
    if (text.includes('SELECT id FROM roles')) return { rowCount: 0, rows: [] };
    if (text.includes('SELECT * FROM users')) return { rowCount: 0, rows: [] };
    if (text.includes('SELECT * FROM students')) return { rowCount: 0, rows: [] };
    return { rowCount: 0, rows: [] };
  });
  return { query: mockQuery, pool: { connect: jest.fn().mockResolvedValue({ release: jest.fn() }) } };
});

const request = require('supertest');
const app = require('../server');
const { generateToken } = require('../auth');

describe('Integration tests: server endpoints', () => {
  let adminToken;
  beforeAll(() => {
    adminToken = generateToken({ id: 'admin1', name: 'admin', role: 'admin' });
  });

  test('GET /api/backup/status requires auth and returns status', async () => {
    const resUnauth = await request(app).get('/api/backup/status');
    expect(resUnauth.statusCode).toBe(401);

    const res = await request(app)
      .get('/api/backup/status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('isRunning');
  });

  test('GET /status is protected and accessible only to admin/moderator', async () => {
    const resNoAuth = await request(app).get('/status');
    expect(resNoAuth.statusCode).toBe(401);

    const normalToken = generateToken({ id: 'u1', name: 'user', role: 'student' });
    const resForbidden = await request(app).get('/status').set('Authorization', `Bearer ${normalToken}`);
    expect(resForbidden.statusCode).toBe(403);

    const resOk = await request(app).get('/status').set('Authorization', `Bearer ${adminToken}`);
    expect(resOk.statusCode).toBe(200);
    expect(resOk.headers['content-type']).toMatch(/html/);
  });
});
