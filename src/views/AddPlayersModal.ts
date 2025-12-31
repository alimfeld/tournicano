import m from "mithril";
import { Tournament } from "../model/Tournament.ts";
import { Modal } from "./Modal.ts";

export interface AddPlayersModalAttrs {
  tournament: Tournament;
  onClose: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
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
      const lines = state.textareaContent.split(/\n/);
      let allAdded: string[] = [];
      let allDuplicates: string[] = [];
      const groupsUsed = new Set<number>();
      let ignoredGroupsCount = 0;

      lines.forEach((line, i) => {
        if (i < 4) {
          const trimmed = line.trim();
          if (trimmed) {
            const names = trimmed.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
            if (names.length > 0) {
              const result = tournament.addPlayers(names, i);
              if (result.added.length > 0) {
                groupsUsed.add(i);
              }
              allAdded = allAdded.concat(result.added);
              allDuplicates = allDuplicates.concat(result.duplicates);
            }
          }
        } else {
          const trimmed = line.trim();
          if (trimmed) {
            const names = trimmed.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
            if (names.length > 0) {
              ignoredGroupsCount++;
            }
          }
        }
      });

      // Build toast message based on what happened
      const addedCount = allAdded.length;
      const duplicateCount = allDuplicates.length;
      const groupCount = groupsUsed.size;
      const hasErrors = duplicateCount > 0 || ignoredGroupsCount > 0;

      if (addedCount === 0 && !hasErrors) {
        // Nothing added and no errors
        showToast("No players added", "info");
      } else if (addedCount === 0 && hasErrors) {
        // Nothing added but there were duplicates/ignored groups
        const errorParts: string[] = [];
        if (duplicateCount > 0) {
          errorParts.push(`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''}`);
        }
        if (ignoredGroupsCount > 0) {
          errorParts.push(`${ignoredGroupsCount} group${ignoredGroupsCount !== 1 ? 's' : ''}`);
        }
        showToast(`No players added - ${errorParts.join(" and ")} ignored`, "error");
      } else if (hasErrors) {
        // Players added but with errors
        let message = `Added ${addedCount} player${addedCount !== 1 ? 's' : ''}`;

        if (groupCount > 1) {
          message += ` in ${groupCount} group${groupCount !== 1 ? 's' : ''}`;
        }

        message += " - ";

        const errorParts: string[] = [];
        if (duplicateCount > 0) {
          errorParts.push(`${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''}`);
        }
        if (ignoredGroupsCount > 0) {
          errorParts.push(`${ignoredGroupsCount} group${ignoredGroupsCount !== 1 ? 's' : ''}`);
        }

        message += errorParts.join(" and ") + " ignored";

        showToast(message, "error");
      } else {
        // Success - players added with no errors
        let message = `Added ${addedCount} player${addedCount !== 1 ? 's' : ''}`;

        if (groupCount > 1) {
          message += ` in ${groupCount} groups`;
        }

        message += " to the tournament";

        showToast(message, "success");
      }

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
            rows: 6,
            placeholder: "Alice, Beth, Carol\nDave, Eric, Frank",
            autocapitalize: "words",
            value: state.textareaContent,
            oninput: (e: Event) => {
              state.textareaContent = (e.target as HTMLTextAreaElement).value;
            }
          }),
          m("small", "Separate players with commas (,) or periods (.) and put each group (max 4) on a new line.")
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
