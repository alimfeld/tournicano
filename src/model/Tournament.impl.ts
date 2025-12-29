import { Mutable } from "./Mutable";
import {
  Match,
  Performance,
  PlayerStats,
  PlayerId,
  TournamentPlayer,
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

// Export data structures
interface RankedPlayerExportData {
  rank: number;
  name: string;
  group: string;
  wins: number;
  draws: number;
  losses: number;
  winRatio: number;
  plusMinus: number;
  pointsFor: number;
  pointsAgainst: number;
  matchCount: number;
  pauseCount: number;
  reliability: number;
}

interface TournamentExportData {
  version: number;
  metadata: {
    exportDate: string;
    roundCount: number;
    playerCount: number;
    groups: string[];
  };
  players: {
    name: string;
    group: string;
  }[];
  rounds: {
    roundNumber: number;
    matches: {
      teamA: { player1: string; player2: string };
      teamB: { player1: string; player2: string };
      score?: Score;
    }[];
    paused: string[];
  }[];
  standings: {
    overall: RankedPlayerExportData[];
    byGroup: { [groupLabel: string]: RankedPlayerExportData[] };
  };
}

export const tournamentFactory: TournamentFactory = {
  create(serialized?: string) {
    return new TournamentImpl(serialized);
  },
};

class TournamentPlayerImpl implements Mutable<TournamentPlayer> {
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

  rename(name: string) {
    const existingNames = new Set(
      this.tournament.players().map((p) => p.name),
    );
    if (!existingNames.has(name)) {
      this.name = name;
      this.tournament.notifyChange();
      return true;
    }
    return false;
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
  playerMap: Map<PlayerId, TournamentPlayerImpl> = new Map();
  rounds: RoundImpl[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      const compact = JSON.parse(serialized) as CompactTournament;
      compact[0].forEach((cp) => {
        const player = new TournamentPlayerImpl(
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
        const player = new TournamentPlayerImpl(this, id, name, group, true);
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

  activatePlayers(players: TournamentPlayer[], active: boolean): number {
    let count = 0;
    players.forEach((player) => {
      // Only count players that can be activated/deactivated
      if (active) {
        if (!player.active) {
          (player as TournamentPlayerImpl).activate(active, false);
          count++;
        }
      } else {
        if (player.active) {
          (player as TournamentPlayerImpl).activate(active, false);
          count++;
        }
      }
    });
    if (count > 0) {
      this.notifyChange();
    }
    return count;
  }

  movePlayers(players: TournamentPlayer[], group: number): number {
    players.forEach((player) => {
      (player as TournamentPlayerImpl).setGroup(group, false);
    });
    if (players.length > 0) {
      this.notifyChange();
    }
    return players.length;
  }

  deletePlayers(players: TournamentPlayer[]): number {
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
    participating: PlayerStatsImpl[];
    active: PlayerStatsImpl[];
    inactive: PlayerId[];
  } {
    // Determine participating players for this round:
    // Any players participating in the previous round (along with their stats) plus
    // active players not yet in any round!
    const participating: PlayerStatsImpl[] = [];
    const previousRound = this.rounds[this.rounds.length - 1];
    if (previousRound) {
      participating.push(...Array.from(previousRound.playerMap.values()));
    }
    const newPlayers = this.players()
      .filter((p) => {
        return p.active && !p.inAnyRound();
      })
      .map((p) => new PlayerStatsImpl(this, p.id));
    
    participating.push(
      ...(shouldShuffle ? shuffle(newPlayers) : newPlayers)
    );

    const [active, inactive] = participating.reduce(
      (acc: [PlayerStatsImpl[], PlayerId[]], player) => {
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

  private exportData(roundIndex?: number): TournamentExportData {
    // Determine which round to export (default to latest)
    const targetRoundIndex = roundIndex !== undefined
      ? Math.max(0, Math.min(roundIndex, this.rounds.length - 1))
      : this.rounds.length - 1;

    const targetRound = this.rounds[targetRoundIndex];

    if (!targetRound) {
      // No rounds yet - still build players list
      const players = Array.from(this.playerMap.values())
        .map(player => ({
          name: player.name,
          group: this.groupToLabel(player.group),
        }))
        .sort((a, b) => {
          // Sort by group first, then by name
          if (a.group !== b.group) {
            return a.group.localeCompare(b.group);
          }
          return a.name.localeCompare(b.name);
        });

      return {
        version: 1,
        metadata: {
          exportDate: new Date().toISOString(),
          roundCount: 0,
          playerCount: this.playerMap.size,
          groups: this.groups.map(g => this.groupToLabel(g)),
        },
        players,
        rounds: [],
        standings: {
          overall: [],
          byGroup: {},
        },
      };
    }

    // Build players list - only include players who participated in rounds
    const players = Array.from(targetRound.playerMap.values())
      .map(player => ({
        name: player.name,
        group: this.groupToLabel(player.group),
      }))
      .sort((a, b) => {
        // Sort by group first, then by name
        if (a.group !== b.group) {
          return a.group.localeCompare(b.group);
        }
        return a.name.localeCompare(b.name);
      });

    // Build rounds data
    const rounds = this.rounds.slice(0, targetRoundIndex + 1).map((round, idx) => ({
      roundNumber: idx + 1,
      matches: round.matches.map((match) => ({
        teamA: {
          player1: match.teamA.player1.name,
          player2: match.teamA.player2.name,
        },
        teamB: {
          player1: match.teamB.player1.name,
          player2: match.teamB.player2.name,
        },
        score: match.score,
      })),
      paused: round.paused.map((p) => p.name),
    }));

    // Build overall standings
    const totalRounds = targetRoundIndex + 1;
    const overallStandings = targetRound.standings().map((ranked) => {
      const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
      const reliability = totalRounds > 0 ? participationCount / totalRounds : 0;
      return {
        rank: ranked.rank,
        name: ranked.player.name,
        group: this.groupToLabel(ranked.player.group),
        wins: ranked.player.wins,
        draws: ranked.player.draws,
        losses: ranked.player.losses,
        winRatio: ranked.player.winRatio,
        plusMinus: ranked.player.plusMinus,
        pointsFor: ranked.player.pointsFor,
        pointsAgainst: ranked.player.pointsAgainst,
        matchCount: ranked.player.matchCount,
        pauseCount: ranked.player.pauseCount,
        reliability,
      };
    });

    // Get unique groups from participating players only
    const participatingGroups = [...new Set(Array.from(targetRound.playerMap.values()).map(p => p.group))].sort();

    // Build per-group standings (only if multiple participating groups exist)
    const byGroup: { [groupLabel: string]: RankedPlayerExportData[] } = {};

    // Collect all group standings first (avoid calling standings() twice)
    const groupStandingsMap = new Map<number, any[]>();
    participatingGroups.forEach((groupNumber) => {
      const groupStandings = targetRound.standings([groupNumber]);
      if (groupStandings.length > 0) {
        groupStandingsMap.set(groupNumber, groupStandings);
      }
    });

    // Only populate byGroup if there are multiple participating groups
    const hasMultipleGroups = groupStandingsMap.size > 1;

    if (hasMultipleGroups) {
      groupStandingsMap.forEach((standings, groupNumber) => {
        const groupLabel = this.groupToLabel(groupNumber);
        const groupStandings = standings.map((ranked) => {
          const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
          const reliability = totalRounds > 0 ? participationCount / totalRounds : 0;
          return {
            rank: ranked.rank,
            name: ranked.player.name,
            group: groupLabel,
            wins: ranked.player.wins,
            draws: ranked.player.draws,
            losses: ranked.player.losses,
            winRatio: ranked.player.winRatio,
            plusMinus: ranked.player.plusMinus,
            pointsFor: ranked.player.pointsFor,
            pointsAgainst: ranked.player.pointsAgainst,
            matchCount: ranked.player.matchCount,
            pauseCount: ranked.player.pauseCount,
            reliability,
          };
        });
        byGroup[groupLabel] = groupStandings;
      });
    }

    return {
      version: 1,
      metadata: {
        exportDate: new Date().toISOString(),
        roundCount: targetRoundIndex + 1,
        playerCount: targetRound.playerMap.size,
        groups: participatingGroups.map(g => this.groupToLabel(g)),
      },
      players,
      rounds,
      standings: {
        overall: overallStandings,
        byGroup,
      },
    };
  }

  exportJSON(roundIndex?: number): string {
    const data = this.exportData(roundIndex);
    return JSON.stringify(data, null, 2);
  }

  exportText(roundIndex?: number): string {
    const data = this.exportData(roundIndex);
    let result = "";

    // Header
    result += "TOURNAMENT EXPORT\n";
    result += "=================\n";
    result += `Export Date: ${data.metadata.exportDate}\n`;
    result += `Rounds Completed: ${data.metadata.roundCount}\n`;
    result += `Players: ${data.metadata.playerCount}\n`;
    if (data.metadata.groups.length > 0) {
      result += `Groups: ${data.metadata.groups.join(", ")}\n`;
    }
    result += "\n";

    // Players
    if (data.players.length > 0) {
      result += "PLAYERS\n";
      result += "-------\n";

      // Check if there are multiple groups
      const hasMultipleGroups = data.metadata.groups.length > 1;

      if (hasMultipleGroups) {
        // Group players by their group letter
        const playersByGroup: { [group: string]: string[] } = {};
        data.players.forEach(player => {
          if (!playersByGroup[player.group]) {
            playersByGroup[player.group] = [];
          }
          playersByGroup[player.group].push(player.name);
        });

        // Output each group
        Object.entries(playersByGroup).sort((a, b) => a[0].localeCompare(b[0])).forEach(([group, names]) => {
          result += `Group ${group}: ${names.join(", ")}\n`;
        });
      } else {
        // Single group - just list all names
        result += data.players.map(p => p.name).join(", ") + "\n";
      }
      result += "\n";
    }

    // Rounds
    data.rounds.forEach((round) => {
      result += `ROUND ${round.roundNumber}\n`;
      result += "-".repeat(`ROUND ${round.roundNumber}`.length) + "\n";

      if (round.matches.length > 0) {
        // Calculate dynamic padding for this round
        const matchCountPad = String(round.matches.length).length;

        // Find longest player names in this round
        let maxNameLength = 0;
        round.matches.forEach((match) => {
          maxNameLength = Math.max(
            maxNameLength,
            match.teamA.player1.length,
            match.teamA.player2.length,
            match.teamB.player1.length,
            match.teamB.player2.length
          );
        });
        const namePad = Math.max(maxNameLength, 8); // At least 8 chars

        round.matches.forEach((match, idx) => {
          const matchNum = String(idx + 1).padStart(matchCountPad, " ");
          const p1 = match.teamA.player1.padEnd(namePad, " ");
          const p2 = match.teamA.player2.padEnd(namePad, " ");
          const p3 = match.teamB.player1.padEnd(namePad, " ");
          const p4 = match.teamB.player2.padEnd(namePad, " ");

          result += `Match ${matchNum}: ${p1} & ${p2} vs. ${p3} & ${p4}`;
          if (match.score) {
            result += ` - ${match.score[0]}:${match.score[1]}`;
          }
          result += "\n";
        });
      } else {
        result += "No matches\n";
      }

      if (round.paused.length > 0) {
        result += `Paused: ${round.paused.join(", ")}\n`;
      } else {
        result += "Paused: None\n";
      }
      result += "\n";
    });

    // Overall Standings
    if (data.standings.overall.length > 0) {
      result += `OVERALL STANDINGS (after Round ${data.metadata.roundCount})\n`;
      result += "-".repeat(`OVERALL STANDINGS (after Round ${data.metadata.roundCount})`.length) + "\n";

      // Calculate dynamic padding based on data
      const maxRank = data.standings.overall.length;
      const rankPad = String(maxRank).length;
      const maxNameLength = Math.max(...data.standings.overall.map(p => p.name.length));
      const namePad = Math.max(maxNameLength, 10); // At least 10 chars
      const maxPlusMinus = Math.max(...data.standings.overall.map(p => Math.abs(p.plusMinus)));
      const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign
      const maxPointsFor = Math.max(...data.standings.overall.map(p => p.pointsFor));
      const maxPointsAgainst = Math.max(...data.standings.overall.map(p => p.pointsAgainst));
      const pointsPad = Math.max(String(maxPointsFor).length, String(maxPointsAgainst).length);

      data.standings.overall.forEach((ranked) => {
        const reliabilityPercent = Math.round(ranked.reliability * 100);
        const winRatioPercent = Math.round(ranked.winRatio * 100);
        const plusMinus = ranked.plusMinus >= 0 ? `+${ranked.plusMinus}` : `${ranked.plusMinus}`;
        const wdl = `(${ranked.wins}-${ranked.draws}-${ranked.losses})`;
        const points = `(${String(ranked.pointsFor).padStart(pointsPad, " ")}-${String(ranked.pointsAgainst).padStart(pointsPad, " ")})`;
        result += `${String(ranked.rank).padStart(rankPad, " ")}. ${ranked.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")} ${points} ${String(reliabilityPercent).padStart(3, " ")}%\n`;
      });
      result += "\n";
    }

    // Per-Group Standings
    Object.entries(data.standings.byGroup).forEach(([groupLabel, standings]) => {
      if (standings.length > 0) {
        result += `GROUP ${groupLabel} STANDINGS (after Round ${data.metadata.roundCount})\n`;
        result += "-".repeat(`GROUP ${groupLabel} STANDINGS (after Round ${data.metadata.roundCount})`.length) + "\n";

        // Calculate dynamic padding for this group
        const maxRank = standings.length;
        const rankPad = String(maxRank).length;
        const maxNameLength = Math.max(...standings.map(p => p.name.length));
        const namePad = Math.max(maxNameLength, 10); // At least 10 chars
        const maxPlusMinus = Math.max(...standings.map(p => Math.abs(p.plusMinus)));
        const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign
        const maxPointsFor = Math.max(...standings.map(p => p.pointsFor));
        const maxPointsAgainst = Math.max(...standings.map(p => p.pointsAgainst));
        const pointsPad = Math.max(String(maxPointsFor).length, String(maxPointsAgainst).length);

        standings.forEach((ranked) => {
          const reliabilityPercent = Math.round(ranked.reliability * 100);
          const winRatioPercent = Math.round(ranked.winRatio * 100);
          const plusMinus = ranked.plusMinus >= 0 ? `+${ranked.plusMinus}` : `${ranked.plusMinus}`;
          const wdl = `(${ranked.wins}-${ranked.draws}-${ranked.losses})`;
          const points = `(${String(ranked.pointsFor).padStart(pointsPad, " ")}-${String(ranked.pointsAgainst).padStart(pointsPad, " ")})`;
          result += `${String(ranked.rank).padStart(rankPad, " ")}. ${ranked.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")} ${points} ${String(reliabilityPercent).padStart(3, " ")}%\n`;
        });
        result += "\n";
      }
    });

    return result;
  }
}
