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

export const Header: m.Component<HeaderAttrs> = {
  view: ({ attrs: { title, actions } }) => {
    const hasActions = actions && actions.length > 0;

    if (!hasActions) {
      return m("header", m("h1", title));
    }

    // Action handlers
    const handleAction = (action: HeaderAction, dialogId: string, event: Event) => {
      event.preventDefault();

      // Close the dropdown
      const details = (event.target as HTMLElement).closest("details");
      if (details) details.removeAttribute("open");

      if (action.confirmation) {
        const dialog = document.getElementById(dialogId);
        if (dialog) dialog.setAttribute("open", "true");
      } else {
        action.onclick();
      }
    };

    const confirmAction = (action: HeaderAction, dialogId: string, event: Event) => {
      event.preventDefault();
      action.onclick();
      const dialog = document.getElementById(dialogId);
      if (dialog) dialog.setAttribute("open", "false");
    };

    const cancelAction = (dialogId: string, event: Event) => {
      event.preventDefault();
      const dialog = document.getElementById(dialogId);
      if (dialog) dialog.setAttribute("open", "false");
    };

    // Filter out disabled actions
    const enabledActions = actions.filter((action) => !action.disabled);

    // Generate unique IDs for dialogs
    const actionDialogIds = enabledActions.map(() => crypto.randomUUID());

    return [
      // Confirmation dialogs
      ...enabledActions
        .map((action, index) => {
          if (!action.confirmation) return null;
          const dialogId = actionDialogIds[index];
          return m(
            "dialog",
            { id: dialogId },
            m(
              "article",
              m("header",
                m("button[aria-label=Close][rel=prev]", {
                  onclick: (event: Event) => cancelAction(dialogId, event),
                }),
                m("p", m("strong", action.confirmation.title)),
              ),
              Array.isArray(action.confirmation.description)
                ? action.confirmation.description.map(text => m("p", text))
                : m("p", action.confirmation.description),
              m(
                "footer",
                m("button.secondary", {
                  onclick: (event: Event) => cancelAction(dialogId, event),
                }, "Cancel"),
                m("button", {
                  onclick: (event: Event) => confirmAction(action, dialogId, event),
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
              const dialogId = actionDialogIds[index];
              return m("li",
                m("a", {
                  href: "#",
                  onclick: (e: Event) => handleAction(action, dialogId, e),
                }, action.label)
              );
            })
          ),
        ]),
      ]),
    ];
  },
};
