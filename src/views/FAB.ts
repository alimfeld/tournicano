import m from "mithril";
import "./FAB.css";

export interface FABAttrs {
  icon: string;
  label: string;
  onclick: () => void;
  variant?: "ins";
  fullscreen?: boolean;
}

export const FAB: m.Component<FABAttrs> = {
  view: ({ attrs: { icon, label, onclick, variant, fullscreen = false } }) => {
    const classes = [
      variant || "",
      fullscreen ? "fullscreen" : ""
    ].filter(c => c).join(" ");

    return m(
      "button.fab",
      {
        class: classes,
        "aria-label": label,
        onclick: onclick,
      },
      icon,
    );
  },
};
