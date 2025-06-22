import { Mutable } from "./Mutable";
import {
  Match,
  Performance,
  PlayerStats,
  PlayerId,
  RegisteredPlayer,
  Round,
  Score,
  Team,
  Tournament,
  TournamentFactory,
  RoundSpec,
  TournamentListener,
} from "./Tournament";
import { matchUp } from "./Tournament.matching";

export const tournamentFactory: TournamentFactory = {
  create(serialized?: string) {
    return new TournamentImpl(serialized);
  },
};

class RegisteredPlayerImpl implements Mutable<RegisteredPlayer> {
  constructor(
    private tournament: TournamentImpl,
    readonly id: string,
    public name: string,
    public active = true,
  ) {}

  isParticipating(): boolean {
    const lastRound = this.tournament.rounds.at(-1);
    if (lastRound) {
      return lastRound.playerMap.has(this.id);
    }
    return false;
  }

  rename(name: string) {
    this.name = name;
    this.tournament.notifyChange();
  }

  activate(active: boolean) {
    this.active = active;
    this.tournament.notifyChange();
  }

  withdraw() {
    let success = false;
    if (!this.isParticipating()) {
      success = this.tournament.playerMap.delete(this.id);
      if (success) {
        this.tournament.notifyChange();
      }
    }
    return success;
  }
}

class PerformanceImpl implements Mutable<Performance> {
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  pointsFor: number = 0;
  pointsAgainst: number = 0;

  winRatio() {
    const total = this.wins + this.losses + this.draws;
    if (total == 0) {
      return 0.5;
    }
    return (this.wins + this.draws / 2) / total;
  }

  plusMinus() {
    return this.pointsFor - this.pointsAgainst;
  }

  apply(score: Score, positive: boolean = true) {
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
      this.pointsFor += plus;
      this.pointsAgainst += minus;
    } else {
      this.pointsFor -= plus;
      this.pointsAgainst -= minus;
    }
  }

  add(other: Performance): void {
    this.wins += other.wins;
    this.losses += other.losses;
    this.draws += other.draws;
    this.pointsFor += other.pointsFor;
    this.pointsAgainst += other.pointsAgainst;
  }

  compare(other: PerformanceImpl): number {
    const pperf = this.winRatio();
    const qperf = other.winRatio();
    if (pperf == qperf) {
      const pdiff = this.plusMinus();
      const qdiff = other.plusMinus();
      if (pdiff == qdiff) {
        return 0;
      }
      return qdiff - pdiff;
    }
    return qperf - pperf;
  }
}

class PlayerStatsImpl extends PerformanceImpl implements Mutable<PlayerStats> {
  partnerCounts: Map<string, number> = new Map();
  opponentCounts: Map<string, number> = new Map();

  matchCount: number = 0;
  pauseCount: number = 0;

  constructor(
    private tournament: TournamentImpl,
    readonly id: PlayerId,
  ) {
    super();
  }

  get name() {
    return this.tournament.playerMap.get(this.id)!.name;
  }

  playRatio() {
    const roundCount = this.matchCount + this.pauseCount;
    if (roundCount == 0) {
      return 0; // or 1
    }
    return this.matchCount / roundCount;
  }

  partnerCount(id: PlayerId): number {
    return this.partnerCounts.get(id) || 0;
  }

  opponentCount(id: PlayerId): number {
    return this.opponentCounts.get(id) || 0;
  }

  incPartner(id: PlayerId, step: number = 1) {
    this.partnerCounts.set(id, this.partnerCount(id) + step);
  }

  incOpponent(id: PlayerId, step: number = 1) {
    this.opponentCounts.set(id, this.opponentCount(id) + step);
  }

  deepCopy(): PlayerStatsImpl {
    const copy = new PlayerStatsImpl(this.tournament, this.id);

    copy.partnerCounts = new Map(this.partnerCounts);
    copy.opponentCounts = new Map(this.opponentCounts);

    copy.matchCount = this.matchCount;
    copy.pauseCount = this.pauseCount;

    copy.wins = this.wins;
    copy.losses = this.losses;
    copy.draws = this.draws;
    copy.pointsFor = this.pointsFor;
    copy.pointsAgainst = this.pointsAgainst;

    return copy;
  }
}

class TeamImpl implements Team {
  constructor(
    readonly player1: PlayerStatsImpl,
    readonly player2: PlayerStatsImpl,
  ) {}
}

class MatchImpl implements Mutable<Match> {
  score?: Score;
  constructor(
    private round: RoundImpl,
    readonly teamA: TeamImpl,
    readonly teamB: TeamImpl,
  ) {}

  submitScore(score: Score | undefined) {
    const diffA = new PerformanceImpl();
    const diffB = new PerformanceImpl();
    if (score) {
      diffA.apply(score);
      diffB.apply([score[1], score[0]]);
    }
    if (this.score) {
      diffA.apply(this.score, false);
      diffB.apply([this.score[1], this.score[0]], false);
    }
    this.score = score;
    this.round.addPerformance(this.teamA.player1.id, diffA);
    this.round.addPerformance(this.teamA.player2.id, diffA);
    this.round.addPerformance(this.teamB.player1.id, diffB);
    this.round.addPerformance(this.teamB.player2.id, diffB);
    this.round.tournament.notifyChange();
  }
}

class RoundImpl implements Round {
  matches: MatchImpl[] = [];
  paused: PlayerStatsImpl[];
  inactive: PlayerStatsImpl[];
  playerMap: Map<PlayerId, PlayerStatsImpl>;

  constructor(
    readonly tournament: TournamentImpl,
    participating: PlayerStatsImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[],
  ) {
    this.playerMap = new Map(participating.map((p) => [p.id, p.deepCopy()]));
    const getOrCreate = (id: PlayerId) => {
      let result = this.playerMap.get(id);
      if (!result) {
        result = new PlayerStatsImpl(this.tournament, id);
        this.playerMap.set(id, result);
      }
      return result;
    };
    this.paused = paused.map((id) => {
      const player = getOrCreate(id);
      player.pauseCount += 1;
      return player;
    });
    this.inactive = inactive.map((id) => {
      const player = getOrCreate(id);
      player.pauseCount += 1;
      return player;
    });
    this.matches = matched.map((m) => {
      const a1 = getOrCreate(m[0][0]);
      const a2 = getOrCreate(m[0][1]);
      const b1 = getOrCreate(m[1][0]);
      const b2 = getOrCreate(m[1][1]);
      const teamA = new TeamImpl(a1, a2);
      a1.incPartner(a2.id);
      a2.incPartner(a1.id);
      b1.incPartner(b2.id);
      b2.incPartner(b1.id);
      const teamB = new TeamImpl(b1, b2);
      const match = new MatchImpl(this, teamA, teamB);
      [a1, a2, b1, b2].forEach((p) => (p.matchCount += 1));
      [a1, a2].forEach((p) => {
        [b1, b2].forEach((q) => {
          p.incOpponent(q.id);
          q.incOpponent(p.id);
        });
      });
      return match;
    });
  }

  isLast(): boolean {
    return this.tournament.rounds.at(-1) === this;
  }

  delete(): boolean {
    const success = this.isLast();
    if (success) {
      this.tournament.rounds.pop();
      this.tournament.notifyChange();
    }
    return success;
  }

  standings() {
    return this.playerMap
      .values()
      .toArray()
      .filter((player) => player.wins + player.draws + player.losses > 0)
      .toSorted((p, q) => {
        const result = p.compare(q);
        return result == 0 ? p.name.localeCompare(q.name) : result;
      });
  }

  addPerformance(id: PlayerId, performance: Performance) {
    this.playerMap.get(id)!.add(performance);
    const r = this.tournament.rounds.indexOf(this);
    this.tournament.rounds
      .slice(r + 1)
      .forEach((nextRound) => nextRound.addPerformance(id, performance));
  }

  toString() {
    let result = "";
    const r = this.tournament.rounds.indexOf(this);
    result += `Round ${r + 1}\n`;
    this.matches.forEach((match) => {
      const a1 = match.teamA.player1;
      const a2 = match.teamA.player2;
      const b1 = match.teamB.player2;
      const b2 = match.teamB.player2;
      let line = `${a1.name} & ${a2.name} vs. ${b1.name} & ${b2.name}`;
      if (match.score) {
        line += ` - ${match.score[0]} : ${match.score[1]}\n`;
      }
      result += line;
    });
    result += `Standings ${r + 1}\n`;
    this.standings().forEach((p) => {
      let line = `${p.name} M${p.matchCount}/${p.matchCount + p.pauseCount} W${p.wins}|D${p.draws}|L${p.losses} +${p.pointsFor}/-${p.pointsAgainst} %${(p.winRatio() * 100).toFixed(1)} (${p.plusMinus() >= 0 ? "+" + p.plusMinus() : "" + p.plusMinus()})\n`;
      result += line;
    });
    return result;
  }
}

type CompactPlayer = [PlayerId, string, boolean];

type CompactTeam = [PlayerId, PlayerId];

type CompactMatch = [CompactTeam, CompactTeam, Score | undefined];

type CompactRound = [
  CompactMatch[],
  PlayerId[],
  PlayerId[],
]; /* matches, paused, inactive */

type CompactTournament = [CompactPlayer[], CompactRound[]];

class TournamentImpl implements Mutable<Tournament> {
  private listeners: TournamentListener[] = [];
  playerMap: Map<PlayerId, RegisteredPlayerImpl> = new Map();
  rounds: RoundImpl[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      const compact = JSON.parse(serialized) as CompactTournament;
      compact[0].forEach((cp) => {
        const player = new RegisteredPlayerImpl(this, cp[0], cp[1], cp[2]);
        this.playerMap.set(player.id, player);
      });
      compact[1].forEach((cr) => {
        const previousRound = this.rounds.at(-1);
        const participating = previousRound
          ? previousRound.playerMap.values().toArray()
          : [];
        const round = new RoundImpl(
          this,
          participating,
          cr[0].map((cm) => [cm[0], cm[1]]),
          cr[1],
          cr[2],
        );
        this.rounds.push(round);
        round.matches.forEach((match, i) => {
          const score = cr[0][i][2];
          if (score) {
            match.submitScore(score);
          }
        });
      });
    }
  }

  get players() {
    return this.playerMap.values().toArray();
  }

  registerPlayers(names: string[]) {
    names.forEach((name) => {
      const id = crypto.randomUUID();
      const player = new RegisteredPlayerImpl(this, id, name);
      this.playerMap.set(player.id, player);
    });
    this.notifyChange();
  }

  createRound(spec: RoundSpec | undefined): RoundImpl {
    // Determine participating players for this round:
    // Any players participating in the previous round (along with their stats) plus
    // active registered players not yet competing!
    const participating: PlayerStatsImpl[] = [];
    const previousRound = this.rounds.at(-1);
    if (previousRound) {
      participating.push(...previousRound.playerMap.values().toArray());
    }
    participating.push(
      ...this.players
        .filter((p) => {
          return p.active && !p.isParticipating();
        })
        .map((p) => new PlayerStatsImpl(this, p.id)),
    );
    const [competing, inactive] = participating.reduce(
      (acc: [PlayerStatsImpl[], PlayerId[]], player) => {
        if (this.playerMap.get(player.id)!.active) {
          acc[0].push(player);
        } else {
          acc[1].push(player.id);
        }
        return acc;
      },
      [[], []],
    );
    const [matched, paused] = matchUp(competing, this.rounds.length, spec);
    const round = new RoundImpl(
      this,
      participating,
      matched.map((m) => [
        [m[0][0].id, m[0][1].id],
        [m[1][0].id, m[1][1].id],
      ]),
      paused.map((p) => p.id),
      inactive,
    );
    this.rounds.push(round);
    this.notifyChange();
    return round;
  }

  clearRounds() {
    this.rounds = [];
    this.notifyChange();
  }

  reset(): void {
    this.playerMap = new Map();
    this.rounds = [];
    this.notifyChange();
  }

  serialize() {
    const compact: CompactTournament = [
      this.players
        .values()
        .toArray()
        .map((p) => [p.id, p.name, p.active]),
      this.rounds.map((round) => [
        round.matches.map((match) => [
          [match.teamA.player1.id, match.teamA.player2.id],
          [match.teamB.player1.id, match.teamB.player2.id],
          match.score,
        ]),
        round.paused.map((p) => p.id),
        round.inactive.map((p) => p.id),
      ]),
    ];
    return JSON.stringify(compact);
  }

  addListener(listener: TournamentListener) {
    this.listeners.push(listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener.onchange(this));
  }
}
