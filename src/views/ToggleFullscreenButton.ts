import m from "mithril";
import "./ToggleFullscreenButton.css";

export interface ToggleFullscreenButtonAttrs {
  isFullscreen: boolean;
  fullscreen?: boolean;
  onclick: () => void;
}

export const ToggleFullscreenButton: m.Component<ToggleFullscreenButtonAttrs> = {
  view: ({ attrs: { isFullscreen, fullscreen, onclick } }) => {
    return m(
      "button.toggle-fullscreen-button" + (fullscreen ? ".fullscreen" : ""),
      {
        onclick: (event: Event) => {
          event.preventDefault();
          onclick();
        },
        "aria-label": isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
        "aria-pressed": isFullscreen.toString(),
        title: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
      },
      "⛶"
    );
  },
};
