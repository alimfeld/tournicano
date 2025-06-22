import {
  iter,
  weight as maximumMatching,
  // @ts-ignore
} from "@graph-algorithm/maximum-matching";
import { RoundSpec, TournicanoFlavor } from "./Tournament";

interface MatchingPlayer {
  id: string;
  playRatio(): number;
  winRatio(): number;
  plusMinus(): number;
  partnerCount: (id: string) => number;
  opponentCount: (id: string) => number;
}

type MatchingTeam = [MatchingPlayer, MatchingPlayer];
type MatchingMatch = [MatchingTeam, MatchingTeam];

export const matchUp = (
  players: MatchingPlayer[],
  roundCount: number,
  spec: RoundSpec | undefined,
): [matches: MatchingMatch[], paused: MatchingPlayer[]] => {
  const maxMatches =
    spec && spec.maxMatches ? spec.maxMatches : players.length / 4;
  const flavor =
    spec && spec.flavor
      ? spec.flavor
      : { americanoFactor: 1, mexicanoFactor: 0 };
  const [competing, paused] = partition(players, maxMatches);
  const teams = teamUp(competing, roundCount, flavor);
  const matches = pairUp(teams, roundCount, flavor);
  return [matches, paused];
};

const partition = (
  players: MatchingPlayer[],
  maxMatches: number,
): [competing: MatchingPlayer[], paused: MatchingPlayer[]] => {
  let competingCount = maxMatches * 4;
  if (players.length < competingCount) {
    competingCount = players.length - (players.length % 4);
  }
  if (players.length > competingCount) {
    players.sort((p, q) => {
      return p.playRatio() - q.playRatio();
    });
  }
  return [players.slice(0, competingCount), players.slice(competingCount)];
};

const rank = ([a1, a2]: [number, number], [b1, b2]: [number, number]) => {
  if (a1 == b1) {
    if (a2 == b2) {
      return 0;
    }
    return b2 - a2;
  }
  return b1 - a1;
};

const teamUp = (
  players: MatchingPlayer[],
  roundCount: number,
  flavor: TournicanoFlavor,
): MatchingTeam[] => {
  const ranked = players.toSorted((p, q) =>
    rank([p.winRatio(), p.plusMinus()], [q.winRatio(), q.plusMinus()]),
  );
  const edges = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const p = ranked[i];
      const q = ranked[j];
      edges.push([
        i,
        j,
        calculateTeamWeight(p, q, j - i, ranked.length, roundCount, flavor),
      ]);
    }
  }
  const matching = maximumMatching(edges);
  return [...iter(matching)].map((edge: [number, number]) => [
    ranked[edge[0]],
    ranked[edge[1]],
  ]);
};

const calculateTeamWeight = (
  p: MatchingPlayer,
  q: MatchingPlayer,
  rankDiff: number,
  playerCount: number,
  roundCount: number,
  flavor: TournicanoFlavor,
): number => {
  let weight = 1;
  if (flavor.americanoFactor > 0) {
    weight +=
      flavor.americanoFactor * calculateTeamWeightAmericano(p, q, roundCount);
  }
  if (flavor.mexicanoFactor > 0) {
    weight +=
      flavor.mexicanoFactor *
      calculateTeamWeightMexicano(rankDiff, playerCount);
  }
  return weight;
};

const calculateTeamWeightAmericano = (
  p: MatchingPlayer,
  q: MatchingPlayer,
  roundCount: number,
): number => {
  if (roundCount == 0) {
    return 1;
  }
  return (roundCount - p.partnerCount(q.id)) / roundCount;
};

const calculateTeamWeightMexicano = (rankDiff: number, playerCount: number) => {
  return 1 - Math.abs(rankDiff - 2) / (playerCount - 3);
};

const pairUp = (
  teams: MatchingTeam[],
  roundCount: number,
  flavor: TournicanoFlavor,
): MatchingMatch[] => {
  const ranked = teams.toSorted((t, u) =>
    rank(
      [t[0].winRatio() + t[1].winRatio(), t[0].plusMinus() + t[1].plusMinus()],
      [u[0].winRatio() + u[1].winRatio(), u[0].plusMinus() + u[1].plusMinus()],
    ),
  );
  const edges = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      edges.push([
        i,
        j,
        calculateMatchWeight(
          ranked[i],
          ranked[j],
          j - i,
          ranked.length,
          roundCount,
          flavor,
        ),
      ]);
    }
  }
  const matching = maximumMatching(edges);
  return [...iter(matching)].map((edge: [number, number]) => [
    ranked[edge[0]],
    ranked[edge[1]],
  ]);
};

const calculateMatchWeight = (
  t: MatchingTeam,
  u: MatchingTeam,
  rankDiff: number,
  teamCount: number,
  roundCount: number,
  flavor: TournicanoFlavor,
): number => {
  let weight = 1;
  if (flavor.americanoFactor > 0) {
    weight +=
      flavor.americanoFactor * calculateMatchWeightAmericano(t, u, roundCount);
  }
  if (flavor.mexicanoFactor > 0) {
    weight +=
      flavor.mexicanoFactor * calculateMatchWeightMexicano(rankDiff, teamCount);
  }
  return weight;
};

const calculateMatchWeightAmericano = (
  t: MatchingTeam,
  u: MatchingTeam,
  roundCount: number,
): number => {
  const max = 4 * roundCount;
  if (max == 0) {
    return 1;
  }

  const opponentSum =
    t[0].opponentCount(u[0].id) +
    t[0].opponentCount(u[1].id) +
    t[1].opponentCount(u[0].id) +
    t[1].opponentCount(u[1].id);
  return (max - opponentSum) / max;
};

const calculateMatchWeightMexicano = (
  rankDiff: number,
  teamCount: number,
): number => {
  return 1 - (rankDiff - 1) / (teamCount - 1);
};
