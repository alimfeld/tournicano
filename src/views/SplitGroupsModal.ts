import m from "mithril";
import { Tournament } from "../model/tournament/Tournament.ts";
import { Modal } from "./Modal.ts";
import { GroupSymbol, getGroupLetter } from "./GroupSymbol.ts";

export interface SplitGroupsModalAttrs {
  tournament: Tournament;
  onClose: () => void;
  showToast: (message: string, options?: { type?: "success" | "error" | "info"; duration?: number; position?: "top" | "middle" | "bottom" }) => void;
}

interface SplitGroupsModalState {
  groupCount: 2 | 4;
  extraPlayerInLastGroup: boolean;
}

export const SplitGroupsModal: m.Component<SplitGroupsModalAttrs, SplitGroupsModalState> = {
  oninit: ({ state }) => {
    state.groupCount = 2;
    state.extraPlayerInLastGroup = false;
  },

  view: ({ attrs, state }) => {
    const { tournament, onClose, showToast } = attrs;

    const lastRound = tournament.rounds[tournament.rounds.length - 1];
    const standingsCount = lastRound ? lastRound.standings().length : 0;
    const hasRemainder = standingsCount % state.groupCount !== 0;

    const handleConfirm = () => {
      const assigned = tournament.assignGroupsByStandings(state.groupCount, state.extraPlayerInLastGroup);
      const groupLetters = Array.from({ length: state.groupCount }, (_, i) => getGroupLetter(i)).join(", ");
      showToast(`${assigned} players assigned to groups ${groupLetters}`, { type: "success", position: "middle" });
      onClose();
    };

    return m(Modal, { onClose, className: "split-groups-modal" },
      m("article",
        m("header",
          m("button[aria-label=Close][rel=prev]", { onclick: onClose }),
          m("h2", "Split into Groups")
        ),

        m("p",
          "Splits players into groups based on current standings. Top-ranked players go to Group A, the next to Group B, and so on. ",
          "After splitting, switch to a group-based format to use the new groups for match generation."
        ),

        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("fieldset",
            m("legend", "Number of groups"),
            ([2, 4] as const).flatMap((n) => [
              m("input", {
                type: "radio",
                id: `split-groups-${n}`,
                name: "split-groups",
                checked: state.groupCount === n,
                onchange: () => { state.groupCount = n; },
              }),
              m("label", { for: `split-groups-${n}` },
                Array.from({ length: n }, (_, i) => m(GroupSymbol, { group: i }))
              ),
            ])
          ),

          hasRemainder
            ? m("fieldset",
              m("legend", "Extra player goes to"),
              [
                { id: "extra-first", value: false, label: "First group" },
                { id: "extra-last", value: true, label: "Last group" },
              ].flatMap(({ id, value, label }) => [
                m("input", {
                  type: "radio",
                  id,
                  name: "extra-player",
                  checked: state.extraPlayerInLastGroup === value,
                  onchange: () => { state.extraPlayerInLastGroup = value; },
                }),
                m("label", { for: id }, label),
              ])
            )
            : null,
        ),

        m("footer",
          m("button.secondary", {
            onclick: (e: Event) => {
              e.preventDefault();
              onClose();
            },
          }, "Cancel"),
          m("button", {
            onclick: (e: Event) => {
              e.preventDefault();
              handleConfirm();
            },
          }, "Split")
        )
      )
    );
  },
};
