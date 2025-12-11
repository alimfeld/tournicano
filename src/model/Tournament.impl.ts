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
  TournamentListener,
} from "./Tournament";
import { Americano, MatchingSpec, matching } from "./Tournament.matching";
import { shuffle } from "./Util";

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
    public group: number = 0,
    public active = true,
  ) { };

  isParticipating(): boolean {
    const lastRound = this.tournament.rounds[this.tournament.rounds.length - 1];
    if (lastRound) {
      return lastRound.playerMap.has(this.id);
    }
    return false;
  }

  rename(name: string) {
    const registeredNames = new Set(
      this.tournament.players().map((p) => p.name),
    );
    if (!registeredNames.has(name)) {
      this.name = name;
      this.tournament.notifyChange();
      return true;
    }
    return false;
  }

  setGroup(group: number) {
    this.group = group;
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

  get winRatio() {
    const total = this.wins + this.losses + this.draws;
    if (total === 0) {
      return 0.5;
    }
    return (this.wins + this.draws / 2) / total;
  }

  get plusMinus() {
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
    const pperf = this.winRatio;
    const qperf = other.winRatio;
    if (pperf === qperf) {
      const pdiff = this.plusMinus;
      const qdiff = other.plusMinus;
      if (pdiff === qdiff) {
        return 0;
      }
      return qdiff - pdiff;
    }
    return qperf - pperf;
  }
}

class PlayerStatsImpl extends PerformanceImpl implements Mutable<PlayerStats> {
  partners: Map<string, number[]> = new Map();
  opponents: Map<string, number[]> = new Map();

  matchCount: number = 0;
  pauseCount: number = 0;
  lastPause: number = -1;

  constructor(
    private tournament: TournamentImpl,
    readonly id: PlayerId,
  ) {
    super();
  }

  get name() {
    return this.tournament.playerMap.get(this.id)!.name;
  }

  get group() {
    return this.tournament.playerMap.get(this.id)!.group;
  }

  get playRatio() {
    const roundCount = this.matchCount + this.pauseCount;
    return this.matchCount / roundCount;
  }

  incPartner(id: PlayerId, roundIndex: number) {
    const rounds = this.partners.get(id) || [];
    rounds.push(roundIndex);
    this.partners.set(id, rounds);
  }

  incOpponent(id: PlayerId, roundIndex: number) {
    const rounds = this.opponents.get(id) || [];
    rounds.push(roundIndex);
    this.opponents.set(id, rounds);
  }

  deepCopy(): PlayerStatsImpl {
    const copy = new PlayerStatsImpl(this.tournament, this.id);

    copy.partners = new Map([...this.partners].map(([key, value]) => [key, [...value]]))
    copy.opponents = new Map([...this.opponents].map(([key, value]) => [key, [...value]]))

    copy.matchCount = this.matchCount;
    copy.pauseCount = this.pauseCount;
    copy.lastPause = this.lastPause;

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
  ) { };
}

class MatchImpl implements Mutable<Match> {
  score?: Score;
  constructor(
    private round: RoundImpl,
    readonly teamA: TeamImpl,
    readonly teamB: TeamImpl,
  ) { };

  submitScore(score?: Score) {
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
    readonly index: number,
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
      player.lastPause = index;
      return player;
    });
    this.inactive = inactive.map((id) => {
      const player = getOrCreate(id);
      return player;
    });
    this.matches = matched.map((m) => {
      const a1 = getOrCreate(m[0][0]);
      const a2 = getOrCreate(m[0][1]);
      const b1 = getOrCreate(m[1][0]);
      const b2 = getOrCreate(m[1][1]);
      const teamA = new TeamImpl(a1, a2);
      a1.incPartner(a2.id, index);
      a2.incPartner(a1.id, index);
      b1.incPartner(b2.id, index);
      b2.incPartner(b1.id, index);
      const teamB = new TeamImpl(b1, b2);
      const match = new MatchImpl(this, teamA, teamB);
      [a1, a2, b1, b2].forEach((p) => (p.matchCount += 1));
      [a1, a2].forEach((p) => {
        [b1, b2].forEach((q) => {
          p.incOpponent(q.id, index);
          q.incOpponent(p.id, index);
        });
      });
      return match;
    });
  }

  isLast(): boolean {
    return this.tournament.rounds[this.tournament.rounds.length - 1] === this;
  }

  delete(): boolean {
    const success = this.isLast();
    if (success) {
      this.tournament.rounds.pop();
      this.tournament.notifyChange();
    }
    return success;
  }

  standings(group?: number) {
    const players = Array.from(this.playerMap.values())
      .filter((player) => group === undefined || player.group === group)
      .filter((player) => player.wins + player.draws + player.losses > 0)
      .toSorted((p, q) => {
        const result = p.compare(q);
        return result === 0 ? p.name.localeCompare(q.name) : result;
      });
    let rank = 1;
    return players.map((player, i) => {
      if (i === 0 || players[i - 1].compare(players[i]) === 0) {
        return { rank, player };
      } else {
        rank = i + 1;
        return { rank, player };
      }
    });
  }

  addPerformance(id: PlayerId, performance: Performance) {
    this.playerMap.get(id)!.add(performance);
    if (this.index + 1 < this.tournament.rounds.length) {
      const nextRound = this.tournament.rounds[this.index + 1];
      nextRound?.addPerformance(id, performance);
    }
  }

  toString() {
    let result = "";
    const r = this.tournament.rounds.indexOf(this);
    result += `Round ${r + 1}\n`;
    this.matches.forEach((match) => {
      const a1 = match.teamA.player1;
      const a2 = match.teamA.player2;
      const b1 = match.teamB.player1;
      const b2 = match.teamB.player2;
      let line = `${a1.name} & ${a2.name} vs. ${b1.name} & ${b2.name}`;
      if (match.score) {
        line += ` - ${match.score[0]} : ${match.score[1]}\n`;
      }
      result += line;
    });
    result += `Standings ${r + 1}\n`;
    this.standings().forEach((ranked) => {
      const p = ranked.player;
      let line = `${p.name} M${p.matchCount}/${p.matchCount + p.pauseCount} W${p.wins}|D${p.draws}|L${p.losses} +${p.pointsFor}/-${p.pointsAgainst} %${(p.winRatio * 100).toFixed(1)} (${p.plusMinus >= 0 ? "+" + p.plusMinus : "" + p.plusMinus})\n`;
      result += line;
    });
    return result;
  }
}

type CompactPlayer = [PlayerId, string, number, boolean];

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
        const player = new RegisteredPlayerImpl(
          this,
          cp[0],
          cp[1],
          cp[2],
          cp[3],
        );
        this.playerMap.set(player.id, player);
      });
      compact[1].forEach((cr) => {
        const previousRound = this.rounds[this.rounds.length - 1];
        const participating = previousRound
          ? Array.from(previousRound.playerMap.values())
          : [];
        const round = new RoundImpl(
          this,
          this.rounds.length,
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

  players(group?: number) {
    const players = Array.from(this.playerMap.values());
    if (group === undefined) {
      return players;
    }
    return players.filter((p) => p.group === group);
  }

  get groups() {
    return [...new Set(Array.from(this.playerMap.values()).map((p) => p.group))].sort();
  }

  get activePlayerCount() {
    return this.players().filter((p) => p.active).length;
  }

  get hasAllScoresSubmitted() {
    return this.rounds.every(r =>
      r.matches.every(m => m.score !== undefined)
    );
  }

  registerPlayers(names: string[], group: number) {
    names.forEach((name) => {
      const registeredNames = new Set(this.players().map((p) => p.name));
      if (!registeredNames.has(name)) {
        const id = crypto.randomUUID();
        const player = new RegisteredPlayerImpl(this, id, name, group);
        this.playerMap.set(player.id, player);
      }
    });
    this.notifyChange();
  }

  activateAll(active: boolean) {
    this.players().forEach((player) => player.activate(active));
  }

  activateGroup(group: number, active: boolean) {
    this.players(group).forEach((player) => player.activate(active));
  }

  createRound(spec?: MatchingSpec, maxMatches?: number): RoundImpl {
    // Determine participating players for this round:
    // Any players participating in the previous round (along with their stats) plus
    // active registered players not yet competing!
    const participating: PlayerStatsImpl[] = [];
    const previousRound = this.rounds[this.rounds.length - 1];
    if (previousRound) {
      participating.push(...Array.from(previousRound.playerMap.values()));
    }
    participating.push(
      ...shuffle(this.players() // shuffle in players to break patterns
        .filter((p) => {
          return p.active && !p.isParticipating();
        })
        .map((p) => new PlayerStatsImpl(this, p.id))),
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
    const [matched, paused] = matching(competing, spec || Americano, maxMatches);
    const round = new RoundImpl(
      this,
      this.rounds.length,
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

  restart() {
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
      this.players()
        .map((p) => [p.id, p.name, p.group, p.active]),
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
