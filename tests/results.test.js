const { calculateResults } = require('../src/utils/resultCalculation');

describe('result calculations', () => {
  const election = { id: 'election-1', title: 'Student election' };
  const candidates = [
    { id: 'nom-1', candidateDisplayName: 'Alex' },
    { id: 'nom-2', candidateDisplayName: 'Sam' }
  ];

  test('calculates vote shares, turnout, and ties', () => {
    const results = calculateResults(election, candidates, [
      { nominationId: 'nom-1', count: 2 },
      { nominationId: 'nom-2', count: 2 }
    ], 10);
    expect(results.totalVotes).toBe(4);
    expect(results.turnoutPercentage).toBe(40);
    expect(results.isTie).toBe(true);
    expect(results.winners).toHaveLength(2);
  });

  test('handles zero votes and zero eligible voters without division errors', () => {
    const results = calculateResults(election, candidates, [], 0);
    expect(results.totalVotes).toBe(0);
    expect(results.turnoutPercentage).toBe(0);
    expect(results.candidates.every((candidate) => candidate.percentage === 0)).toBe(true);
    expect(results.winners).toEqual([]);
  });
});