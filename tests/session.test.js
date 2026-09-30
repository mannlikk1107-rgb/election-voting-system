const createSessionMiddleware = require('../src/config/session');

describe('production session configuration', () => {
  const originalEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    sessionSecret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (originalEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment.nodeEnv;
    if (originalEnvironment.sessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalEnvironment.sessionSecret;
    if (originalEnvironment.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalEnvironment.databaseUrl;
  });

  test('requires a production session secret of at least 64 characters', () => {
    process.env.SESSION_SECRET = 'short-secret';
    expect(() => createSessionMiddleware()).toThrow(/at least 64 characters/);
  });

  test('requires a production session secret to be configured', () => {
    delete process.env.SESSION_SECRET;
    expect(() => createSessionMiddleware()).toThrow(/SESSION_SECRET is required/);
  });
});