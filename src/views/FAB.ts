import m from "mithril";
import "./FAB.css";

export interface FABAction {
  icon: string;
  label: string;
  onclick: () => void;
  disabled?: boolean;
  confirmation?: {
    title: string;
    description: string;
  };
}

export interface FABAttrs {
  icon: string;
  iconOpen?: string;
  actions: FABAction[];
  position?: "left" | "right";
  fullscreen?: boolean;
  disabled?: boolean;
}

interface FABState {
  isOpen: boolean;
}

export const FAB: m.Component<FABAttrs, FABState> = {
  oninit: ({ state }) => {
    state.isOpen = false;
  },

  view: ({ attrs: { icon, iconOpen, actions, position = "right", fullscreen = false, disabled = false }, state }) => {
    const positionClass = position === "left" ? "left" : "right";
    const fullscreenClass = fullscreen ? "fullscreen" : "";

    const toggleFAB = (event: Event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      state.isOpen = !state.isOpen;
      event.preventDefault();
    };

    const handleAction = (action: FABAction, dialogId: string, event: Event) => {
      if (action.confirmation) {
        // Open confirmation dialog
        document.getElementById(dialogId)!.setAttribute("open", "true");
      } else {
        // Execute action directly
        action.onclick();
        state.isOpen = false;
      }
      event.preventDefault();
    };

    const confirmAction = (action: FABAction, dialogId: string, event: Event) => {
      action.onclick();
      document.getElementById(dialogId)!.setAttribute("open", "false");
      state.isOpen = false;
      event.preventDefault();
    };

    const cancelAction = (dialogId: string, event: Event) => {
      document.getElementById(dialogId)!.setAttribute("open", "false");
      event.preventDefault();
    };

    // Filter out disabled actions
    const enabledActions = actions.filter((action) => !action.disabled);

    // Generate unique IDs for dialogs
    const actionDialogIds = enabledActions.map(() => crypto.randomUUID());

    return m(
      "div.fab-container",
      {
        class: `${positionClass} ${fullscreenClass}`,
      },
      [
        // Secondary actions (rendered first so they appear above the primary button)
        state.isOpen &&
        m(
          "div.fab-actions",
          enabledActions.toReversed().map((action, index) => {
            const reversedIndex = enabledActions.length - 1 - index;
            const dialogId = actionDialogIds[reversedIndex];
            return m(
              "div.fab-action-item",
              {
                key: index,
                style: {
                  transitionDelay: `${reversedIndex * 50}ms`,
                },
              },
              [
                m("span.fab-action-label", action.label),
                m(
                  "button.fab-action-button.secondary",
                  {
                    class: action.confirmation ? "action-with-confirmation" : "",
                    onclick: (event: Event) => handleAction(action, dialogId, event),
                  },
                  action.icon,
                ),
              ],
            );
          }),
        ),

        // Confirmation dialogs for all actions
        ...enabledActions
          .map((action, index) => {
            if (!action.confirmation) return null;
            const dialogId = actionDialogIds[index];
            return m(
              "dialog",
              { id: dialogId },
              m(
                "article",
                m("h3", action.confirmation.title),
                m("p", action.confirmation.description),
                m(
                  "footer",
                  m(
                    "button",
                    {
                      class: "secondary",
                      onclick: (event: Event) => cancelAction(dialogId, event),
                    },
                    "Cancel",
                  ),
                  m(
                    "button.confirm",
                    {
                      onclick: (event: Event) => confirmAction(action, dialogId, event),
                    },
                    "Confirm",
                  ),
                ),
              ),
            );
          })
          .filter((dialog) => dialog !== null),

        // Primary FAB button with icon transition
        m(
          "button.fab-primary",
          {
            class: state.isOpen ? "open" : "",
            disabled: disabled,
            onclick: toggleFAB,
          },
          [
            m(
              "span.fab-icon",
              {
                class: state.isOpen ? "hidden" : "",
              },
              icon,
            ),
            iconOpen &&
            m(
              "span.fab-icon",
              {
                class: state.isOpen ? "" : "hidden",
              },
              iconOpen,
            ),
          ],
        ),

        // Backdrop overlay when FAB is open
        state.isOpen &&
        m("div.fab-backdrop", {
          onclick: toggleFAB,
        }),
      ],
    );
  },
};
