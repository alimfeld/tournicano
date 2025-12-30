import m from "mithril";
import "./Header.css";

export interface HeaderAction {
  label: string | m.Children;
  onclick: () => void;
  disabled?: boolean;
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
  openConfirmationIndex: number | null;
}

export const Header: m.Component<HeaderAttrs, HeaderState> = {
  oninit: ({ state }) => {
    state.openConfirmationIndex = null;
  },

  view: ({ attrs: { title, actions }, state }) => {
    const hasActions = actions && actions.length > 0;

    if (!hasActions) {
      return m("header", m("h1", title));
    }

    // Action handlers
    const handleAction = (action: HeaderAction, index: number, event: Event) => {
      event.preventDefault();

      // Close the dropdown
      const details = (event.target as HTMLElement).closest("details");
      if (details) details.removeAttribute("open");

      if (action.confirmation) {
        state.openConfirmationIndex = index;
      } else {
        action.onclick();
      }
    };

    const confirmAction = (action: HeaderAction, event: Event) => {
      event.preventDefault();
      action.onclick();
      state.openConfirmationIndex = null;
    };

    const cancelAction = (event: Event) => {
      event.preventDefault();
      state.openConfirmationIndex = null;
    };

    // Filter out disabled actions
    const enabledActions = actions.filter((action) => !action.disabled);

    return [
      // Confirmation dialogs (conditionally rendered)
      ...enabledActions
        .map((action, index) => {
          if (!action.confirmation) return null;

          const isOpen = state.openConfirmationIndex === index;

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
                  cancelAction(e);
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
                m("button.secondary", {
                  onclick: cancelAction,
                }, "Cancel"),
                m("button", {
                  onclick: (event: Event) => confirmAction(action, event),
                }, action.confirmation.confirmButtonText || "Confirm"),
              ),
            ),
          );
        })
        .filter((dialog) => dialog !== null),

      // Header with dropdown menu
      m("header", [
        m("h1", title),
        m("details.dropdown", [
          m("summary.secondary.outline", { role: "button" }, "☰"),
          m("ul",
            enabledActions.map((action, index) => {
              return m("li",
                m("a", {
                  href: "#",
                  onclick: (e: Event) => handleAction(action, index, e),
                }, action.label)
              );
            })
          ),
        ]),
      ]),
    ];
  },
};
