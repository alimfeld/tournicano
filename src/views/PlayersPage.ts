import m from "mithril";
import "./PlayersPage.css";
import { NavView } from "./NavView.ts";
import { Page } from "../App.ts";
import { RegisteredPlayer, Tournament } from "../model/Tournament.ts";
import { GroupView } from "./GroupView.ts";

export interface PlayersAttrs {
  tournament: Tournament;
  nav: (page: Page) => void;
}

export const PlayersPage: m.Component<PlayersAttrs> = {
  view: ({ attrs: { tournament, nav } }) => {
    const registerPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const groups = input.value.split(/\n/);
      groups.forEach((group, i) => {
        const line = group.trim();
        if (line) {
          console.log(line);
          const names = line.trim().split(/\s+/);
          tournament.registerPlayers(names, i);
        }
      });
      input.value = "";
    };
    const [active, total] = tournament.players.values().reduce(
      (acc, player) => {
        if (player.active) {
          acc[0]++;
        }
        acc[1]++;
        return acc;
      },
      [0, 0],
    );
    const title =
      active == total ? `Players (${active})` : `Players (${active}/${total})`;
    return [
      m("header.players.container-fluid", m("h1", title)),
      m(NavView, { nav }),
      m(
        "main.players.container-fluid",
        m(
          "section.players",
          tournament.players
            .reduce((acc: RegisteredPlayer[][], player) => {
              const group = acc[player.group] || [];
              group.push(player);
              acc[player.group] = group;
              return acc;
            }, [])
            .map((group, i, groups) =>
              m(GroupView, {
                players: group,
                groupIndex: i,
                groupCount: groups.length,
              }),
            ),
        ),
        m(
          "form",
          { onsubmit: (event: InputEvent) => event.preventDefault() },
          m("textarea", {
            id: "players",
            placeholder: "Separate players by space and groups by newline...",
            autocapitalize: "words",
          }),
          m("input", {
            type: "submit",
            value: "Add",
            onclick: registerPlayers,
          }),
        ),
      ),
    ];
  },
};
