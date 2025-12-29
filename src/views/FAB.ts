import m from "mithril";
import "./FAB.css";

export interface FABAttrs {
  icon: string;
  onclick: () => void;
  disabled?: boolean;
  variant?: "ins";
  fullscreen?: boolean;
}

export const FAB: m.Component<FABAttrs> = {
  view: ({ attrs: { icon, onclick, disabled = false, variant, fullscreen = false } }) => {
    const classes = [
      variant || "",
      fullscreen ? "fullscreen" : ""
    ].filter(c => c).join(" ");

    return m(
      "button.fab",
      {
        class: classes,
        disabled: disabled,
        onclick: onclick,
      },
      icon,
    );
  },
};
