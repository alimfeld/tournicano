import {
  iter,
  weight as maximumMatching,
} from "@graph-algorithm/maximum-matching";

function assert(condition: boolean, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export class Player {
  id = crypto.randomUUID();
  name: string;

  matches = 0;
  wins = 0;
  losses = 0;
  draws = 0;
  points = 0;
  pointsAgainst = 0;

  playedWithCounts = new Map<string, number>();
  playedAgainstCounts = new Map<string, number>();

  constructor(name: string) {
    this.name = name;
  }

  playedWithCount(player: Player) {
    return this.playedWithCounts.get(player.id) || 0;
  }

  playedAgainstCount(player: Player) {
    return this.playedAgainstCounts.get(player.id) || 0;
  }

  playedAgainstSum(players: Player[]) {
    return players.reduce(
      (sum, player) => sum + this.playedAgainstCount(player),
      0,
    );
  }

  commitResult(
    points: number,
    pointsAgainst: number,
    partner: Player,
    opposingTeam: Team,
  ) {
    this.matches++;
    this.points += points;
    this.pointsAgainst += pointsAgainst;

    if (points > pointsAgainst) this.wins++;
    else if (points < pointsAgainst) this.losses++;
    else this.draws++;

    this.playedWithCounts.set(partner.id, this.playedWithCount(partner) + 1);
    opposingTeam.players.forEach((player) =>
      this.playedAgainstCounts.set(
        player.id,
        this.playedAgainstCount(player) + 1,
      )
    );
  }
}

export class Team {
  players;

  constructor(players: [Player, Player]) {
    this.players = players;
  }

  playedAgainstSum(team: Team) {
    return this.players.reduce(
      (sum, player) => sum + player.playedAgainstSum(team.players),
      0,
    );
  }

  commitResult(result: [number, number], opposingTeam: Team) {
    this.players.forEach((player, index) => {
      const partnerIndex = (index + 1) % 2;
      player.commitResult(
        result[index],
        result[partnerIndex],
        this.players[partnerIndex],
        opposingTeam,
      );
    });
  }
}

export class Match {
  teams;
  result: [number, number] | undefined;

  constructor(teams: [Team, Team]) {
    this.teams = teams;
  }

  commitResult(result: [number, number]) {
    this.result = result;
    this.teams.forEach((team, index) =>
      team.commitResult(result, this.teams[(index + 1) % 2])
    );
  }
}

export class Round {
  matches: Match[];

  constructor(matches: Match[]) {
    this.matches = matches;
  }

  commitResults(results: [number, number][]) {
    assert(results.length == this.matches.length);

    this.matches.forEach((match, index) => match.commitResult(results[index]));
  }
}

export class Tournament {
  players: Player[];
  matchesPerRound: number;
  completedRounds: Round[] = [];
  currentRound: Round | null = null;

  constructor(playerNames: string[], matchesPerRound: number) {
    this.players = playerNames.map((name) => new Player(name));
    this.matchesPerRound = matchesPerRound;
  }

  generateRound(): Round {
    const players = this.electPlayers();
    const teams = this.teamUp(players);
    const matches = this.pairUp(teams);
    const round = new Round(matches);
    this.currentRound = round;
    return round;
  }

  commitResults(results: [number, number][]) {
    assert(this.currentRound != null);

    this.currentRound.commitResults(results);

    this.completedRounds.push(this.currentRound);
    this.currentRound = null;
  }

  private electPlayers(): Player[] {
    const totalPlayerCount = this.players.length;
    let playersToElectCount = this.matchesPerRound * 4;
    if (totalPlayerCount < playersToElectCount) {
      playersToElectCount = totalPlayerCount - (totalPlayerCount % 4);
    }
    if (totalPlayerCount == playersToElectCount) {
      return this.players;
    }
    const electedPlayers = this.players.toSorted((a, b) =>
      a.matches - b.matches
    );
    return electedPlayers.slice(0, playersToElectCount);
  }

  private teamUp(players: Player[]): Team[] {
    const edges = [];
    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        edges.push([
          i,
          j,
          this.completedRounds.length - players[i].playedWithCount(players[j]),
        ]);
      }
    }
    const matching = maximumMatching(edges);
    return [...iter(matching)].map((edge: [number, number]) =>
      new Team([players[edge[0]], players[edge[1]]])
    );
  }

  private pairUp(teams: Team[]): Match[] {
    const edges = [];
    for (let i = 0; i < teams.length - 1; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        edges.push([
          i,
          j,
          4 * this.completedRounds.length - teams[i].playedAgainstSum(teams[j]),
        ]);
      }
    }
    const matching = maximumMatching(edges);

    return [...iter(matching)].map((edge: [number, number]) =>
      new Match([teams[edge[0]], teams[edge[1]]])
    );
  }
}
