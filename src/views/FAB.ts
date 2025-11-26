import m from "mithril";
import "./FAB.css";

export interface FABAction {
  icon: string;
  label: string;
  onclick: () => void;
}

export interface FABAttrs {
  icon: string;
  iconOpen?: string;
  actions: FABAction[];
  position?: "left" | "right";
  fullscreen?: boolean;
}

interface FABState {
  isOpen: boolean;
}

export const FAB: m.Component<FABAttrs, FABState> = {
  oninit: ({ state }) => {
    state.isOpen = false;
  },

  view: ({ attrs: { icon, iconOpen, actions, position = "right", fullscreen = false }, state }) => {
    const positionClass = position === "left" ? "left" : "right";
    const fullscreenClass = fullscreen ? "fullscreen" : "";

    const toggleFAB = (event: Event) => {
      state.isOpen = !state.isOpen;
      event.preventDefault();
    };

    const handleAction = (action: FABAction, event: Event) => {
      action.onclick();
      state.isOpen = false;
      event.preventDefault();
    };

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
          actions.toReversed().map((action, index) =>
            m(
              "div.fab-action-item",
              {
                key: index,
                style: {
                  transitionDelay: `${(actions.length - 1 - index) * 50}ms`,
                },
              },
              [
                m("span.fab-action-label", action.label),
                m(
                  "button.fab-action-button",
                  {
                    onclick: (event: Event) => handleAction(action, event),
                  },
                  action.icon,
                ),
              ],
            ),
          ),
        ),

        // Primary FAB button with icon transition
        m(
          "button.fab-primary",
          {
            class: state.isOpen ? "open" : "",
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
