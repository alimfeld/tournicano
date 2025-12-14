import m from "mithril";
import "./Toast.css";

export interface ToastAttrs {
  message: string | null;
  type?: "success" | "error" | "info";
  onDismiss?: () => void;
}

export const Toast: m.Component<ToastAttrs> = {
  view: ({ attrs: { message, type = "info", onDismiss } }) => {
    if (!message) {
      return null;
    }

    const classes = type !== "info" ? `toast ${type}` : "toast";
    return m(`div.${classes}`, {
      onclick: onDismiss,
    }, message);
  },
};
