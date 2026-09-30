const { validateElectionDates } = require('../src/utils/dateValidation');
const { canTransitionElection, getElectionStatus } = require('../src/utils/electionStatus');
const { Prisma } = require('@prisma/client');

const dates = {
  nominationStart: '2026-10-01T09:00:00Z',
  nominationEnd: '2026-10-10T09:00:00Z',
  votingStart: '2026-10-10T09:00:00Z',
  votingEnd: '2026-10-20T09:00:00Z'
};

describe('election timing and transitions', () => {
  test('generated schema exposes app relation names and uniqueness barriers', () => {
    const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
    const relationNames = models.get('Election').fields.map((field) => field.name);
    expect(relationNames).toContain('nominations');

    const uniqueScalars = (modelName) => models.get(modelName).fields.filter((field) => field.isUnique).map((field) => field.name);
    const uniquePairs = (modelName) => models.get(modelName).uniqueFields.map((fields) => fields.join(':'));
    expect(uniqueScalars('User')).toEqual(expect.arrayContaining(['email', 'username']));
    expect(uniquePairs('VoterEligibility')).toContain('electionId:userId');
    expect(uniquePairs('Nomination')).toContain('electionId:userId');
    expect(uniquePairs('Vote')).toContain('electionId:voterId');
  });

  test('accepts correctly ordered dates and permits adjacent phases', () => {
    expect(validateElectionDates(dates)).toBeNull();
  });

  test('rejects nomination or voting windows in the wrong order', () => {
    expect(validateElectionDates({ ...dates, nominationEnd: '2026-10-11T09:00:00Z' })).toMatch(/Nomination must end/);
    expect(validateElectionDates({ ...dates, votingEnd: dates.votingStart })).toMatch(/Voting start/);
  });

  test('allows only valid, time-gated status changes', () => {
    const election = { status: 'DRAFT', nominationStart: dates.nominationStart, nominationEnd: dates.nominationEnd };
    expect(canTransitionElection(election, 'NOMINATION', new Date('2026-10-02T00:00:00Z'))).toBe(true);
    expect(canTransitionElection(election, 'VOTING', new Date('2026-10-02T00:00:00Z'))).toBe(false);
    expect(canTransitionElection(election, 'NOMINATION', new Date('2026-09-30T00:00:00Z'))).toBe(false);
  });

  test('reports an ended voting election as closed', () => {
    expect(getElectionStatus({ status: 'VOTING', votingEnd: dates.votingEnd }, new Date('2026-10-21T00:00:00Z'))).toBe('CLOSED');
  });
});