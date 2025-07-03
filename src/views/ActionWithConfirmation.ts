import m from "mithril";

export interface ActionWithConfirmationAttrs {
  action: string;
  disabled: boolean;
  title: string;
  description: string;
  onconfirm: () => void;
}

export const ActionWithConfirmation: m.Component<ActionWithConfirmationAttrs> =
  {
    view: ({ attrs: { action, disabled, title, description, onconfirm } }) => {
      const ID = crypto.randomUUID();
      return [
        m(
          "button.action-with-confirmation",
          {
            disabled: disabled,
            onclick: (event: InputEvent) => {
              document.getElementById(ID)!.setAttribute("open", "true");
              event.preventDefault();
            },
          },
          action,
        ),
        m(
          "dialog",
          { id: ID },
          m(
            "article",
            m("h3", title),
            m("p", description),
            m(
              "footer",
              m(
                "button",
                {
                  class: "secondary",
                  onclick: (event: InputEvent) => {
                    document.getElementById(ID)!.setAttribute("open", "false");
                    event.preventDefault();
                  },
                },
                "Cancel",
              ),
              m(
                "button.confirm",
                {
                  onclick: (event: InputEvent) => {
                    onconfirm();
                    document.getElementById(ID)!.setAttribute("open", "false");
                    event.preventDefault();
                  },
                },
                "Confirm",
              ),
            ),
          ),
        ),
      ];
    },
  };
