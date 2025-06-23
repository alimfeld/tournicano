import m from "mithril";
import "./RoundPage.css";
import { PlayerView } from "./PlayerView.ts";
import { NavView } from "./NavView.ts";
import { Match, Score, Team, Tournament } from "../model/Tournament.ts";
import { Page } from "../App.ts";
import { Settings } from "../model/Settings.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  nav: (page: Page) => void;
}

export const RoundPage: m.Component<RoundAttrs> = {
  view: ({ attrs: { settings, tournament, roundIndex, changeRound, nav } }) => {
    const matchesPerRound = Math.min(
      Math.floor(tournament.players.filter((p) => p.active).length / 4),
      settings.courts,
    );
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    const renderTeam = (team: Team) => {
      return m(
        "section.team",
        m(PlayerView, { player: team.player1 }),
        m("p", "&"),
        m(PlayerView, { player: team.player2 }),
      );
    };
    const renderMatch = (match: Match, i: number) => {
      return [
        renderTeam(match.teamA),
        m("h2", `M${i + 1}`),
        renderTeam(match.teamB),
        m(
          "section.score",
          m("input.score", {
            "aria-invalid": match.score ? "false" : "true",
            type: "text",
            name: "score",
            placeholder: "--:--",
            inputmode: "numeric",
            value: match.score
              ? `${String(match.score[0]).padStart(2, "0")}:${String(match.score[1]).padStart(2, "0")}`
              : null,
            oninput: (event: InputEvent) => {
              const input = event.target as HTMLInputElement;
              // Remove non-digit characters
              let digits = input.value.replace(/\D/g, "");
              // Limit to 4 digits
              if (digits.length > 4) {
                digits = digits.slice(0, 4);
              }
              // Format as XX:YY
              if (digits.length <= 2) {
                input.value = digits;
                // keep cursor in front of colon to make backspace work!
                input.setSelectionRange(digits.length, digits.length);
              } else {
                input.value = digits.slice(0, 2) + ":" + digits.slice(2);
              }
              // @ts-ignore
              event.redraw = false;
            },
            onblur: (event: InputEvent) => {
              const input = event.target as HTMLInputElement;
              // Remove non-digit characters
              let digits = input.value.replace(/\D/g, "");
              const score: Score | undefined =
                digits.length == 4
                  ? [parseInt(digits.slice(0, 2)), parseInt(digits.slice(2))]
                  : undefined;
              if (score == undefined) {
                input.value = "";
              }
              match.submitScore(score);
            },
          }),
        ),
      ];
    };
    return [
      m(
        "header.round.container-fluid",
        m(
          "button.outline.prev",
          {
            disabled: roundIndex <= 0,
            onclick: () => changeRound(roundIndex - 1),
          },
          "<",
        ),
        m(
          "h1",
          round
            ? roundIndex + 1 == roundCount
              ? `Round ${roundIndex + 1}`
              : `Round ${roundIndex + 1}/${roundCount}`
            : "-",
        ),
        m(
          "button.outline.next",
          {
            disabled: roundIndex + 1 >= roundCount,
            onclick: () => changeRound(roundIndex + 1),
          },
          ">",
        ),
      ),
      m(NavView, { nav }),
      m(
        "main.round.container-fluid",
        round
          ? [
              ...round.matches.map((match, i) =>
                m("section.match", renderMatch(match, i)),
              ),
              round.paused.length > 0
                ? m(
                    "section.paused",
                    round.paused.map((player) => m(PlayerView, { player })),
                  )
                : null,
            ]
          : [m("p", "No rounds created (yet)!")],
        m(
          "section.actions",
          m(
            "button.delete",
            {
              disabled: !(round && round.isLast()),
              onclick: () => {
                if (round) {
                  round.delete();
                  changeRound(roundIndex - 1);
                }
              },
            },
            "Delete",
          ),
          m(
            "button.add",
            {
              disabled: matchesPerRound < 1,
              onclick: () => {
                tournament.createRound({
                  maxMatches: matchesPerRound,
                  flavor: {
                    americanoFactor: 1 - settings.mexicanoRatio,
                    mexicanoFactor: settings.mexicanoRatio,
                  },
                });
                changeRound(roundCount);
              },
            },
            `Create Round (${matchesPerRound} Matches)`,
          ),
        ),
      ),
    ];
  },
};
