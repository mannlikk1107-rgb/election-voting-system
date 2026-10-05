const { validateElectionDates } = require('../src/utils/dateValidation');
const { canTransitionElection, getElectionStatus } = require('../src/utils/electionStatus');
const { Prisma } = require('@prisma/client');
const path = require('path');
const ejs = require('ejs');

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

describe('election status and request error views', () => {
  test('400 view displays the supplied transition error message', async () => {
    const html = await ejs.renderFile(path.join(__dirname, '../src/views/errors/400.ejs'), {
      title: 'Invalid request',
      message: 'Election cannot move from DRAFT to NOMINATION now.',
      currentUser: null,
      flash: null,
      currentPath: '/elections/election-1',
      csrfToken: 'test-token'
    });
    expect(html).toContain('Invalid request.');
    expect(html).toContain('Election cannot move from DRAFT to NOMINATION now.');
    expect(html).toContain('Browse elections');
  });

  test('archived election renders a final-status message and no transition form', async () => {
    const electionId = 'election-archived';
    const html = await ejs.renderFile(path.join(__dirname, '../src/views/elections/show.ejs'), {
      title: 'Archived election',
      election: {
        id: electionId,
        title: 'Archived election',
        description: 'Election details.',
        rules: '',
        status: 'ARCHIVED',
        nominationStart: new Date('2026-09-01T00:00:00Z'),
        nominationEnd: new Date('2026-09-02T00:00:00Z'),
        votingStart: new Date('2026-09-03T00:00:00Z'),
        votingEnd: new Date('2026-09-04T00:00:00Z'),
        nominations: []
      },
      eligibility: null,
      nomination: null,
      currentUser: { id: 'admin-1', fullName: 'Test Admin', role: 'ADMINISTRATOR' },
      flash: null,
      currentPath: `/elections/${electionId}`,
      csrfToken: 'test-token'
    });
    expect(html).toContain('Final status reached.');
    expect(html).not.toContain(`/admin/elections/${electionId}/status`);
    expect(html).not.toContain('Change status');
  });

  test('non-final election renders its next status transition form', async () => {
    const electionId = 'election-draft';
    const html = await ejs.renderFile(path.join(__dirname, '../src/views/elections/show.ejs'), {
      title: 'Draft election',
      election: {
        id: electionId,
        title: 'Draft election',
        description: 'Election details.',
        rules: '',
        status: 'DRAFT',
        nominationStart: new Date('2026-10-01T00:00:00Z'),
        nominationEnd: new Date('2026-10-02T00:00:00Z'),
        votingStart: new Date('2026-10-03T00:00:00Z'),
        votingEnd: new Date('2026-10-04T00:00:00Z'),
        nominations: []
      },
      eligibility: null,
      nomination: null,
      currentUser: { id: 'admin-1', fullName: 'Test Admin', role: 'ADMINISTRATOR' },
      flash: null,
      currentPath: `/elections/${electionId}`,
      csrfToken: 'test-token'
    });
    expect(html).toContain(`/admin/elections/${electionId}/status`);
    expect(html).toContain('name="_csrf"');
    expect(html).toContain('Change status');
    expect(html).toContain('NOMINATION');
  });
});