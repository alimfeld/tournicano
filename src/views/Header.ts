import m from "mithril";
import "./Header.css";

export interface HeaderAction {
  icon: string;
  label: string;
  onclick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  confirmation?: {
    title: string;
    description: string | string[];
    confirmButtonText?: string;
  };
}

export interface HeaderAttrs {
  title: string | m.Children;
  actions?: HeaderAction[];
}

interface HeaderState {
  openConfirmationActionId: string | null;
}

export const Header: m.Component<HeaderAttrs, HeaderState> = {
  oninit: ({ state }) => {
    state.openConfirmationActionId = null;
  },

  view: ({ attrs: { title, actions }, state }) => {
    const hasActions = actions && actions.length > 0;

    // Helper to create stable action ID
    const getActionId = (action: HeaderAction) => `${action.icon}:${action.label}`;

    // Action handlers
    const handleAction = (action: HeaderAction) => {
      if (action.confirmation) {
        state.openConfirmationActionId = getActionId(action);
      } else {
        action.onclick();
      }
    };

    const confirmAction = (action: HeaderAction) => {
      action.onclick();
      state.openConfirmationActionId = null;
    };

    const cancelAction = () => {
      state.openConfirmationActionId = null;
    };

    return [
      // Confirmation dialogs (conditionally rendered)
      ...(hasActions ? actions : [])
        .map((action) => {
          if (!action.confirmation) return null;

          const isOpen = state.openConfirmationActionId === getActionId(action);

          // Only render if this confirmation is open
          if (!isOpen) return null;

          return m(
            "dialog",
            {
              oncreate: (vnode) => {
                (vnode.dom as HTMLDialogElement).showModal();
                document.documentElement.classList.add('modal-is-open');
              },
              onremove: () => {
                document.documentElement.classList.remove('modal-is-open');
              },
              onclick: (e: MouseEvent) => {
                if (e.target === e.currentTarget) {
                  cancelAction();
                }
              }
            },
            m(
              "article",
              m("header",
                m("button[aria-label=Close][rel=prev]", {
                  onclick: cancelAction,
                }),
                m("p", m("strong", action.confirmation.title)),
              ),
              Array.isArray(action.confirmation.description)
                ? action.confirmation.description.map(text => m("p", text))
                : m("p", action.confirmation.description),
              m(
                "footer",
                m("button", {
                  onclick: () => confirmAction(action),
                }, action.confirmation.confirmButtonText || "Confirm"),
              ),
            ),
          );
        })
        .filter((dialog) => dialog !== null),

      // Header with icon actions
      m("header.container-fluid", [
        m("h1", title),
        hasActions
          ? m("div.actions",
            actions.map((action) => {
              return m("button.secondary", {
                class: action.pressed ? "pressed" : "outline",
                "aria-label": action.label,
                "aria-pressed": action.pressed !== undefined ? String(action.pressed) : undefined,
                title: action.label,
                onclick: () => handleAction(action),
                disabled: action.disabled,
              }, action.icon);
            })
          )
          : null,
      ]),
    ];
  },
};
