import {
  iter,
  weight as maximumMatching,
} from "@graph-algorithm/maximum-matching";

type Team = [number, number];
type Match = [Team, Team];
type Score = [number, number];

export interface Player {
  readonly name: string;
  readonly active: boolean;
}

export interface PlayerStats {
  readonly matches: number;
  readonly pauses: number;
  readonly partners: number[];
  readonly opponents: number[];
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly plus: number; // total points scored
  readonly minus: number; // total points conceded
}

export interface Round {
  readonly inactive: number[];
  readonly paused: number[];
  readonly matches: Match[];
}

export class Tournament {
  players: Player[] = [];
  rounds: Round[] = [];
  scores: Score[][] = [];
  private stats: DefaultPlayerStats[] = [];

  enrollPlayers(names: string[]) {
    names.forEach((name) => {
      this.players.push({ name, active: true });
      this.stats.push(new DefaultPlayerStats());
    });
  }

  updatePlayer(p: number, props: Player) {
    this.players[p] = { ...props };
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
    const round = this.getRound(r);
    const scores = this.scores[r];
    round.matches.forEach((match, m) => {
      const p0 = match[0][0];
      const q0 = match[0][1];
      const p1 = match[1][0];
      const q1 = match[1][1];
      let line = `${this.players[p0].name} & ${this.players[q0].name} vs. ${
        this.players[p1].name
      } & ${this.players[q1].name}`;
      if (scores) {
        line += ` - ${scores[m][0]} : ${scores[m][1]}`;
      }
      console.log(line);
    });
  }

  printStats() {
    this.stats.forEach((stats, p) => {
      console.log(
        `${this.players[p].name} R${stats.matches}/${
          stats.matches + stats.pauses
        }|W${stats.wins}|D${stats.draws}|L${stats.losses}|Δ${
          stats.plus - stats.minus
        }`,
      );
    });
  }

  submitScores(r: number, scores: Score[]) {
    const round = this.getRound(r);
    if (round.matches.length != scores.length) {
      throw Error("Scores mismatch");
    }
    round.matches.forEach((match, m) => {
      const score = scores[m];
      match[0].forEach((p) => {
        this.stats[p].submitScore(score[0], score[1]);
      });
      match[1].forEach((p) => {
        this.stats[p].submitScore(score[1], score[0]);
      });
    });
    this.scores.push(scores);
  }

  getStats(p: number): PlayerStats {
    return this.stats[p];
  }

  getAllStats(): PlayerStats[] {
    return this.stats;
  }

  private getRound(r: number): Round {
    const round = this.rounds[r];
    if (!round) {
      throw Error("No such round");
    }
    return round;
  }

  private partitionPlayers(
    matchCount: number,
  ): [competing: number[], paused: number[], inactive: number[]] {
    const [active, inactive] = this.players.reduce(
      (acc: [number[], number[]], player, p) => {
        acc[player.active ? 0 : 1].push(p);
        return acc;
      },
      [[], []],
    );
    let competitorCount = matchCount * 4;
    if (active.length < competitorCount) {
      competitorCount = active.length - (active.length % 4);
    }
    if (active.length == competitorCount) {
      return [
        active,
        [],
        inactive,
      ];
    }
    active.sort((p, q) => {
      // simple sorting based on matches only (i.e. not considering pauses)
      return this.stats[p].matches - this.stats[q].matches;
    });
    return [
      active.slice(0, competitorCount),
      active.slice(competitorCount),
      inactive,
    ];
  }

  private teamUp(players: number[]): Team[] {
    const edges = [];
    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p = players[i];
        const q = players[j];
        edges.push([
          i,
          j,
          // ensure positive weight
          this.rounds.length - this.stats[p].partnerCount(q),
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map((
      edge: [number, number],
    ) => [players[edge[0]], players[edge[1]]]);
  }

  private pairUp(teams: Team[]): Match[] {
    const edges = [];
    for (let i = 0; i < teams.length - 1; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        let oppenentSum = 0;
        teams[i].forEach((p) => {
          teams[j].forEach((q) => {
            oppenentSum += this.stats[p].opponentCount(q);
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
    ) => [teams[edge[0]], teams[edge[1]]]);
  }

  private submitRound(round: Round) {
    round.paused.forEach((p) => this.stats[p].pauses++);
    round.matches.forEach((match) => {
      match.forEach((t) => {
        const p = t[0];
        const q = t[1];
        this.stats[p].matches++;
        this.stats[p].incPartner(q);
        this.stats[q].matches++;
        this.stats[q].incPartner(p);
      });
      match[0].forEach((p) => {
        match[1].forEach((q) => {
          this.stats[p].incOppenent(q);
          this.stats[q].incOppenent(p);
        });
      });
    });
    this.rounds.push(round);
  }
}

class DefaultPlayerStats implements PlayerStats {
  // updated from rounds
  matches: number = 0;
  pauses: number = 0;
  partners: number[] = [];
  opponents: number[] = [];

  partnerCount(q: number) {
    return this.partners[q] || 0;
  }

  incPartner(q: number) {
    this.partners[q] = this.partnerCount(q) + 1;
  }

  opponentCount(q: number) {
    return this.opponents[q] || 0;
  }

  incOppenent(q: number) {
    this.opponents[q] = this.opponentCount(q) + 1;
  }

  // updated from scores
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  plus: number = 0; // total points scored
  minus: number = 0; // total points conceded

  submitScore(plus: number, minus: number) {
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
}
