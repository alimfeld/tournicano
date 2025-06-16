import {
  iter,
  weight as maximumMatching,
} from "@graph-algorithm/maximum-matching";

export type Team = [string, string];
export type Score = [number, number];
export type Match = [Team, Team, Score | null];

export interface PlayerProps {
  readonly name: string;
  readonly active: boolean;
}

export interface EnrolledPlayer extends PlayerProps {
  readonly id: string;
}

export interface PlayerAssignment {
  readonly matches: number;
  readonly pauses: number;
  partners: Map<string, number>;
  opponents: Map<string, number>;
}

class TeamImpl {
  constructor(
    readonly p: PlayerImpl,
    readonly q: PlayerImpl,
  ) {}

  results(): ParticipantResult {
    return this.p.toCombined(this.q);
  }

  opponentSum(u: TeamImpl) {
    return (
      this.p.opponentCount(u.p.id) +
      this.p.opponentCount(u.q.id) +
      this.q.opponentCount(u.p.id) +
      this.q.opponentCount(u.q.id)
    );
  }

  toTeam(): Team {
    return [this.p.id, this.q.id];
  }
}

export class ParticipantResult {
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  plus: number = 0; // total points scored
  minus: number = 0; // total points conceded

  scoredMatchesCount() {
    return this.wins + this.losses + this.draws;
  }

  winPercentage() {
    const c = this.scoredMatchesCount();
    if (c == 0) {
      return 0.5;
    }
    return (this.wins + this.draws / 2) / c;
  }

  compare(other: ParticipantResult): number {
    const pperf = this.winPercentage();
    const qperf = other.winPercentage();
    if (pperf == qperf) {
      const pdiff = this.plus - this.minus;
      const qdiff = other.plus - other.minus;
      if (pdiff == qdiff) {
        return 0;
      }
      return qdiff - pdiff;
    }
    return qperf - pperf;
  }

  toCombined(other: ParticipantResult): ParticipantResult {
    const result = new ParticipantResult();
    result.wins = this.wins + other.wins;
    result.losses = this.losses + other.losses;
    result.draws = this.draws + other.draws;
    result.plus = this.plus + other.plus;
    result.minus = this.minus + other.minus;
    return result;
  }
}

export interface PlayerStats extends PlayerAssignment, ParticipantResult {}

export interface Player extends EnrolledPlayer, PlayerStats {}

export interface Round {
  readonly inactive: string[];
  readonly paused: string[];
  readonly matches: Match[];
}

export class Tournament {
  players: Map<string, PlayerImpl> = new Map();
  rounds: Round[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      try {
        const { players, rounds } = JSON.parse(serialized);
        players.forEach((player: EnrolledPlayer) =>
          this.players.set(
            player.id,
            new PlayerImpl(player.id, player.name, player.active),
          ),
        );
        rounds.forEach((round: Round) => this.addRound(round));
      } catch (error) {
        console.error(error);
      }
    }
  }

  serialize(): string {
    return JSON.stringify({
      players: this.players
        .values()
        .map((player) => {
          return {
            id: player.id,
            name: player.name,
            active: player.active,
          } as EnrolledPlayer;
        })
        .toArray(),
      rounds: this.rounds,
    });
  }

  enrollPlayers(names: string[]): EnrolledPlayer[] {
    return names.map((name) => {
      const id = crypto.randomUUID();
      const player = new PlayerImpl(id, name, true);
      this.players.set(id, player);
      return player;
    });
  }

  updatePlayer(id: string, props: PlayerProps) {
    this.players.get(id)!.update(props);
  }

  removePlayer(id: string): boolean {
    const player = this.players.get(id)!;
    if (player.matches + player.pauses == 0) {
      return this.players.delete(id);
    }
    return false;
  }

  createRound(matchCount: number, perfRatio: number = 0): number {
    const [competing, paused, inactive] = this.partitionPlayers(matchCount);
    const teams = this.determineTeams(competing, perfRatio);
    const matches = this.determineMatches(teams, perfRatio);
    const round = {
      inactive: inactive.map((p) => p.id),
      paused: paused.map((p) => p.id),
      matches,
    };
    this.addRound(round);
    return this.rounds.length - 1;
  }

  removeRound(r: number) {
    const round = this.rounds[r]!;
    this.updateStatsFromRound(round, false);
    this.rounds.splice(r, 1);
  }

  printRound(r: number) {
    const round = this.rounds[r]!;
    round.matches.forEach((match) => {
      const p0 = match[0][0];
      const q0 = match[0][1];
      const p1 = match[1][0];
      const q1 = match[1][1];
      let line = `${this.players.get(p0)!.name} & ${this.players.get(q0)!.name} vs. ${
        this.players.get(p1)!.name
      } & ${this.players.get(q1)!.name}`;
      if (match[2]) {
        line += ` - ${match[2][0]} : ${match[2][1]}`;
      }
      console.log(line);
    });
  }

  printPlayers() {
    this.players.forEach((player) => {
      console.log(
        `${player.name} R${player.matches}/${
          player.matches + player.pauses
        }|W${player.wins}|D${player.draws}|L${player.losses}|Δ${
          player.plus - player.minus
        }`,
      );
    });
  }

  updateScore(r: number, m: number, score: Score | null) {
    const match = this.rounds[r]!.matches[m];
    this.updateStatsFromMatch(match, false);
    match[2] = score;
    this.updateStatsFromMatch(match);
  }

  reset() {
    this.rounds = [];
    this.players.values().forEach((player) => {
      player.reset();
    });
  }

  private partitionPlayers(
    matchCount: number,
  ): [competing: PlayerImpl[], paused: PlayerImpl[], inactive: PlayerImpl[]] {
    let active: PlayerImpl[] = [];
    let inactive: PlayerImpl[] = [];
    this.players.forEach((player) => {
      player.active ? active.push(player) : inactive.push(player);
    });
    let competitorCount = matchCount * 4;
    if (active.length < competitorCount) {
      competitorCount = active.length - (active.length % 4);
    }
    if (active.length > competitorCount) {
      active.sort((p, q) => {
        return p.playPercentage() - q.playPercentage();
      });
    }
    return [
      active.slice(0, competitorCount),
      active.slice(competitorCount),
      inactive,
    ];
  }

  private determineTeams(players: PlayerImpl[], perfRatio: number): TeamImpl[] {
    const ranked = players.toSorted((p, q) => p.compare(q));
    const edges = [];
    for (let i = 0; i < ranked.length - 1; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        const p = ranked[i];
        const q = ranked[j];
        edges.push([
          i,
          j,
          this.calculateTeamWeight(p, q, j - i, ranked.length, perfRatio),
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map(
      (edge: [number, number]) =>
        new TeamImpl(ranked[edge[0]], ranked[edge[1]]),
    );
  }

  private calculateTeamWeight(
    p: PlayerImpl,
    q: PlayerImpl,
    rankDiff: number,
    playerCount: number,
    perfRatio: number,
  ): number {
    let weight = 1;
    if (perfRatio < 1) {
      weight += (1 - perfRatio) * this.calculateTeamWeightAmericano(p, q);
    }
    if (perfRatio > 0) {
      weight +=
        perfRatio * this.calculateTeamWeightMexicano(rankDiff, playerCount);
    }
    return weight;
  }

  private calculateTeamWeightAmericano(p: PlayerImpl, q: PlayerImpl): number {
    const max = this.rounds.length;
    if (max == 0) {
      return 1;
    }
    return (max - p.partnerCount(q.id)) / max;
  }

  private calculateTeamWeightMexicano(
    rankDiff: number,
    playerCount: number,
  ): number {
    return 1 - Math.abs(rankDiff - 2) / (playerCount - 3);
  }

  private determineMatches(teams: TeamImpl[], perfRatio: number): Match[] {
    const ranked = teams.toSorted((t, u) => t.results().compare(u.results()));
    const edges = [];
    for (let i = 0; i < ranked.length - 1; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        edges.push([
          i,
          j,
          this.calculateMatchWeight(
            ranked[i],
            ranked[j],
            j - i,
            ranked.length,
            perfRatio,
          ),
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map((edge: [number, number]) => [
      ranked[edge[0]].toTeam(),
      ranked[edge[1]].toTeam(),
      null,
    ]);
  }

  private calculateMatchWeight(
    t: TeamImpl,
    u: TeamImpl,
    rankDiff: number,
    teamCount: number,
    perfRatio: number,
  ): number {
    let weight = 1;
    if (perfRatio < 1) {
      weight += (1 - perfRatio) * this.calculateMatchWeightAmericano(t, u);
    }
    if (perfRatio > 0) {
      weight +=
        perfRatio * this.calculateMatchWeightMexicano(rankDiff, teamCount);
    }
    return weight;
  }

  private calculateMatchWeightAmericano(t: TeamImpl, u: TeamImpl): number {
    const max = 4 * this.rounds.length;
    if (max == 0) {
      return 1;
    }
    return (max - t.opponentSum(u)) / max;
  }

  private calculateMatchWeightMexicano(
    rankDiff: number,
    teamCount: number,
  ): number {
    return 1 - (rankDiff - 1) / (teamCount - 1);
  }

  private addRound(round: Round) {
    this.updateStatsFromRound(round);
    this.rounds.push(round);
  }

  private updateStatsFromRound(round: Round, positive: boolean = true) {
    const step = positive ? 1 : -1;
    round.paused.forEach((p) => (this.players.get(p)!.pauses += step));
    round.matches.forEach((match) => {
      [match[0], match[1]].forEach((t) => {
        const p = t[0];
        const q = t[1];
        this.players.get(p)!.matches += step;
        this.players.get(p)!.incPartner(q, step);
        this.players.get(q)!.matches += step;
        this.players.get(q)!.incPartner(p, step);
      });
      match[0].forEach((p) => {
        match[1].forEach((q) => {
          this.players.get(p)!.incOppenent(q, step);
          this.players.get(q)!.incOppenent(p, step);
        });
      });
      this.updateStatsFromMatch(match, positive);
    });
  }

  private updateStatsFromMatch(match: Match, positive: boolean = true) {
    const score = match[2];
    match[0].forEach((p) => {
      const player = this.players.get(p)!;
      if (score) {
        player.updateScore(score, positive);
      }
    });
    match[1].forEach((p) => {
      const player = this.players.get(p)!;
      if (score) {
        player.updateScore([score[1], score[0]], positive);
      }
    });
  }
}

class PlayerImpl extends ParticipantResult implements Player {
  constructor(
    readonly id: string,
    public name: string,
    public active: boolean,
  ) {
    super();
  }

  update(props: PlayerProps) {
    this.name = props.name;
    this.active = props.active;
  }

  // updated from rounds
  matches: number = 0;
  pauses: number = 0;
  partners: Map<string, number> = new Map();
  opponents: Map<string, number> = new Map();

  partnerCount(q: string) {
    return this.partners.get(q) || 0;
  }

  incPartner(q: string, step: number = 1) {
    this.partners.set(q, this.partnerCount(q) + step);
  }

  opponentCount(q: string) {
    return this.opponents.get(q) || 0;
  }

  incOppenent(q: string, step: number = 1) {
    this.opponents.set(q, this.opponentCount(q) + step);
  }

  playPercentage() {
    if (this.matches == 0 && this.pauses == 0) {
      return 0; // or 1
    }
    return this.matches / (this.matches + this.pauses);
  }

  reset() {
    this.matches = 0;
    this.pauses = 0;
    this.partners = new Map();
    this.opponents = new Map();
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
    this.plus = 0;
    this.minus = 0;
  }

  updateScore(score: Score, positive: boolean = true) {
    const plus = score[0];
    const minus = score[1];
    const step = positive ? 1 : -1;
    if (plus > minus) {
      this.wins += step;
    } else if (plus < minus) {
      this.losses += step;
    } else {
      this.draws += step;
    }
    if (positive) {
      this.plus += plus;
      this.minus += minus;
    } else {
      this.plus -= plus;
      this.minus -= minus;
    }
  }
}
