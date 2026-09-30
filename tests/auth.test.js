process.env.NODE_ENV = 'test';

jest.mock('../src/config/database', () => ({
  user: {
    findFirst: jest.fn(),
    create: jest.fn()
  }
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { authenticateUser, registerUser } = require('../src/services/authService');

describe('authentication pages', () => {
  test('serves the homepage without requiring PostgreSQL', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Home / 首頁');
    expect(response.text).toContain('Your voice,');
  });

  test('registration form includes session-bound CSRF protection', async () => {
    const response = await request(app).get('/register');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/name="_csrf" value="[a-f0-9]{64}"/);
  });

  test('rejects an invalid registration before database access', async () => {
    const browser = request.agent(app);
    const form = await browser.get('/register');
    const token = form.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
    const response = await browser.post('/register').type('form').send({
      _csrf: token,
      fullName: 'Test User',
      email: 'not-an-email',
      username: 'tester',
      password: 'weak',
      confirmPassword: 'different'
    });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/register');
  });

  test('rejects state changes without a valid CSRF token', async () => {
    const response = await request(app).post('/login').type('form').send({ identifier: 'student', password: 'AnyPassword123' });
    expect(response.status).toBe(403);
    expect(response.text).toContain('Your form expired');
  });

  test('registration normalizes email, hashes passwords, and returns no password hash', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'user-1',
      fullName: data.fullName,
      email: data.email,
      username: data.username,
      role: data.role,
      accountStatus: 'ACTIVE'
    }));
    const user = await registerUser({
      fullName: 'Test User',
      email: 'STUDENT@EXAMPLE.EDU',
      username: 'student',
      password: 'CampusPass1'
    });
    const savedData = prisma.user.create.mock.calls[0][0].data;
    expect(savedData.email).toBe('student@example.edu');
    expect(await bcrypt.compare('CampusPass1', savedData.passwordHash)).toBe(true);
    expect(user).not.toHaveProperty('passwordHash');
    expect(user.role).toBe('VOTER');
  });

  test('login verifies the password and never returns its stored hash', async () => {
    const passwordHash = await bcrypt.hash('CampusPass1', 4);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1', fullName: 'Test User', email: 'student@example.edu', username: 'student',
      passwordHash, role: 'VOTER', accountStatus: 'ACTIVE'
    });
    const user = await authenticateUser('STUDENT@EXAMPLE.EDU', 'CampusPass1');
    expect(user.email).toBe('student@example.edu');
    expect(user).not.toHaveProperty('passwordHash');
    await expect(authenticateUser('student@example.edu', 'wrong-password')).resolves.toBeNull();
  });

  test('login regenerates the session and logout destroys it', async () => {
    const passwordHash = await bcrypt.hash('CampusPass1', 4);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1', fullName: 'Test User', email: 'student@example.edu', username: 'student',
      passwordHash, role: 'VOTER', accountStatus: 'ACTIVE'
    });
    const browser = request.agent(app);
    const loginPage = await browser.get('/login');
    const initialCookie = loginPage.headers['set-cookie'][0].split(';')[0];
    const csrf = loginPage.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
    const login = await browser.post('/login').type('form').send({
      _csrf: csrf,
      identifier: 'student@example.edu',
      password: 'CampusPass1'
    });
    expect(login.status).toBe(302);
    expect(login.headers.location).toBe('/dashboard');
    const authenticatedCookie = login.headers['set-cookie'][0].split(';')[0];
    expect(authenticatedCookie).not.toBe(initialCookie);

    const page = await browser.get('/');
    const logoutCsrf = page.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
    const logout = await browser.post('/logout').type('form').send({ _csrf: logoutCsrf });
    expect(logout.status).toBe(302);
    expect(logout.headers.location).toBe('/');
    expect(logout.headers['set-cookie'].join(';')).toContain('election.sid=;');
  });
});