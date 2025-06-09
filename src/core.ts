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
  readonly id: string
}

export interface PlayerStats {
  readonly matches: number;
  readonly pauses: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  partners: Map<string, number>;
  opponents: Map<string, number>;
  readonly plus: number; // total points scored
  readonly minus: number; // total points conceded
}

export interface CompetingPlayer extends EnrolledPlayer, PlayerStats {
  readonly matches: number;
  readonly pauses: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  partners: Map<string, number>;
  opponents: Map<string, number>;
  readonly plus: number; // total points scored
  readonly minus: number; // total points conceded
}

export interface Round {
  readonly inactive: string[];
  readonly paused: string[];
  readonly matches: Match[];
}

export class Tournament {
  private players: Map<string, Player> = new Map();
  rounds: Round[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      try {
        const { players, rounds } = JSON.parse(serialized);
        players.forEach((player: EnrolledPlayer) => this.players.set(player.id, new Player(player.id, player.name, player.active)))
        rounds.forEach((round: Round, r: number) => {
          this.submitRound(round);
          round.matches.forEach((match: Match, m: number) => {
            const score = match[2];
            match[2] = null; // clear serialized score to have statistics properly updated!
            this.updateScore(r, m, score)
          })
        })
      } catch (error) {
        console.error(error);
      }
    }
  }

  getPlayers(): CompetingPlayer[] {
    return Array.from(this.players, ([_, player]) => player);
  }

  getPlayerMap(): Map<string, CompetingPlayer> {
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

  enrollPlayers(names: string[]) {
    names.forEach((name) => {
      const id = crypto.randomUUID();
      const player = new Player(id, name, true);
      this.players.set(id, player);
    });
  }

  updatePlayer(id: string, props: PlayerProps) {
    this.players.get(id)!.update(props);
  }

  createRound(matchCount: number): number {
    const [competing, paused, inactive] = this.partitionPlayers(matchCount);
    const teams = this.teamUp(competing);
    const matches = this.pairUp(teams);
    const round = { inactive, paused, matches };
    this.submitRound(round);
    return this.rounds.length - 1;
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
    const oldScore = match[2];
    match[2] = score
    match[0].forEach((p) => {
      const player = this.players.get(p)!
      if (oldScore) {
        player.removeScore(oldScore[0], oldScore[1]);
      }
      if (score) {
        player.addScore(score[0], score[1]);
      }
    });
    match[1].forEach((p) => {
      const player = this.players.get(p)!
      if (oldScore) {
        player.removeScore(oldScore[1], oldScore[0]);
      }
      if (score) {
        player.addScore(score[1], score[0]);
      }
    });
  }

  private partitionPlayers(
    matchCount: number,
  ): [competing: string[], paused: string[], inactive: string[]] {
    let active: Player[] = []
    let inactive: Player[] = []
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

  private submitRound(round: Round) {
    round.paused.forEach((p) => this.players.get(p)!.pauses++);
    round.matches.forEach((match) => {
      [match[0], match[1]].forEach((t) => {
        const p = t[0];
        const q = t[1];
        this.players.get(p)!.matches++;
        this.players.get(p)!.incPartner(q);
        this.players.get(q)!.matches++;
        this.players.get(q)!.incPartner(p);
      });
      match[0].forEach((p) => {
        match[1].forEach((q) => {
          this.players.get(p)!.incOppenent(q);
          this.players.get(q)!.incOppenent(p);
        });
      });
    });
    this.rounds.push(round);
  }
}

class Player implements CompetingPlayer {
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

  incPartner(q: string) {
    this.partners.set(q, this.partnerCount(q) + 1);
  }

  opponentCount(q: string) {
    return this.opponents.get(q) || 0;
  }

  incOppenent(q: string) {
    this.opponents.set(q, this.opponentCount(q) + 1);
  }

  // updated from scores
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  plus: number = 0; // total points scored
  minus: number = 0; // total points conceded

  addScore(plus: number, minus: number) {
    if (plus > minus) {
      this.wins++;
    } else if (plus < minus) {
      this.losses++;
    } else {
      this.draws++;
    }
    this.plus += plus;
    this.minus += minus;
  }

  removeScore(plus: number, minus: number) {
    if (plus > minus) {
      this.wins--;
    } else if (plus < minus) {
      this.losses--;
    } else {
      this.draws--;
    }
    this.plus -= plus;
    this.minus -= minus;
  }
}
