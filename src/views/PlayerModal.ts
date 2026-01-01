import m from "mithril";
import "./PlayerModal.css";
import { Player, validatePlayerName } from "../model/Tournament.ts";
import { getAvatar } from "./AvatarCache.ts";
import { GroupSymbol, getGroupSymbol, getGroupLetter } from "./GroupSymbol.ts";
import { Modal } from "./Modal.ts";

export interface PlayerModalAttrs {
  player: Player;
  onClose: () => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

interface PlayerModalState {
  editName: string;
  editGroup: number;
  editActive: boolean;
  editNameError: string;
}

export const PlayerModal: m.Component<PlayerModalAttrs, PlayerModalState> = {
  oninit: ({ state, attrs }) => {
    state.editName = attrs.player.name;
    state.editGroup = attrs.player.group;
    state.editActive = attrs.player.active;
    state.editNameError = "";
  },

  view: ({ attrs, state }) => {
    const { player, onClose, showToast } = attrs;
    const trimmedEditName = state.editName.trim();

    // Check if any changes have been made
    const hasChanges = 
      player.name !== trimmedEditName ||
      player.group !== state.editGroup ||
      player.active !== state.editActive;

    const validateEditName = (name: string): string => {
      // Use the model's validation function
      const result = validatePlayerName(name);
      if (!result.valid) {
        return result.error || "Invalid name";
      }

      // Check for duplicates
      if (!player.canRenameTo(name.trim())) {
        return "Name already exists";
      }

      return "";
    };

    const handleNameInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      state.editName = input.value;
      state.editNameError = validateEditName(input.value);
    };

    const handleSave = () => {
      const trimmedName = state.editName.trim();
      const error = validateEditName(trimmedName);
      if (error) {
        state.editNameError = error;
        return;
      }

      const oldName = player.name;
      const nameChanged = player.name !== trimmedName;
      const groupChanged = player.group !== state.editGroup;
      const activeChanged = player.active !== state.editActive;

      if (nameChanged) player.rename(trimmedName);
      if (groupChanged) player.setGroup(state.editGroup);
      if (activeChanged) player.activate(state.editActive);

      // Build toast message
      const messages: string[] = [];
      if (nameChanged && groupChanged && activeChanged) {
        const groupLabel = `${getGroupSymbol(state.editGroup)} ${getGroupLetter(state.editGroup)}`;
        messages.push(`${oldName} → ${trimmedName} renamed, moved to group ${groupLabel}, ${state.editActive ? 'activated' : 'deactivated'}`);
      } else if (nameChanged && groupChanged) {
        const groupLabel = `${getGroupSymbol(state.editGroup)} ${getGroupLetter(state.editGroup)}`;
        messages.push(`${oldName} → ${trimmedName} renamed and moved to group ${groupLabel}`);
      } else if (nameChanged && activeChanged) {
        messages.push(`${oldName} → ${trimmedName} renamed and ${state.editActive ? 'activated' : 'deactivated'}`);
      } else if (groupChanged && activeChanged) {
        const groupLabel = `${getGroupSymbol(state.editGroup)} ${getGroupLetter(state.editGroup)}`;
        messages.push(`${trimmedName} moved to group ${groupLabel} and ${state.editActive ? 'activated' : 'deactivated'}`);
      } else if (nameChanged) {
        messages.push(`${oldName} → ${trimmedName} renamed successfully`);
      } else if (groupChanged) {
        const groupLabel = `${getGroupSymbol(state.editGroup)} ${getGroupLetter(state.editGroup)}`;
        messages.push(`${trimmedName} moved to group ${groupLabel}`);
      } else if (activeChanged) {
        messages.push(`${trimmedName} ${state.editActive ? 'activated' : 'deactivated'}`);
      }

      if (messages.length > 0 && showToast) {
        showToast(messages.join(". "), "success");
      }

      onClose();
    };

    const handleDelete = () => {
      const playerName = player.name;
      const success = player.delete();

      if (success) {
        if (showToast) showToast(`Player ${playerName} deleted`, "success");
        onClose();
      } else {
        if (showToast) {
          showToast(`Cannot delete ${playerName} - participating in rounds`, "error");
        }
      }
    };

    return m(Modal, { onClose, className: 'player-modal' },
      m("article",
        // Header: Close button, Avatar, Name, Participation Status
        m("header",
          m("button[aria-label=Close][rel=prev]", {
            onclick: onClose,
          }),
          m("section",
            m("img", {
              src: getAvatar(trimmedEditName || player.name),
              alt: trimmedEditName || player.name
            }),
            m("h2", trimmedEditName || player.name),
            player.inAnyRound()
              ? m("div.participation-status",
                m("span.participating-icon", "🚀"),
                " Participating in rounds"
              )
              : m("div.participation-status", "Not yet participating")
          ),
        ),

        // Form content
        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("label", { for: "player-name" }, "Name"),
          m("input", {
            id: "player-name",
            type: "text",
            name: "player-name",
            value: state.editName,
            placeholder: "Player name",
            autocapitalize: "words",
            oninput: handleNameInput,
            "aria-invalid": state.editNameError ? "true" : "false"
          }),
          state.editNameError
            ? m("small.error-message", state.editNameError)
            : null,

          m("fieldset",
            m("legend", "Group"),
            [0, 1, 2, 3].flatMap(g => [
              m("input", {
                type: "radio",
                id: `player-group-${g}`,
                name: "player-group",
                checked: state.editGroup === g,
                onchange: () => { state.editGroup = g; }
              }),
              m("label", {
                for: `player-group-${g}`
              }, m(GroupSymbol, { group: g, neutral: false }))
            ])
          ),

          m("label.active-toggle", { for: "player-active" },
            m("input", {
              type: "checkbox",
              role: "switch",
              id: "player-active",
              name: "player-active",
              checked: state.editActive,
              onchange: (e: Event) => {
                state.editActive = (e.target as HTMLInputElement).checked;
              }
            }),
            "Active"
          )
        ),

        // Footer with action buttons
        m("footer",
          !player.inAnyRound() ? m("button.delete-player", {
            onclick: (e: Event) => {
              e.preventDefault();
              handleDelete();
            },
          }, "Delete Player") : null,
          m("button", {
            disabled: !!state.editNameError || !state.editName.trim() || !hasChanges,
            onclick: (e: Event) => {
              e.preventDefault();
              handleSave();
            }
          }, "Apply Changes")
        )
      )
    );
  },
};
