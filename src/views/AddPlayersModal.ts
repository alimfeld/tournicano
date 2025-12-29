import m from "mithril";
import "./AddPlayersModal.css";
import { Tournament } from "../model/Tournament.ts";

export interface AddPlayersModalAttrs {
  tournament: Tournament;
  onClose: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

interface AddPlayersModalState {
  textareaContent: string;
}

const handleAddPlayers = (attrs: AddPlayersModalAttrs, state: AddPlayersModalState) => {
  const groups = state.textareaContent.split(/\n/);
  let allAdded: string[] = [];
  let allDuplicates: string[] = [];

  groups.forEach((group, i) => {
    if (i < 4) {
      const line = group.trim();
      if (line) {
        const names = line.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
        const result = attrs.tournament.addPlayers(names, i);
        allAdded = allAdded.concat(result.added);
        allDuplicates = allDuplicates.concat(result.duplicates);
      }
    }
  });

  if (allDuplicates.length > 0) {
    const duplicateNames = allDuplicates.join(", ");
    attrs.showToast(`Duplicate players ignored: ${duplicateNames}`, "error");
  } else if (allAdded.length > 0) {
    const count = allAdded.length;
    attrs.showToast(`Added ${count} player${count > 1 ? 's' : ''} to the tournament`, "success");
  }

  attrs.onClose();
};

export const AddPlayersModal: m.Component<AddPlayersModalAttrs, AddPlayersModalState> = {
  oninit: ({ state }) => {
    state.textareaContent = "";
  },

  view: ({ attrs, state }) => {
    return m("dialog.add-players-modal", {
      oncreate: (vnode) => {
        (vnode.dom as HTMLDialogElement).showModal();
        document.documentElement.classList.add('modal-is-open');

        // Focus textarea after modal opens
        requestAnimationFrame(() => {
          const textarea = vnode.dom.querySelector('textarea');
          if (textarea) (textarea as HTMLTextAreaElement).focus();
        });
      },
      onremove: () => {
        document.documentElement.classList.remove('modal-is-open');
      }
    },
      m("article",
        m("h2", "Add Players"),

        m("p", "Separate players with commas (,) or periods (.). Start a new line for each group."),

        m("p",
          m("small",
            m("b", "💡 "),
            "Use groups (max 4) for modes like Americano Mixed or Group Battle."
          )
        ),

        m("p",
          m("small",
            m("b", "💡 "),
            "You may paste from exported list of players."
          )
        ),

        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("textarea", {
            rows: 6,
            placeholder: "Alice, Beth, Carol\nDave, Eric, Frank",
            autocapitalize: "words",
            value: state.textareaContent,
            oninput: (e: Event) => {
              state.textareaContent = (e.target as HTMLTextAreaElement).value;
            }
          })
        ),

        m("footer",
          m("button.secondary", {
            onclick: (e: Event) => {
              e.preventDefault();
              attrs.onClose();
            }
          }, "Cancel"),

          m("button", {
            disabled: !state.textareaContent.trim(),
            onclick: (e: Event) => {
              e.preventDefault();
              handleAddPlayers(attrs, state);
            }
          }, "Add Players")
        )
      )
    );
  }
};
