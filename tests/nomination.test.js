const { isWithinNominationPeriod } = require('../src/utils/electionStatus');

describe('nomination window', () => {
  const election = {
    status: 'NOMINATION',
    nominationStart: new Date('2026-10-01T09:00:00Z'),
    nominationEnd: new Date('2026-10-10T09:00:00Z')
  };

  test('accepts nominations inside the configured window', () => {
    expect(isWithinNominationPeriod(election, new Date('2026-10-05T09:00:00Z'))).toBe(true);
  });

  test('rejects nominations outside the window or in another election state', () => {
    expect(isWithinNominationPeriod(election, new Date('2026-10-11T09:00:00Z'))).toBe(false);
    expect(isWithinNominationPeriod({ ...election, status: 'VOTING' }, new Date('2026-10-05T09:00:00Z'))).toBe(false);
  });
});