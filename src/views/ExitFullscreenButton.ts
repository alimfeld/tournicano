import m from "mithril";
import "./ExitFullscreenButton.css";

export interface ExitFullscreenButtonAttrs {
  onclick: () => void;
}

export const ExitFullscreenButton: m.Component<ExitFullscreenButtonAttrs> = {
  view: ({ attrs: { onclick } }) => {
    return m(
      "button.exit-fullscreen-button",
      {
        onclick: (event: Event) => {
          event.preventDefault();
          onclick();
        },
        "aria-label": "Exit Fullscreen",
        title: "Exit Fullscreen",
      },
      "⛶"
    );
  },
};
