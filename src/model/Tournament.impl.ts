import { Mutable } from "./Mutable";
import {
  Match,
  Performance,
  ParticipatingPlayer,
  PlayerId,
  Player,
  Round,
  RoundInfo,
  Score,
  Team,
  Tournament,
  TournamentFactory,
  TournamentListener,
} from "./Tournament";
import { Americano, MatchingSpec, matching, partitionPlayers } from "./Tournament.matching";
import { shuffle } from "./Util";
import { Settings } from "./Settings.ts";

// Export data structures
interface TournamentBackup {
  version: number;
  exportDate: string;
  settings: {
    courts: number;
    matchingSpec: MatchingSpec;
  };
  players: {
    name: string;
    group: number;
    active: boolean;
  }[];
  rounds: {
    matches: {
      teamA: [string, string];
      teamB: [string, string];
      score?: Score;
    }[];
    paused: string[];
    inactive: string[];
  }[];
}

export const tournamentFactory: TournamentFactory = {
  create(serialized?: string) {
    return new TournamentImpl(serialized);
  },
};

class PlayerImpl implements Mutable<Player> {
  constructor(
    private tournament: TournamentImpl,
    readonly id: string,
    public name: string,
    public group: number = 0,
    public active = false,
  ) { };

  inAnyRound(): boolean {
    const lastRound = this.tournament.rounds[this.tournament.rounds.length - 1];
    if (lastRound) {
      return lastRound.playerMap.has(this.id);
    }
    return false;
  }

  canRenameTo(name: string): boolean {
    const existingNames = this.tournament.players()
      .filter(p => p.id !== this.id)
      .map(p => p.name);
    
    return !existingNames.includes(name);
  }

  rename(name: string) {
    if (!this.canRenameTo(name)) {
      return false;
    }
    this.name = name;
    this.tournament.notifyChange();
    return true;
  }

  setGroup(group: number, notify = true) {
    this.group = group;
    if (notify) {
      this.tournament.notifyChange();
    }
  }

  activate(active: boolean, notify = true) {
    this.active = active;
    if (notify) {
      this.tournament.notifyChange();
    }
  }

  delete() {
    let success = false;
    if (!this.inAnyRound()) {
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

class ParticipatingPlayerImpl extends PerformanceImpl implements Mutable<ParticipatingPlayer> {
  partners: Map<string, number[]> = new Map();
  opponents: Map<string, number[]> = new Map();

  matchCount: number = 0;
  pauseCount: number = 0;
  lastPause: number = -1;

  private player: PlayerImpl;

  constructor(
    private tournament: TournamentImpl,
    readonly id: PlayerId,
  ) {
    super();
    this.player = this.tournament.playerMap.get(this.id)!;
  }

  get name() {
    return this.player.name;
  }

  get group() {
    return this.player.group;
  }

  get active(): boolean {
    return this.player.active;
  }

  inAnyRound(): boolean {
    return this.player.inAnyRound();
  }

  canRenameTo(name: string): boolean {
    return this.player.canRenameTo(name);
  }

  rename(name: string): boolean {
    return this.player.rename(name);
  }

  setGroup(group: number, notify?: boolean): void {
    this.player.setGroup(group, notify);
  }

  activate(active: boolean, notify?: boolean): void {
    this.player.activate(active, notify);
  }

  delete(): boolean {
    return this.player.delete();
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

  deepCopy(): ParticipatingPlayerImpl {
    const copy = new ParticipatingPlayerImpl(this.tournament, this.id);

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
    readonly player1: ParticipatingPlayerImpl,
    readonly player2: ParticipatingPlayerImpl,
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
  paused: ParticipatingPlayerImpl[];
  inactive: ParticipatingPlayerImpl[];
  playerMap: Map<PlayerId, ParticipatingPlayerImpl>;

  constructor(
    readonly tournament: TournamentImpl,
    readonly index: number,
    participating: ParticipatingPlayerImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[],
  ) {
    this.playerMap = new Map(participating.map((p) => [p.id, p.deepCopy()]));
    const getOrCreate = (id: PlayerId) => {
      let result = this.playerMap.get(id);
      if (!result) {
        result = new ParticipatingPlayerImpl(this.tournament, id);
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

  standings(groups?: number[]) {
    const players = Array.from(this.playerMap.values())
      .filter((player) => !groups || groups.length === 0 || groups.includes(player.group))
      .filter((player) => player.wins + player.draws + player.losses > 0)
      .toSorted((p, q) => {
        const result = p.compare(q);
        if (result === 0) {
          return p.name < q.name ? -1 : p.name > q.name ? 1 : 0;
        }
        return result;
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
}

type CompactPlayer = [PlayerId, string, number, boolean]; // id, name, group, active

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
  playerMap: Map<PlayerId, PlayerImpl> = new Map();
  rounds: RoundImpl[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      const compact = JSON.parse(serialized) as CompactTournament;
      compact[0].forEach((cp) => {
        const player = new PlayerImpl(
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

  addPlayers(names: string[], group: number = 0) {
    const added: string[] = [];
    const duplicates: string[] = [];

    names.forEach((name) => {
      const existingNames = new Set(this.players().map((p) => p.name));
      if (!existingNames.has(name)) {
        const id = crypto.randomUUID();
        const player = new PlayerImpl(this, id, name, group, true);
        this.playerMap.set(player.id, player);
        added.push(name);
      } else {
        duplicates.push(name);
      }
    });
    this.notifyChange();
    return { added, duplicates };
  }

  activateAll(active: boolean) {
    this.players().forEach((player) => {
      player.active = active;
    });
    this.notifyChange();
  }

  activateGroup(group: number, active: boolean) {
    this.players(group).forEach((player) => {
      player.active = active;
    });
    this.notifyChange();
  }

  activatePlayers(players: Player[], active: boolean): number {
    let count = 0;
    players.forEach((player) => {
      // Only count players that can be activated/deactivated
      if (active) {
        if (!player.active) {
          (player as PlayerImpl).activate(active, false);
          count++;
        }
      } else {
        if (player.active) {
          (player as PlayerImpl).activate(active, false);
          count++;
        }
      }
    });
    if (count > 0) {
      this.notifyChange();
    }
    return count;
  }

  movePlayers(players: Player[], group: number): number {
    players.forEach((player) => {
      (player as PlayerImpl).setGroup(group, false);
    });
    if (players.length > 0) {
      this.notifyChange();
    }
    return players.length;
  }

  deletePlayers(players: Player[]): number {
    let count = 0;
    players.forEach((player) => {
      if (!player.inAnyRound()) {
        if (this.playerMap.delete(player.id)) {
          count++;
        }
      }
    });
    if (count > 0) {
      this.notifyChange();
    }
    return count;
  }

  private getPlayersForNextRound(shouldShuffle: boolean = false): {
    participating: ParticipatingPlayerImpl[];
    active: ParticipatingPlayerImpl[];
    inactive: PlayerId[];
  } {
    // Determine participating players for this round:
    // Any players participating in the previous round (along with their stats) plus
    // active players not yet in any round!
    const participating: ParticipatingPlayerImpl[] = [];
    const previousRound = this.rounds[this.rounds.length - 1];
    if (previousRound) {
      participating.push(...Array.from(previousRound.playerMap.values()));
    }
    const newPlayers = this.players()
      .filter((p) => {
        return p.active && !p.inAnyRound();
      })
      .map((p) => new ParticipatingPlayerImpl(this, p.id));
    
    participating.push(
      ...(shouldShuffle ? shuffle(newPlayers) : newPlayers)
    );

    const [active, inactive] = participating.reduce(
      (acc: [ParticipatingPlayerImpl[], PlayerId[]], player) => {
        const tournamentPlayer = this.playerMap.get(player.id)!;
        if (tournamentPlayer.active) {
          acc[0].push(player);
        } else {
          acc[1].push(player.id);
        }
        return acc;
      },
      [[], []],
    );

    return { participating, active, inactive };
  }

  getNextRoundInfo(spec?: MatchingSpec, maxMatches?: number): RoundInfo {
    const { active } = this.getPlayersForNextRound(false); // no shuffle needed for info
    const effectiveSpec = spec || Americano;
    
    const { competing, groupDistribution } = partitionPlayers(active, effectiveSpec, maxMatches);
    
    return {
      matchCount: Math.floor(competing.length / 4),
      activePlayerCount: active.length,
      groupDistribution,
      balancingEnabled: effectiveSpec.balanceGroups || false,
    };
  }

  createRound(spec?: MatchingSpec, maxMatches?: number): RoundImpl {
    const { participating, active, inactive } = this.getPlayersForNextRound(true); // shuffle new players
    const [matched, paused] = matching(active, spec || Americano, maxMatches);
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

  private groupToLabel(groupNumber: number): string {
    return String.fromCharCode(65 + groupNumber); // 0→"A", 1→"B", etc.
  }

  exportStandingsText(roundIndex: number, groups?: number[]): string {
    // Validate roundIndex
    const targetRoundIndex = Math.max(0, Math.min(roundIndex, this.rounds.length - 1));
    const targetRound = this.rounds[targetRoundIndex];

    if (!targetRound) {
      return "No standings available";
    }

    let result = "";
    
    // Header
    result += `STANDINGS - Round ${targetRoundIndex + 1} of ${this.rounds.length}\n`;
    result += `Export Date: ${new Date().toISOString()}\n`;
    result += "\n";

    // Determine which standings to show
    if (groups && groups.length === 1) {
      // Single group selected - show only that group
      const groupStandings = targetRound.standings(groups);
      if (groupStandings.length === 0) {
        result += `GROUP ${this.groupToLabel(groups[0])} STANDINGS\n`;
        result += "-".repeat(`GROUP ${this.groupToLabel(groups[0])} STANDINGS`.length) + "\n";
        result += "No standings available\n";
      } else {
        result += `GROUP ${this.groupToLabel(groups[0])} STANDINGS\n`;
        result += "-".repeat(`GROUP ${this.groupToLabel(groups[0])} STANDINGS`.length) + "\n";
        result += this.formatStandingsTable(groupStandings);
      }
    } else {
      // No filter or multiple groups - show overall standings
      const selectedGroups = groups && groups.length > 0 ? groups : undefined;
      const standings = targetRound.standings(selectedGroups);
      
      if (standings.length === 0) {
        result += "OVERALL STANDINGS\n";
        result += "-".repeat("OVERALL STANDINGS".length) + "\n";
        result += "No standings available\n";
      } else {
        result += "OVERALL STANDINGS\n";
        result += "-".repeat("OVERALL STANDINGS".length) + "\n";
        result += this.formatStandingsTable(standings);
      }
    }

    return result;
  }

  private formatStandingsTable(standings: { rank: number; player: ParticipatingPlayer }[]): string {
    if (standings.length === 0) {
      return "";
    }

    let result = "";
    const totalRounds = this.rounds.length;

    // Calculate dynamic padding based on data
    const maxRank = standings.length;
    const rankPad = String(maxRank).length;
    const maxNameLength = Math.max(...standings.map(p => p.player.name.length));
    const namePad = Math.max(maxNameLength, 10); // At least 10 chars
    const maxPlusMinus = Math.max(...standings.map(p => Math.abs(p.player.plusMinus)));
    const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign
    const maxPointsFor = Math.max(...standings.map(p => p.player.pointsFor));
    const maxPointsAgainst = Math.max(...standings.map(p => p.player.pointsAgainst));
    const pointsPad = Math.max(String(maxPointsFor).length, String(maxPointsAgainst).length);

    standings.forEach((ranked) => {
      const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
      const reliabilityPercent = totalRounds > 0 ? Math.round((participationCount / totalRounds) * 100) : 0;
      const winRatioPercent = Math.round(ranked.player.winRatio * 100);
      const plusMinus = ranked.player.plusMinus >= 0 ? `+${ranked.player.plusMinus}` : `${ranked.player.plusMinus}`;
      const wdl = `(${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses})`;
      const points = `(${String(ranked.player.pointsFor).padStart(pointsPad, " ")}-${String(ranked.player.pointsAgainst).padStart(pointsPad, " ")})`;
      result += `${String(ranked.rank).padStart(rankPad, " ")}. ${ranked.player.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")} ${points} ${String(reliabilityPercent).padStart(3, " ")}%\n`;
    });

    return result;
  }

  exportBackup(settings: Settings): string {
    const backup: TournamentBackup = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: {
        courts: settings.courts,
        matchingSpec: settings.matchingSpec,
      },
      players: this.players()
        .map(p => ({
          name: p.name,
          group: p.group,
          active: p.active,
        }))
        .sort((a, b) => {
          if (a.group !== b.group) return a.group - b.group;
          return a.name.localeCompare(b.name);
        }),
      rounds: this.rounds.map(round => ({
        matches: round.matches.map(match => ({
          teamA: [match.teamA.player1.name, match.teamA.player2.name],
          teamB: [match.teamB.player1.name, match.teamB.player2.name],
          score: match.score,
        })),
        paused: round.paused.map(p => p.name),
        inactive: round.inactive.map(p => p.name),
      })),
    };

    return JSON.stringify(backup, null, 2);
  }
}
