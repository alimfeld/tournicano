import m from "mithril";
import "./PlayersPage.css";
import { NavView } from "./NavView.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";
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
          const names = line.trim().split(/\s+/);
          tournament.registerPlayers(names, i);
        }
      });
      input.value = "";
    };
    const [active, total] = tournament
      .players()
      .values()
      .reduce(
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
        "main.players.container-fluid.actions",
        m(
          "section.players",
          tournament.groups.map((group) =>
            m(GroupView, {
              players: tournament.players(group),
              groupIndex: group,
              groupCount: tournament.groups.length,
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
      m(
        "div.actions",
        m(
          "button.right",
          {
            disabled: tournament.players.length == 0,
            onclick: async () => {
              const data = {
                text: tournament.groups
                  .map((group) =>
                    tournament
                      .players(group)
                      .map((player) => player.name)
                      .toSorted((p, q) => p.localeCompare(q))
                      .join(" "),
                  )
                  .join("\n"),
              };
              try {
                await navigator.share(data);
              } catch (err) {
                console.log(err);
              }
            },
          },
          "⿻",
        ),
      ),
    ];
  },
};
