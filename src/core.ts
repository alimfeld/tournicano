import {
  iter,
  weight as maximumMatching,
} from "@graph-algorithm/maximum-matching";

export type Team = [string, string];
export type Score = [number, number];
export type Match = [Team, Team, Score | null];

export interface PlayerId {
  readonly id: string
}

export interface PlayerProps {
  readonly name: string;
  readonly active: boolean;
}

export interface EnrolledPlayer extends PlayerId, PlayerProps { }

export interface PlayerAssignment {
  readonly matches: number;
  readonly pauses: number;
  partners: Map<string, number>;
  opponents: Map<string, number>;
}

export interface PlayerResult {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly plus: number; // total points scored
  readonly minus: number; // total points conceded
}

export interface PlayerStats extends PlayerAssignment, PlayerResult { }

export interface Player extends EnrolledPlayer, PlayerStats { }

export interface Round {
  readonly inactive: string[];
  readonly paused: string[];
  readonly matches: Match[];
}

export class Tournament {
  private players: Map<string, PlayerImpl> = new Map();
  rounds: Round[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      try {
        const { players, rounds } = JSON.parse(serialized);
        players.forEach((player: EnrolledPlayer) => this.players.set(player.id, new PlayerImpl(player.id, player.name, player.active)))
        rounds.forEach((round: Round) => this.addRound(round))
      } catch (error) {
        console.error(error);
      }
    }
  }

  getPlayers(): Player[] {
    return Array.from(this.players, ([_, player]) => player);
  }

  getPlayerMap(): Map<string, Player> {
    return this.players;
  }

  serialize(): string {
    return JSON.stringify({
      players: this.getPlayers().map((player) => {
        return {
          id: player.id,
          name: player.name,
          active: player.active,
        } as EnrolledPlayer
      }),
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
    const player = this.players.get(id)!
    if (player.matches + player.pauses == 0) {
      return this.players.delete(id);
    }
    return false;
  }

  createRound(matchCount: number): number {
    const [competing, paused, inactive] = this.partitionPlayers(matchCount);
    const teams = this.teamUp(competing);
    const matches = this.pairUp(teams);
    const round = { inactive, paused, matches };
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
      let line = `${this.players.get(p0)!.name} & ${this.players.get(q0)!.name} vs. ${this.players.get(p1)!.name
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
        `${player.name} R${player.matches}/${player.matches + player.pauses
        }|W${player.wins}|D${player.draws}|L${player.losses}|Δ${player.plus - player.minus
        }`,
      );
    });
  }

  updateScore(r: number, m: number, score: Score | null) {
    const match = this.rounds[r]!.matches[m];
    this.updateStatsFromMatch(match, false)
    match[2] = score;
    this.updateStatsFromMatch(match)
  }

  private partitionPlayers(
    matchCount: number,
  ): [competing: string[], paused: string[], inactive: string[]] {
    let active: PlayerImpl[] = []
    let inactive: PlayerImpl[] = []
    this.players.forEach(player => {
      player.active ? active.push(player) : inactive.push(player)
    })
    let competitorCount = matchCount * 4;
    if (active.length < competitorCount) {
      competitorCount = active.length - (active.length % 4);
    }
    if (active.length > competitorCount) {
      active.sort((p, q) => {
        // simple sorting based on matches only (i.e. not considering pauses)
        return p.matches - q.matches;
      });
    }
    return [
      active.slice(0, competitorCount).map(p => p.id),
      active.slice(competitorCount).map(p => p.id),
      inactive.map(p => p.id),
    ];
  }

  private teamUp(ids: string[]): Team[] {
    const edges = [];
    for (let i = 0; i < ids.length - 1; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const p = ids[i];
        const q = ids[j];
        edges.push([
          i,
          j,
          // ensure positive weight
          this.rounds.length - this.players.get(p)!.partnerCount(q),
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map((
      edge: [number, number],
    ) => [ids[edge[0]], ids[edge[1]]]);
  }

  private pairUp(teams: Team[]): Match[] {
    const edges = [];
    for (let i = 0; i < teams.length - 1; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        let oppenentSum = 0;
        teams[i].forEach((p) => {
          teams[j].forEach((q) => {
            oppenentSum += this.players.get(p)!.opponentCount(q);
          });
        });
        edges.push([
          i,
          j,
          // ensure positive weight
          4 * this.rounds.length - oppenentSum,
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map((
      edge: [number, number],
    ) => [teams[edge[0]], teams[edge[1]], null]);
  }

  private addRound(round: Round) {
    this.updateStatsFromRound(round);
    this.rounds.push(round);
  }

  private updateStatsFromRound(round: Round, positive: boolean = true) {
    const step = positive ? 1 : -1;
    round.paused.forEach((p) => this.players.get(p)!.pauses += step);
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
      this.updateStatsFromMatch(match, positive)
    });
  }

  private updateStatsFromMatch(match: Match, positive: boolean = true) {
    const score = match[2];
    match[0].forEach((p) => {
      const player = this.players.get(p)!
      if (score) {
        player.updateScore(score, positive);
      }
    });
    match[1].forEach((p) => {
      const player = this.players.get(p)!
      if (score) {
        player.updateScore([score[1], score[0]], positive);
      }
    });
  }
}

class PlayerImpl implements Player {
  constructor(readonly id: string, public name: string, public active: boolean) { }

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

  // updated from scores
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  plus: number = 0; // total points scored
  minus: number = 0; // total points conceded

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
