jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('bcrypt-hash') }));

const { getSeedPassword, seedDemoData } = require('../prisma/seed');

function createDatabase() {
  const store = {
    users: new Map(),
    elections: new Map(),
    eligibilities: new Map(),
    nominations: new Map()
  };
  let nextId = 1;

  return {
    store,
    user: {
      upsert: jest.fn(async ({ where, create, update }) => {
        const existing = store.users.get(where.email);
        if (existing) Object.assign(existing, update);
        else store.users.set(where.email, { id: `user-${nextId++}`, ...create });
        return { ...store.users.get(where.email) };
      })
    },
    election: {
      upsert: jest.fn(async ({ where, create, update }) => {
        const existing = store.elections.get(where.id);
        if (existing) Object.assign(existing, update);
        else store.elections.set(where.id, { ...create });
        return { ...store.elections.get(where.id) };
      })
    },
    voterEligibility: {
      upsert: jest.fn(async ({ where, create, update }) => {
        const key = `${where.electionId_userId.electionId}:${where.electionId_userId.userId}`;
        const existing = store.eligibilities.get(key);
        if (existing) Object.assign(existing, update);
        else store.eligibilities.set(key, { id: `eligibility-${nextId++}`, ...create });
        return { ...store.eligibilities.get(key) };
      })
    },
    nomination: {
      upsert: jest.fn(async ({ where, create, update }) => {
        const key = `${where.electionId_userId.electionId}:${where.electionId_userId.userId}`;
        const existing = store.nominations.get(key);
        if (existing) Object.assign(existing, update);
        else store.nominations.set(key, { id: `nomination-${nextId++}`, ...create });
        return { ...store.nominations.get(key) };
      })
    }
  };
}

describe('repeatable demonstration seed', () => {
  test('creates the expected roles and eligibility records and remains idempotent', async () => {
    const database = createDatabase();
    const first = await seedDemoData(database, 'CampusPass123');
    const second = await seedDemoData(database, 'CampusPass123');

    const accounts = [...database.store.users.values()];
    expect(accounts).toHaveLength(7);
    expect(accounts.filter((user) => user.role === 'ADMINISTRATOR')).toHaveLength(1);
    expect(accounts.filter((user) => user.role === 'CANDIDATE')).toHaveLength(3);
    expect(accounts.filter((user) => user.role === 'VOTER')).toHaveLength(3);
    expect(accounts.every((user) => user.passwordHash === 'bcrypt-hash')).toBe(true);
    expect(database.store.elections.size).toBe(1);
    expect(database.store.nominations.size).toBe(3);
    expect([...database.store.nominations.values()].every((record) => record.status === 'APPROVED')).toBe(true);
    expect([...database.store.eligibilities.values()].filter((record) => record.status === 'APPROVED')).toHaveLength(2);
    expect([...database.store.eligibilities.values()].filter((record) => record.status === 'PENDING')).toHaveLength(1);
    expect(first.election.id).toBe('demo-student-union-election');
    expect(second.election.id).toBe(first.election.id);
  });

  test('requires a policy-compliant demo password', async () => {
    await expect(seedDemoData(createDatabase(), 'weak')).rejects.toThrow(/8\+ characters/);
  });

  test('requires an explicitly configured seed password', () => {
    expect(() => getSeedPassword({})).toThrow(/SEED_ADMIN_PASSWORD/);
    expect(getSeedPassword({ SEED_ADMIN_PASSWORD: 'PrivateDemo123' })).toBe('PrivateDemo123');
  });
});