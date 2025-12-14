import m from "mithril";
import "./StandingsPage.css";
import { PlayerView } from "./PlayerView.ts";
import { Tournament } from "../model/Tournament.ts";
import { Swipeable } from "./Swipeable.ts";
import { FAB } from "./FAB.ts";

export interface StandingsAttrs {
  tournament: Tournament;
  roundIndex: number;
  group: number | undefined;
  changeRound: (index: number) => void;
  changeGroup: (group: number | undefined) => void;
  showToast: (message: string, duration?: number) => void;
}

export const StandingsPage: m.Component<StandingsAttrs> = {
  view: ({
    attrs: { tournament, roundIndex, group, changeRound, changeGroup, showToast },
  }) => {
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    const groups = tournament.groups;
    const showGroupSwitcher = groups.length > 1 && groups.length <= 4;
    const standingsGroup =
      showGroupSwitcher && (group === undefined || groups.indexOf(group) >= 0)
        ? group
        : undefined;
    const award: (rank: number) => string | undefined = (rank) => {
      if (rank === 1) {
        return "🥇";
      }
      if (rank === 2) {
        return "🥈";
      }
      if (rank === 3) {
        return "🥉";
      }
      return undefined;
    };
    const standings = round ? round.standings(standingsGroup) : [];
    const totalRounds = roundIndex + 1; // rounds are 0-indexed
    const [
      groupWins,
      groupLosses,
      groupDraws,
      groupPointsFor,
      groupPointsAgainst,
    ] = standings.reduce((acc, ranked) => {
      acc[0] += ranked.player.wins
      acc[1] += ranked.player.losses
      acc[2] += ranked.player.draws
      acc[3] += ranked.player.pointsFor
      acc[4] += ranked.player.pointsAgainst
      return acc
    }, [0, 0, 0, 0, 0, 0, 0]);
    const matchCount = groupWins + groupLosses + groupDraws;
    const groupWinRatio = matchCount === 0 ? 0.5 : (groupWins + groupDraws / 2) / matchCount;
    const groupPlusMinus = groupPointsFor - groupPointsAgainst;
    const format = () => {
      return (
        "```\n" +
        standings
          .map((ranked) => {
            const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
            const reliability = totalRounds > 0 ? participationCount / totalRounds : 0;
            const reliabilityStr = reliability < 1
              ? ` ${(reliability * 100).toFixed(0)}%`
              : "";
            return (
              String(ranked.rank).padStart(2, " ") +
              ". " +
              ranked.player.name.slice(0, 10).padEnd(10, ".") +
              " " +
              (ranked.player.winRatio * 100).toFixed(0).padStart(3, " ") +
              "% " +
              (
                (ranked.player.plusMinus >= 0 ? "+" : "") +
                ranked.player.plusMinus
              ).padStart(4, " ") +
              reliabilityStr
            );
          })
          .join("\n") +
        "\n```"
      );
    };
    return [
      m(
        "header.standings.container-fluid",

        m(
          "button.secondary",
          {
            disabled: roundIndex <= 0 || roundCount === 0,
            onclick: () => changeRound(roundIndex - 1),
          },
          "←",
        ),
        m(
          "h1#title",
          roundIndex + 1 < roundCount
            ? `Standings (${roundIndex + 1}/${roundCount})`
            : `Standings`,
        ),
        m(
          "button.secondary",
          {
            disabled: roundIndex + 1 >= roundCount,
            onclick: () => changeRound(roundIndex + 1),
          },
          "→",
        ),
      ),
      m(
        Swipeable,
        {
          element: "main.standings.container-fluid.actions",
          onswipeleft:
            roundIndex > 0
              ? () => {
                changeRound(roundIndex - 1);
              }
              : undefined,
          onswiperight:
            roundIndex + 1 < roundCount
              ? () => {
                changeRound(roundIndex + 1);
              }
              : undefined,
        },
        showGroupSwitcher
          ? m(
            "div.group-switcher",
            { role: "group" },
            m(
              "button",
              {
                disabled: standingsGroup === undefined,
                onclick: () => {
                  changeGroup(undefined);
                },
              },
              "All",
            ),
            groups.map((g) =>
              m(
                "button",
                {
                  disabled: standingsGroup === g,
                  onclick: () => {
                    changeGroup(g);
                  },
                },
                `${String.fromCharCode(65 + g)}`,
              ),
            ),
          )
          : null,
        standings.length > 0
          ? [
            showGroupSwitcher && standingsGroup !== undefined ? [
              m("section.group-stats",
                m("div.total-players",
                  m("p", "Group"),
                  m(
                    "small",
                    `(${standings.length})`,
                  ),
                ),
                m("div.win-percentage-column",
                  m(
                    "p.win-percentage",
                    `${(groupWinRatio * 100).toFixed(0)}%`,
                    m("div.progressbar", {
                      style: `width: ${groupWinRatio * 100}%`,
                    }),
                  ),
                  m(
                    "small",
                    `(${groupWins}-${groupDraws}-${groupLosses})`,
                  ),
                ),
                m(
                  "div.points-column",
                  m(
                    "p.plus-minus",
                    (groupPlusMinus >= 0 ? "+" : "") + groupPlusMinus
                  ),
                  m(
                    "small",
                    `(+${groupPointsFor}/-${groupPointsAgainst})`,
                  ),
                )
              )] : [],
            ...standings.map((ranked) => {
              const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
              const reliability = totalRounds > 0 ? participationCount / totalRounds : 0;
              return m(
                "section.entry",
                m(PlayerView, {
                  player: ranked.player,
                  badge: award(ranked.rank),
                  rank: ranked.rank.toString()
                }),
                m(
                  "div.win-percentage-column",
                  m(
                    "p.win-percentage",
                    `${(ranked.player.winRatio * 100).toFixed(0)}%`,
                    m("div.progressbar", {
                      style: `width: ${ranked.player.winRatio * 100}%`,
                    }),
                  ),
                  m(
                    "div.reliability-and-record",
                    m(
                      "small.wins-draws-losses",
                      `(${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses})`,
                    ),
                    m("div.reliability-pie-chart",
                      m("div.pie", {
                        style: `--reliability: ${reliability};`,
                      })
                    ),
                  ),
                ),
                m(
                  "div.points-column",
                  m(
                    "p.plus-minus",
                    (ranked.player.plusMinus >= 0 ? "+" : "") +
                    ranked.player.plusMinus,
                  ),
                  m(
                    "small.points-detail",
                    `(+${ranked.player.pointsFor}/-${ranked.player.pointsAgainst})`,
                  ),
                ),
              );
            }),
          ]
          : m("p", "No scores yet. Go to the Rounds page and enter match scores to see standings!"),
      ),
       m(FAB, {
        icon: "⿻",
        variant: "secondary",
        onclick: async () => {
          const text = format();
          
          try {
            await navigator.share({ text });
            showToast("✓ Standings shared successfully");
          } catch (err) {
            // If share fails or is cancelled, try clipboard as fallback
            if (err instanceof Error && err.name !== 'AbortError') {
              try {
                await navigator.clipboard.writeText(text);
                showToast("✓ Standings copied to clipboard");
              } catch (clipboardErr) {
                showToast("⚠️ Failed to share or copy standings");
              }
            }
            // If user cancelled, don't show any message
          }
        },
        disabled: standings.length === 0,
      }),
    ];
  },
};
