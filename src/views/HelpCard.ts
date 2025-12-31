import m from "mithril";
import "./HelpCard.css";

export interface HelpCardAttrs {
  title: string | m.Children;
  message: string | m.Children;
  action?: {
    label: string;
    onclick: () => void;
  };
}

export const HelpCard: m.Component<HelpCardAttrs> = {
  view: ({ attrs: { title: message, message: hint, action } }) => {
    return m("article.help-card", [
      m("header", m("strong", message)),
      m("div", hint),
      action ? m("footer",
        m("button", { onclick: action.onclick }, action.label)
      ) : null
    ]);
  }
};
