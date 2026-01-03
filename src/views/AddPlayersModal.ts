import m from "mithril";
import { Tournament } from "../model/tournament/Tournament.ts";
import { Modal } from "./Modal.ts";

export interface AddPlayersModalAttrs {
  tournament: Tournament;
  onClose: () => void;
  showToast: (message: string, options?: { type?: "success" | "error" | "info"; duration?: number; position?: "top" | "bottom" }) => void;
}

interface AddPlayersModalState {
  textareaContent: string;
}

export const AddPlayersModal: m.Component<AddPlayersModalAttrs, AddPlayersModalState> = {
  oninit: ({ state }) => {
    state.textareaContent = "";
  },

  view: ({ attrs, state }) => {
    const { tournament, onClose, showToast } = attrs;

    const handleAddPlayers = () => {
      const result = tournament.addPlayersFromInput(state.textareaContent);
      // Map warning to error for toast display
      const toastType = result.type === "warning" ? "error" : result.type;
      showToast(result.message, { type: toastType, position: "top" });
      onClose();
    };

    return m(Modal, { onClose, className: 'add-players-modal' },
      m("article",
        // Header: Close button + Title
        m("header",
          m("button[aria-label=Close][rel=prev]", {
            onclick: onClose,
          }),
          m("h2", "🤖 Add Players")
        ),

        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("textarea", {
            id: "add-players-textarea",
            name: "players",
            rows: 7,
            placeholder: "Alice\nBob\nCarol\n\nDave\nEric\nFrank",
            autocapitalize: "words",
            value: state.textareaContent,
            oninput: (e: Event) => {
              state.textareaContent = (e.target as HTMLTextAreaElement).value;
            }
          }),
          m("small", "Enter one player per line. Each empty line starts a new group. Maximum 4 groups.")
        ),

        m("footer",
          m("button.secondary", {
            onclick: (e: Event) => {
              e.preventDefault();
              onClose();
            }
          }, "Cancel"),

          m("button", {
            disabled: !state.textareaContent.trim(),
            onclick: (e: Event) => {
              e.preventDefault();
              handleAddPlayers();
            }
          }, "Add Players")
        )
      )
    );
  }
};
