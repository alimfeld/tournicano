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
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
}

export const StandingsPage: m.Component<StandingsAttrs> = {
  view: ({
    attrs: { tournament, roundIndex, group, changeRound, changeGroup, showToast },
  }) => {
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    // Get groups that have registered players
    const allGroups = tournament.groups;
    const populatedGroups = [...new Set(
      tournament.players()
        .filter(p => p.registered)
        .map(p => p.group)
    )].sort((a, b) => a - b);
    const groups = populatedGroups.length > 0 ? populatedGroups : allGroups;
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
    const allStandings = standingsGroup === undefined ? standings : (round ? round.standings(undefined) : []);
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
        showGroupSwitcher && allStandings.length > 0
          ? m(
            "div.group-switcher",
            { role: "group" },
            m(
              "button",
              {
                "aria-current": standingsGroup === undefined ? "page" : undefined,
                class: standingsGroup === undefined ? "" : "outline",
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
                  "aria-current": standingsGroup === g ? "page" : undefined,
                  class: standingsGroup === g ? "" : "outline",
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
          : m("p", ["No scores yet.", m("br"), "💡 Go to the Rounds page and enter match scores to see standings!"]),
      ),
       m(FAB, {
        icon: "⋮",
        iconOpen: "✕",
        position: "left",
        variant: "secondary",
        disabled: tournament.rounds.length === 0,
        actions: [
          {
            icon: "⿻",
            label: "Share / Export",
            onclick: async () => {
              const text = tournament.exportText(roundIndex);
              
              try {
                await navigator.share({ text });
                showToast("Tournament data shared successfully", "success");
              } catch (err) {
                // If share fails or is cancelled, try clipboard as fallback
                if (err instanceof Error && err.name !== 'AbortError') {
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast("Tournament data copied to clipboard", "success");
                  } catch (clipboardErr) {
                    showToast("Failed to share or copy tournament data", "error");
                  }
                }
                // If user cancelled, don't show any message
              }
            },
          },
          {
            icon: "↓",
            label: "Download JSON",
            onclick: () => {
              const json = tournament.exportJSON(roundIndex);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;
              const date = new Date().toISOString().slice(0, 10);
              const rounds = roundIndex + 1 < roundCount ? `-round${roundIndex + 1}` : "";
              a.download = `tournament-${date}${rounds}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToast("Tournament data downloaded", "success");
            },
          },
        ],
      }),
    ];
  },
};
