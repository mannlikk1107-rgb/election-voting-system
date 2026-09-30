function calculateResults(election, nominations, voteCounts, eligibleVoterCount) {
  const totalVotes = voteCounts.reduce((sum, item) => sum + item.count, 0);
  const candidates = nominations.map((nomination) => {
    const votes = voteCounts.find((item) => item.nominationId === nomination.id)?.count || 0;
    return {
      id: nomination.id,
      candidateDisplayName: nomination.candidateDisplayName,
      votes,
      percentage: totalVotes ? (votes / totalVotes) * 100 : 0
    };
  });
  const highest = Math.max(0, ...candidates.map((candidate) => candidate.votes));
  const winners = highest > 0 ? candidates.filter((candidate) => candidate.votes === highest) : [];
  const eligible = Number(eligibleVoterCount) || 0;

  return {
    election,
    candidates,
    totalVotes,
    eligibleVoterCount: eligible,
    turnoutPercentage: eligible ? (totalVotes / eligible) * 100 : 0,
    winners,
    isTie: winners.length > 1
  };
}

module.exports = { calculateResults };