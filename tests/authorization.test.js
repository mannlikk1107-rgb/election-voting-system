process.env.NODE_ENV = 'test';

const request = require('supertest');
const path = require('path');
const ejs = require('ejs');
const app = require('../src/app');
const { requireAdministrator, requireCandidate } = require('../src/middleware/roles');

function responseDouble() {
  return { status: jest.fn().mockReturnThis(), render: jest.fn() };
}

describe('authorization', () => {
  test('renders a friendly 403 page without requiring an optional message', async () => {
    const viewPath = path.join(__dirname, '../src/views/errors/403.ejs');
    const html = await ejs.renderFile(viewPath, {
      title: 'Access denied',
      currentUser: null,
      flash: null,
      currentPath: '/',
      csrfToken: 'test-token'
    });
    expect(html).toContain('Your account does not have permission to view this page.');
  });

  test('redirects anonymous users from protected pages', async () => {
    const response = await request(app).get('/dashboard');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test.each(['/admin', '/admin/eligibilities', '/admin/nominations', '/candidate'])('blocks anonymous direct access to %s', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  test('blocks a voter from administrator access', () => {
    const res = responseDouble();
    const next = jest.fn();
    requireAdministrator({ session: { user: { role: 'VOTER' } } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.any(Object));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows only candidates through the candidate gate', () => {
    const next = jest.fn();
    requireCandidate({ session: { user: { role: 'CANDIDATE' } } }, responseDouble(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});