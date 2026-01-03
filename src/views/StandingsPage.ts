import m from "mithril";
import "./StandingsPage.css";
import { ParticipatingPlayerCard } from "./ParticipatingPlayerCard.ts";
import { ParticipatingPlayer } from "../model/tournament/Tournament.ts";
import { Swipeable } from "./Swipeable.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header, HeaderAction } from "./Header.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { GroupFilter } from "./GroupFilter.ts";
import { ParticipatingPlayerModal } from "./ParticipatingPlayerModal.ts";
import { appContext } from "../Layout.ts";

interface StandingsState {
  selectedPlayer?: ParticipatingPlayer;
}

export const StandingsPage: m.Component<{}, StandingsState> = {
  oninit: ({ state }) => {
    state.selectedPlayer = undefined;
  },
  view: ({ state }) => {
    const { state: appState, showToast, changeRound, changeStandingsFilters } = appContext;
    const { tournament, roundIndex, filters: { standings: standingsFilters } } = appState;
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    const allGroups = tournament.groups;
    const populatedGroups = [...new Set(
      tournament.players()
        .map(p => p.group)
    )].sort((a, b) => a - b);
    const groups = populatedGroups.length > 0 ? populatedGroups : allGroups;
    const showGroupFilter = groups.length > 1 && groups.length <= 4;

    // Convert filters to standings call format
    const selectedGroups = standingsFilters.groups.length > 0
      ? standingsFilters.groups
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
    const standings = round ? round.standings(selectedGroups) : [];
    const allStandings = selectedGroups && selectedGroups.length > 0
      ? (round ? round.standings(undefined) : [])
      : standings;
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

    // Player modal handlers
    const openPlayerModal = (player: ParticipatingPlayer) => {
      state.selectedPlayer = player;
    };

    const closePlayerModal = () => {
      state.selectedPlayer = undefined;
    };

    // Build actions for header overflow menu
    const actions: HeaderAction[] = [
      {
        icon: "⤴",
        label: "Share Standings",
        disabled: standings.length === 0,
        onclick: async () => {
          const text = tournament.exportStandingsText(roundIndex, selectedGroups);

          try {
            await navigator.share({ text });
          } catch (err) {
            // If share fails or is cancelled, try clipboard as fallback
            if (err instanceof Error && err.name !== 'AbortError') {
              try {
                await navigator.clipboard.writeText(text);
              } catch (clipboardErr) {
                showToast("Failed to share or copy tournament data", { type: "error", position: "top" });
              }
            }
            // If user cancelled, don't show any message
          }
        },
      },
    ];

    return [
      m(Header, {
        title: "Standings" + (roundCount > 0 ? (roundIndex + 1 < roundCount
          ? ` (R${roundIndex + 1}/${roundCount})`
          : ` (R${roundIndex + 1})`) : ""),
        actions: actions
      }),
      m(
        Swipeable,
        {
          element: "main.standings.container-fluid",
          showNavHints: true,
          onswipeleft:
            roundIndex > 0 && roundCount > 0
              ? () => {
                changeRound(roundIndex - 1);
              }
              : undefined,
          onswiperight:
            roundIndex + 1 < roundCount && roundCount > 0
              ? () => {
                changeRound(roundIndex + 1);
              }
              : undefined,
        },
        showGroupFilter && allStandings.length > 0
          ? m("section.filter-section",
            m(GroupFilter, {
              groups: groups,
              selectedGroups: standingsFilters.groups,
              onGroupsChange: (groups) => changeStandingsFilters({ groups }),
              getGroupCount: (group) => {
                if (!round) return 0;
                return round.standings([group]).length;
              }
            })
          )
          : null,
        allStandings.length > 0
          ? m("div.standings-grid", [
            // Group total row (if filtered)
            showGroupFilter && standingsFilters.groups.length > 0
              ? m("div.standings-row.group-total",
                // Cell 1: Empty rank cell (keeps grid alignment)
                m("div.standings-cell.rank-cell", ""),
                // Cell 2: Group symbols (centered)
                m("div.standings-cell.group-cell",
                  standingsFilters.groups.length === 1
                    ? m(GroupSymbol, { group: standingsFilters.groups[0] })
                    : m("div.group-symbols",
                      standingsFilters.groups.map(g => m(GroupSymbol, { group: g }))
                    ),
                ),
                // Cell 3: All stats combined
                m("div.standings-cell.stats-cell",
                  m("p",
                    m("strong", `${(groupWinRatio * 100).toFixed(0)}%`)
                  ),
                  m("p",
                    m("small", `${groupWins}-${groupDraws}-${groupLosses}`)
                  ),
                  m("p",
                    m("strong", `${(groupPlusMinus >= 0 ? "+" : "") + groupPlusMinus}`)
                  )
                )
              )
              : null,
            // Player rows
            ...standings.map((ranked) => {
              return m("div.standings-row",
                // Cell 1: Rank (right-aligned)
                m("div.standings-cell.rank-cell",
                  `${ranked.rank}.`
                ),
                // Cell 2: PlayerCard (centered)
                m("div.standings-cell.player-cell",
                  m(ParticipatingPlayerCard, {
                    player: ranked.player,
                    badge: award(ranked.rank),
                    onClick: () => openPlayerModal(ranked.player)
                  })
                ),
                // Cell 3: All stats combined
                m("div.standings-cell.stats-cell",
                  m("p",
                    m("strong", `${(ranked.player.winRatio * 100).toFixed(0)}%`)
                  ),
                  m("p",
                    m("small", `${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses}`)
                  ),
                  m("p",
                    m("strong", `${(ranked.player.plusMinus >= 0 ? "+" : "") + ranked.player.plusMinus}`)
                  )
                )
              );
            })
          ])
          : m(HelpCard, {
            title: tournament.rounds.length === 0
              ? "🚀 Create rounds"
              : "🚀 Enter scores",
            message: tournament.rounds.length === 0
              ? [
                m("p", "Create rounds and enter match scores to see standings."),
              ]
              : m("p", "Enter match scores to see standings!"),
            action: {
              label: "Go to Rounds",
              onclick: () => m.route.set("/rounds")
            }
          }),
      ),
      // Player stats modal (conditionally rendered)
      state.selectedPlayer ? m(ParticipatingPlayerModal, {
        player: state.selectedPlayer,
        onClose: closePlayerModal
      }) : null,
    ];
  },
};
