import m from "mithril";
import "./PlayersPage.css";
import { Tournament } from "../model/Tournament.ts";
import { GroupView } from "./GroupView.ts";
import { FAB } from "./FAB.ts";

export interface PlayersAttrs {
  tournament: Tournament;
  playerFilter: string;
  changePlayerFilter: (playerFilter: string) => void;
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
}

interface PlayersState {
  dialogId: string;
  hasTextareaContent: boolean;
}

export const PlayersPage: m.Component<PlayersAttrs, PlayersState> = {
  oninit: ({ state }) => {
    state.dialogId = "players-registration-dialog";
    state.hasTextareaContent = false;
  },

  view: ({ attrs: { tournament, playerFilter, changePlayerFilter, showToast }, state }) => {

    const openDialog = () => {
      state.hasTextareaContent = false;
      const dialog = document.getElementById(state.dialogId);
      if (dialog) {
        dialog.setAttribute("open", "true");
        // Focus the textarea after a brief delay to ensure dialog is rendered
        setTimeout(() => {
          const textarea = document.getElementById("players") as HTMLTextAreaElement;
          if (textarea) {
            textarea.value = "";
            textarea.focus();
          }
        }, 100);
      }
    };

    const closeDialog = () => {
      state.hasTextareaContent = false;
      const dialog = document.getElementById(state.dialogId);
      if (dialog) {
        dialog.setAttribute("open", "false");
      }
    };

    const handleTextareaInput = (e: Event) => {
      const textarea = e.target as HTMLTextAreaElement;
      const value = textarea.value.trim();
      state.hasTextareaContent = value.length > 0;
    };

    const addPlayers = () => {
      const input = document.getElementById("players") as HTMLTextAreaElement;
      const groups = input.value.split(/\n/);
      let allAdded: string[] = [];
      let allDuplicates: string[] = [];

      groups.forEach((group, i) => {
        if (i < 4) {
          const line = group.trim();
          if (line) {
            // Split by comma or period (.) - double-tapping space produces a period on many devices
            const names = line.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
            const result = tournament.addPlayers(names, i);
            allAdded = allAdded.concat(result.added);
            allDuplicates = allDuplicates.concat(result.duplicates);
          }
        }
      });
      input.value = "";

      // Close the dialog
      closeDialog();

      // Show feedback message
      if (allDuplicates.length > 0) {
        const duplicateNames = allDuplicates.join(", ");
        showToast(`Duplicate players ignored: ${duplicateNames}`, "error");
      } else if (allAdded.length > 0) {
        const count = allAdded.length;
        showToast(`Added ${count} player${count > 1 ? 's' : ''} to the tournament`, "success");
      }
    };
    const [registered, active, total] = tournament
      .players()
      .reduce(
        (acc, player) => {
          if (player.registered) {
            acc[0]++;
            if (player.active) {
              acc[1]++;
            }
          }
          acc[2]++;
          return acc;
        },
        [0, 0, 0],
      );
    const tournamentStarted = tournament.rounds.length > 0;
    return [
      m("header.players.container-fluid", m("h1", "Players")),
      m(
        "main.players.container-fluid.actions",
        // Filter buttons - shown only when there is at least one player
        total > 0 ? m(
          "div.player-filter",
          { role: "group" },
          m(
            "button",
            {
              role: playerFilter === "all" ? undefined : "button",
              "aria-current": playerFilter === "all" ? "page" : undefined,
              class: playerFilter === "all" ? "" : "outline",
              onclick: () => {
                changePlayerFilter("all");
              },
            },
            `Registered (${registered === total ? registered : `${registered}/${total}`})`,
          ),
          m(
            "button",
            {
              role: playerFilter === "registered" ? undefined : "button",
              "aria-current": playerFilter === "registered" ? "page" : undefined,
              class: playerFilter === "registered" ? "" : "outline",
              onclick: () => {
                changePlayerFilter("registered");
              },
            },
            `Active (${active === registered ? active : `${active}/${registered}`})`,
          ),
        ) : null,
        // Player groups or empty state
        total > 0
          ? m(
            "section.players",
            tournament.groups.map((group) =>
              m(GroupView, {
                tournament,
                playerFilter,
                groupIndex: group,
                showToast,
              }),
            ),
          )
          : m("p", ["No players yet.", m("br"), "💡 Press the + button to add your first players!"]),
      ),
      m(FAB, {
        icon: "⋮",
        iconOpen: "✕",
        variant: "secondary",
        position: "left",
        disabled: tournament.players().length === 0,
        actions: [
          {
            icon: "⊕",
            label: "Register All Players",
            onclick: () => {
              const count = total - registered;
              tournament.registerAll();
              showToast(`Registered ${count} player${count === 1 ? '' : 's'}`, "success");
            },
            disabled: registered === total,
          },
          {
            icon: "⊖",
            label: "Unregister All Players",
            onclick: () => {
              if (tournamentStarted) {
                tournament.restart();
              }
              tournament.unregisterAll();
              changePlayerFilter("all");
              if (tournamentStarted) {
                showToast("Tournament restarted - all players unregistered", "success");
              } else {
                showToast(`Unregistered ${registered} player${registered === 1 ? '' : 's'}`, "success");
              }
            },
            confirmation: tournamentStarted ? {
              title: "🚨 Unregister All Players?",
              description: [
                "This will unregister all players and delete all rounds.",
                "This action cannot be undone!"
              ],
            } : undefined,
            variant: tournamentStarted ? "del" : undefined,
            disabled: !tournamentStarted && registered === 0,
          },
          {
            icon: "␡",
            label: "Delete All Players",
            onclick: () => {
              tournament.reset();
              changePlayerFilter("all");
            },
            variant: "del",
            disabled: tournament.players().length === 0,
            confirmation: {
              title: "🚨 Delete All Players?",
              description: [
                "This will delete all players and all rounds.",
                "This action cannot be undone!"
              ],
            }
          },
          {
            icon: "⿻",
            label: "Share / Export",
            onclick: async () => {
              const text = tournament.groups
                .map((group) =>
                  tournament
                    .players(group)
                    .map((player) => player.name)
                    .toSorted((p, q) => p < q ? -1 : p > q ? 1 : 0)
                    .join(", "),
                )
                .join("\n");

              try {
                await navigator.share({ text });
                showToast("Players shared successfully", "success");
              } catch (err) {
                // If share fails or is cancelled, try clipboard as fallback
                if (err instanceof Error && err.name !== 'AbortError') {
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast("Players copied to clipboard", "success");
                  } catch (clipboardErr) {
                    showToast("Failed to share or copy players", "error");
                  }
                }
                // If user cancelled, don't show any message
              }
            },
            disabled: tournament.players().length === 0,
          }
        ]
      }),
      // Add Players FAB (right side)
      m(FAB, {
        icon: "＋",
        variant: "ins",
        position: "right",
        onclick: openDialog,
      }),
      // Registration Dialog
      m(
        "dialog",
        { id: state.dialogId },
        m(
          "article",
          m("h3", "Add Players"),
          m("p", "Separate players with commas or periods. Start a new line for each group (max 4 groups)."),
          m(
            "form",
            { onsubmit: (event: SubmitEvent) => event.preventDefault() },
            m("textarea", {
              id: "players",
              rows: 6,
              placeholder: "Alice, Beth, Carol\nDave, Eric, Frank",
              autocapitalize: "words",
              oninput: handleTextareaInput,
            }),
          ),
          m(
            "footer",
            m(
              "button",
              {
                class: "secondary",
                onclick: (event: Event) => {
                  event.preventDefault();
                  closeDialog();
                },
              },
              "Cancel",
            ),
            m(
              "button.add",
              {
                disabled: !state.hasTextareaContent,
                onclick: (event: Event) => {
                  event.preventDefault();
                  addPlayers();
                },
              },
              "Add Players",
            ),
          ),
        ),
      ),
    ];
  },
};
