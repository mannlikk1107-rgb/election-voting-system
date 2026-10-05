process.env.NODE_ENV = 'test';

jest.mock('../src/controllers/adminController', () => ({
  dashboard: jest.fn((req, res) => res.status(200).send('admin-dashboard')),
  eligibilities: jest.fn((req, res) => res.status(200).end()),
  reviewEligibility: jest.fn((req, res) => res.status(200).end()),
  nominations: jest.fn((req, res) => res.status(200).end()),
  reviewNomination: jest.fn((req, res) => res.status(200).end()),
  auditLogs: jest.fn((req, res) => res.status(200).end())
}));

jest.mock('../src/controllers/electionController', () => ({
  renderCreate: jest.fn((req, res) => res.status(200).end()),
  create: jest.fn((req, res) => res.status(200).end()),
  renderEdit: jest.fn((req, res) => res.status(200).end()),
  update: jest.fn((req, res) => res.status(200).end()),
  changeStatus: jest.fn((req, res) => res.status(204).end())
}));

const express = require('express');
const path = require('path');
const request = require('supertest');
const adminRoutes = require('../src/routes/adminRoutes');
const electionController = require('../src/controllers/electionController');

function createApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../src/views'));
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const role = req.get('x-test-role');
    req.session = { user: role ? { id: 'test-user', role, fullName: 'Test User' } : null };
    res.locals.currentUser = req.session.user;
    res.locals.flash = null;
    res.locals.currentPath = req.path;
    res.locals.csrfToken = 'test-csrf-token';
    next();
  });
  app.use('/admin', adminRoutes);
  return app;
}

describe('administrator election status route', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  test.each([undefined, 'INVALID'])('rejects invalid or missing status and redirects to the election page', async (status) => {
    const body = status === undefined ? {} : { status };
    const response = await request(app)
      .post('/admin/elections/election-123/status')
      .set('x-test-role', 'ADMINISTRATOR')
      .type('form')
      .send(body);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/elections/election-123');
    expect(electionController.changeStatus).not.toHaveBeenCalled();
  });

  test('passes a valid requested state and election route parameter to the controller', async () => {
    const response = await request(app)
      .post('/admin/elections/election-123/status')
      .set('x-test-role', 'ADMINISTRATOR')
      .type('form')
      .send({ status: 'NOMINATION' });

    expect(response.status).toBe(204);
    expect(electionController.changeStatus).toHaveBeenCalledTimes(1);
    expect(electionController.changeStatus.mock.calls[0][0].params.electionId).toBe('election-123');
    expect(electionController.changeStatus.mock.calls[0][0].body.status).toBe('NOMINATION');
  });

  test.each(['VOTER', 'CANDIDATE'])('%s cannot access administrator routes', async (role) => {
    const response = await request(app).get('/admin').set('x-test-role', role);
    expect(response.status).toBe(403);
  });

  test('an administrator can access the protected dashboard', async () => {
    const response = await request(app).get('/admin').set('x-test-role', 'ADMINISTRATOR');
    expect(response.status).toBe(200);
    expect(response.text).toBe('admin-dashboard');
  });
});