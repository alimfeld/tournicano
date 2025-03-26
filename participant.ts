export interface Participant {
  name(): string;
  label(key: string): string | undefined;
}

export interface Player extends Participant {
}

export interface Team extends Participant {
  players(): Player[];
}

export abstract class SimpleParticipant implements Participant {
  private _name: string;
  private _labels: Map<string, string>;

  constructor(name: string, labels: Map<string, string> = new Map([])) {
    this._name = name;
    this._labels = new Map([...labels.entries()]);
  }

  name() {
    return this._name;
  }

  label(key: string) {
    return this._labels.get(key);
  }
}

export class SimplePlayer extends SimpleParticipant implements Player {
}

export class SimpleTeam extends SimpleParticipant implements Team {
  private _players: SimplePlayer[];

  constructor(
    name: string,
    players: SimplePlayer[],
    labels: Map<string, string> = new Map([]),
  ) {
    super(name, labels);
    this._players = players;
  }

  players() {
    return this._players;
  }
}
